import type {ResultSetHeader} from "mysql2";
import pool from "../config/database.js";
import ragService from "./ragService.js";
import {resolveSourcesFromChunks} from "../utils/ragSources.js";
import {isStreamAborted} from "../utils/streamAbort.js";
import type {ChatSessionRow, ChatSource} from "./chatService.js";

export type ChatHistoryTurn = {role: "user" | "assistant"; content: string};
export type SseEmitter = (event: string, data: Record<string, unknown>) => void;

const MAX_HISTORY = 30;
const DEFAULT_TITLE = "新会话";

export async function loadChatHistory(sessionId: number): Promise<ChatHistoryTurn[]> {
    const [rows] = await pool.query(
        `SELECT role, content FROM chat_messages
         WHERE session_id = ?
         ORDER BY id DESC
         LIMIT ?`,
        [sessionId, MAX_HISTORY]
    );
    const histDesc = rows as Array<{role: string; content: string}>;
    return [...histDesc]
        .reverse()
        .filter((h) => h.role === "user" || h.role === "assistant")
        .map((h) => ({role: h.role as "user" | "assistant", content: h.content}));
}

export async function insertUserMessage(sessionId: number, text: string): Promise<number> {
    const [row] = await pool.query<ResultSetHeader>(
        "INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'user', ?)",
        [sessionId, text]
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

async function streamRagReply(
    userId: number,
    kbId: number,
    text: string,
    history: ChatHistoryTurn[],
    sse: SseEmitter,
    signal?: AbortSignal
): Promise<AssistantReply> {
    let answer = "";
    let sources: ChatSource[] | null = null;

    try {
        for await (const part of ragService.answerWithRAGStream(text, {
            userId,
            knowledgeBaseId: kbId,
            k: 5,
            history,
            signal,
        })) {
            if (part.type === "context") {
                sources =
                    part.chunks.length > 0
                        ? await resolveSourcesFromChunks(part.chunks, userId, kbId)
                        : null;
                if (sources && !sources.length) sources = null;
                sse("sources", {sources});
            } else if (part.type === "token") {
                answer += part.text;
                sse("token", {text: part.text});
            }
        }
        return {answer, sources};
    } catch (e) {
        if (isStreamAborted(e, signal)) {
            return {answer: formatAbortedAnswer(answer), sources, aborted: true};
        }
        throw e;
    }
}

async function streamPlainReply(
    text: string,
    history: ChatHistoryTurn[],
    sse: SseEmitter,
    signal?: AbortSignal
): Promise<AssistantReply> {
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

export async function streamAssistantReply(
    userId: number,
    session: ChatSessionRow,
    text: string,
    history: ChatHistoryTurn[],
    sse: SseEmitter,
    signal?: AbortSignal
): Promise<AssistantReply> {
    try {
        if (session.knowledge_base_id != null) {
            return await streamRagReply(userId, session.knowledge_base_id, text, history, sse, signal);
        }
        return await streamPlainReply(text, history, sse, signal);
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        sse("sources", {sources: null});
        sse("error", {message: `生成失败：${message}`});
        return {answer: `生成失败：${message}`, sources: null};
    }
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
            ? firstUserText.slice(0, 80)
            : session.title;

    await pool.query(
        `UPDATE chat_sessions
         SET title = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [newTitle.slice(0, 255), session.id, userId]
    );
}
