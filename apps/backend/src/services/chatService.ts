import type {ResultSetHeader} from "mysql2";
import pool from "../config/database.js";
import knowledgeBaseService from "./knowledgeBaseService.js";
import {
    insertAssistantMessage,
    insertUserMessage,
    loadChatHistory,
    maybeRefreshSessionTitle,
    resolveStoredSkillId,
    streamAssistantReply,
} from "./chatStreamHelpers.js";
import {MAX_CHAT_TITLE_LENGTH} from "./serviceConstants.js";

export type ChatSessionRow = {
    id: number;
    user_id: number;
    knowledge_base_id: number | null;
    title: string;
    created_at: Date;
    updated_at: Date;
};

export type ChatMessageRow = {
    id: number;
    session_id: number;
    role: string;
    content: string;
    sources_json: unknown | null;
    skill_id: string | null;
    created_at: Date;
};

export type ChatSource = {id: number; title: string};

const DEFAULT_TITLE = "新会话";

class ChatService {
    async createSession(
        userId: number,
        params: {knowledgeBaseId?: number | null; title?: string}
    ): Promise<number> {
        let kbId: number | null = null;
        if (params.knowledgeBaseId != null && params.knowledgeBaseId !== undefined) {
            const kb = await knowledgeBaseService.getOwned(userId, params.knowledgeBaseId);
            if (!kb) throw new Error("知识库不存在");
            kbId = kb.id;
        }
        const title =
            typeof params.title === "string" && params.title.trim()
                ? params.title.trim().slice(0, MAX_CHAT_TITLE_LENGTH)
                : DEFAULT_TITLE;
        const [r] = await pool.query<ResultSetHeader>(
            "INSERT INTO chat_sessions (user_id, knowledge_base_id, title) VALUES (?, ?, ?)",
            [userId, kbId, title]
        );
        return r.insertId;
    }

    async listSessions(userId: number): Promise<ChatSessionRow[]> {
        const [rows] = await pool.query(
            `SELECT id, user_id, knowledge_base_id, title, created_at, updated_at
             FROM chat_sessions
             WHERE user_id = ?
             ORDER BY updated_at DESC`,
            [userId]
        );
        return rows as ChatSessionRow[];
    }

    async getSession(userId: number, sessionId: number): Promise<ChatSessionRow | null> {
        const [rows] = await pool.query(
            `SELECT id, user_id, knowledge_base_id, title, created_at, updated_at
             FROM chat_sessions
             WHERE id = ? AND user_id = ?
             LIMIT 1`,
            [sessionId, userId]
        );
        const list = rows as ChatSessionRow[];
        return list[0] ?? null;
    }

    async updateSessionTitle(userId: number, sessionId: number, title: string): Promise<boolean> {
        const t = title.trim().slice(0, MAX_CHAT_TITLE_LENGTH);
        if (!t) return false;
        const [r] = await pool.query<ResultSetHeader>(
            `UPDATE chat_sessions
             SET title = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`,
            [t, sessionId, userId]
        );
        return r.affectedRows > 0;
    }

    async deleteSession(userId: number, sessionId: number): Promise<boolean> {
        const [r] = await pool.query<ResultSetHeader>(
            "DELETE FROM chat_sessions WHERE id = ? AND user_id = ?",
            [sessionId, userId]
        );
        return r.affectedRows > 0;
    }

    async listMessages(userId: number, sessionId: number): Promise<ChatMessageRow[]> {
        const session = await this.getSession(userId, sessionId);
        if (!session) return [];
        const [rows] = await pool.query(
            `SELECT m.id, m.session_id, m.role, m.content, m.sources_json, m.skill_id, m.created_at
             FROM chat_messages m
             INNER JOIN chat_sessions s ON s.id = m.session_id
             WHERE m.session_id = ? AND s.user_id = ?
             ORDER BY m.id ASC`,
            [sessionId, userId]
        );
        return rows as ChatMessageRow[];
    }

    /**
     * SSE 发送：先落库用户消息，推送 token；结束时落库助手消息。
     * 事件：meta → sources（可选）→ token（多次）→ done；失败时 error（仍落库失败文案）。
     */
    async appendMessage(params: {
        userId: number;
        session: ChatSessionRow;
        content: string;
        sse: (event: string, data: Record<string, unknown>) => void;
        signal?: AbortSignal;
        requestSkillId?: string | null;
    }): Promise<void> {
        const {userId, session, content, sse, signal, requestSkillId} = params;
        const text = content.trim();
        if (!text) throw new Error("消息内容不能为空");

        const history = await loadChatHistory(session.id);
        const storedSkillId = resolveStoredSkillId(requestSkillId, session.knowledge_base_id);
        const userMessageId = await insertUserMessage(session.id, text, storedSkillId);
        sse("meta", {userMessageId});

        const {answer, sources, aborted} = await streamAssistantReply({
            userId,
            session,
            text,
            history,
            sse,
            signal,
            requestSkillId: requestSkillId ?? null,
        });

        if (aborted) {
            sse("aborted", {stopped: true});
        }

        const assistantMessageId = await insertAssistantMessage(session.id, answer, sources);
        await maybeRefreshSessionTitle(userId, session, text);

        sse("done", {userMessageId, assistantMessageId, answer, sources});
    }
}

export default new ChatService();
