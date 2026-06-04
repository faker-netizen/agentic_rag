import type {ResultSetHeader} from "mysql2";
import pool from "../config/database.js";
import ragService from "./ragService.js";
import {isStreamAborted} from "../utils/streamAbort.js";
import type {ChatSessionRow} from "./chatService.js";
import type {ChatSource} from "./chatService.js";

export type {ChatSource};
import {runDomainSkill} from "../domainSkill/domainSkillExecutor.js";
import {resolveEffectiveSkillId} from "../domainSkill/resolveEffectiveSkillId.js";
import {getSkillById, assertKnownSkillId} from "../domainSkill/skillRegistry.js";
import {DomainSkillError} from "../domainSkill/types.js";
import {
    CHAT_HISTORY_LIMIT,
    MAX_CHAT_TITLE_LENGTH,
    SESSION_TITLE_PREVIEW_LENGTH,
} from "./serviceConstants.js";

export type ChatHistoryTurn = {role: "user" | "assistant"; content: string};
export type SseEmitter = (event: string, data: Record<string, unknown>) => void;

const DEFAULT_TITLE = "新会话";

export async function loadChatHistory(sessionId: number): Promise<ChatHistoryTurn[]> {
    const [rows] = await pool.query(
        `SELECT role, content FROM chat_messages
         WHERE session_id = ?
         ORDER BY id DESC
         LIMIT ?`,
        [sessionId, CHAT_HISTORY_LIMIT]
    );
    const histDesc = rows as Array<{role: string; content: string}>;
    return [...histDesc]
        .reverse()
        .filter((h) => h.role === "user" || h.role === "assistant")
        .map((h) => ({role: h.role as "user" | "assistant", content: h.content}));
}

export async function insertUserMessage(
    sessionId: number,
    text: string,
    skillId: string | null = null
): Promise<number> {
    const [row] = await pool.query<ResultSetHeader>(
        "INSERT INTO chat_messages (session_id, role, content, skill_id) VALUES (?, 'user', ?, ?)",
        [sessionId, text, skillId]
    );
    return row.insertId;
}

export type AssistantReply = {
    answer: string;
    sources: ChatSource[] | null;
    aborted?: boolean;
};

export function formatAbortedAnswer(partial: string): string {
    return partial.trim() ? `${partial.trimEnd()}\n\n[已中断]` : "[已中断]";
}

export type StreamPlainParams = {
    text: string;
    history: ChatHistoryTurn[];
    sse: SseEmitter;
    signal?: AbortSignal;
};

async function streamPlainReply(params: StreamPlainParams): Promise<AssistantReply> {
    const {text, history, sse, signal} = params;
    sse("sources", {sources: null});
    let answer = "";

    try {
        for await (const delta of ragService.streamChatPlain(text, history, signal)) {
            answer += delta;
            sse("token", {text: delta});
        }
        return {answer, sources: null};
    } catch (e) {
        if (isStreamAborted(e, signal)) {
            return {answer: formatAbortedAnswer(answer), sources: null, aborted: true};
        }
        throw e;
    }
}

export type StreamAssistantParams = {
    userId: number;
    session: ChatSessionRow;
    text: string;
    history: ChatHistoryTurn[];
    sse: SseEmitter;
    signal?: AbortSignal;
    requestSkillId?: string | null;
};

async function streamDomainSkillReply(params: StreamAssistantParams, skillId: string): Promise<AssistantReply> {
    const known = assertKnownSkillId(skillId);
    const kbId = params.session.knowledge_base_id;
    if (kbId == null) {
        throw new DomainSkillError("请先绑定或选择知识库", "KB_REQUIRED");
    }
    try {
        return await runDomainSkill({
            skillId: known,
            userId: params.userId,
            knowledgeBaseId: kbId,
            query: params.text,
            history: params.history,
            sse: params.sse,
            signal: params.signal,
        });
    } catch (e) {
        if (isStreamAborted(e, params.signal)) {
            return {answer: "[已中断]", sources: null, aborted: true};
        }
        if (e instanceof DomainSkillError) {
            params.sse("error", {message: e.message, code: e.code});
            return {answer: e.message, sources: null};
        }
        throw e;
    }
}

export async function streamAssistantReply(params: StreamAssistantParams): Promise<AssistantReply> {
    const {session, text, history, sse, signal, requestSkillId} = params;
    try {
        const effective = resolveEffectiveSkillId(requestSkillId, session.knowledge_base_id);
        if (effective) {
            const def = getSkillById(effective);
            if (!def) throw new DomainSkillError(`未知的 Skill: ${effective}`, "SKILL_NOT_FOUND");
            return await streamDomainSkillReply(params, effective);
        }
        return await streamPlainReply({text, history, sse, signal});
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        sse("sources", {sources: null});
        sse("error", {message: `生成失败：${message}`});
        return {answer: `生成失败：${message}`, sources: null};
    }
}

/** 解析落库用的 skill_id（含隐式 kb-rag） */
export function resolveStoredSkillId(
    requestSkillId: string | null | undefined,
    knowledgeBaseId: number | null
): string | null {
    return resolveEffectiveSkillId(requestSkillId, knowledgeBaseId);
}

export async function insertAssistantMessage(
    sessionId: number,
    answer: string,
    sources: ChatSource[] | null
): Promise<number> {
    const [row] = await pool.query<ResultSetHeader>(
        "INSERT INTO chat_messages (session_id, role, content, sources_json) VALUES (?, 'assistant', ?, ?)",
        [sessionId, answer, sources ? JSON.stringify(sources) : null]
    );
    return row.insertId;
}

export async function maybeRefreshSessionTitle(
    userId: number,
    session: ChatSessionRow,
    firstUserText: string
): Promise<void> {
    const newTitle =
        session.title === DEFAULT_TITLE || !session.title.trim()
            ? firstUserText.slice(0, SESSION_TITLE_PREVIEW_LENGTH)
            : session.title;

    await pool.query(
        `UPDATE chat_sessions
         SET title = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [newTitle.slice(0, MAX_CHAT_TITLE_LENGTH), session.id, userId]
    );
}
