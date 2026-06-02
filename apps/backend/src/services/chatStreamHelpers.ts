import type {ResultSetHeader} from "mysql2";
import pool from "../config/database.js";
import ragService from "./ragService.js";
import {resolveSourcesFromChunks} from "../utils/ragSources.js";
import {isStreamAborted} from "../utils/streamAbort.js";
import type {ChatSessionRow, ChatSource} from "./chatService.js";
import {
    CHAT_HISTORY_LIMIT,
    MAX_CHAT_TITLE_LENGTH,
    RAG_TOP_K,
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

export type StreamRagParams = {
    userId: number;
    kbId: number;
    text: string;
    history: ChatHistoryTurn[];
    sse: SseEmitter;
    signal?: AbortSignal;
};

async function streamRagReply(params: StreamRagParams): Promise<AssistantReply> {
    const {userId, kbId, text, history, sse, signal} = params;
    let answer = "";
    let sources: ChatSource[] | null = null;

    try {
        for await (const part of ragService.answerWithRAGStream(text, {
            userId,
            knowledgeBaseId: kbId,
            k: RAG_TOP_K,
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
};

export async function streamAssistantReply(params: StreamAssistantParams): Promise<AssistantReply> {
    const {userId, session, text, history, sse, signal} = params;
    try {
        if (session.knowledge_base_id != null) {
            return await streamRagReply({
                userId,
                kbId: session.knowledge_base_id,
                text,
                history,
                sse,
                signal,
            });
        }
        return await streamPlainReply({text, history, sse, signal});
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
            ? firstUserText.slice(0, SESSION_TITLE_PREVIEW_LENGTH)
            : session.title;

    await pool.query(
        `UPDATE chat_sessions
         SET title = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [newTitle.slice(0, MAX_CHAT_TITLE_LENGTH), session.id, userId]
    );
}
