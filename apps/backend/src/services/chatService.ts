import type {ResultSetHeader} from "mysql2";
import pool from "../config/database.js";
import ragService from "./ragService.js";
import knowledgeBaseService from "./knowledgeBaseService.js";
import documentService from "./documentService.js";

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
    created_at: Date;
};

export type ChatSource = {id: number; title: string};

const DEFAULT_TITLE = "新会话";
const MAX_HISTORY = 30;

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
                ? params.title.trim().slice(0, 255)
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
        const t = title.trim().slice(0, 255);
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
            `SELECT m.id, m.session_id, m.role, m.content, m.sources_json, m.created_at
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
     * 调用方须先校验会话存在，并传入 `session`（避免已写 SSE 头后再 404）。
     */
    async appendMessage(
        userId: number,
        session: ChatSessionRow,
        content: string,
        sse: (event: string, data: Record<string, unknown>) => void,
        signal?: AbortSignal
    ): Promise<void> {
        const sessionId = session.id;
        const text = content.trim();
        if (!text) throw new Error("消息内容不能为空");

        const [histRows] = await pool.query(
            `SELECT role, content FROM chat_messages
             WHERE session_id = ?
             ORDER BY id DESC
             LIMIT ?`,
            [sessionId, MAX_HISTORY]
        );
        const histDesc = histRows as Array<{role: string; content: string}>;
        const historyAsc = [...histDesc]
            .reverse()
            .filter((h) => h.role === "user" || h.role === "assistant")
            .map((h) => ({role: h.role as "user" | "assistant", content: h.content}));

        const [um] = await pool.query<ResultSetHeader>(
            "INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'user', ?)",
            [sessionId, text]
        );
        const userMessageId = um.insertId;
        sse("meta", {userMessageId});

        let answer = "";
        let sources: ChatSource[] | null = null;

        try {
            if (session.knowledge_base_id != null) {
                const kbId = session.knowledge_base_id;
                for await (const part of ragService.answerWithRAGStream(text, {
                    userId,
                    knowledgeBaseId: kbId,
                    k: 5,
                    history: historyAsc,
                    signal,
                })) {
                    if (part.type === "context") {
                        if (!part.chunks.length) {
                            sources = null;
                        } else {
                            const sourceIds = [...new Set(part.chunks.map((c) => c.metadata.documentId))];
                            const src: ChatSource[] = [];
                            for (const docId of sourceIds) {
                                const doc = await documentService.getDocumentScoped(docId, userId, kbId);
                                if (doc?.id != null) src.push({id: doc.id, title: doc.title});
                            }
                            sources = src.length ? src : null;
                        }
                        sse("sources", {sources});
                    } else if (part.type === "token") {
                        answer += part.text;
                        sse("token", {text: part.text});
                    }
                }
            } else {
                sse("sources", {sources: null});
                for await (const delta of ragService.streamChatPlain(text, historyAsc, signal)) {
                    answer += delta;
                    sse("token", {text: delta});
                }
            }
        } catch (e) {
            const aborted =
                signal?.aborted === true ||
                (e instanceof Error &&
                    (e.name === "AbortError" || (e as NodeJS.ErrnoException).code === "ABORT_ERR"));
            if (aborted) {
                answer = answer.trim() ? `${answer.trimEnd()}\n\n[已中断]` : "[已中断]";
                sse("aborted", {stopped: true});
            } else {
                sources = null;
                answer = `生成失败：${e instanceof Error ? e.message : String(e)}`;
                sse("sources", {sources: null});
                sse("error", {message: answer});
            }
        }

        const [am] = await pool.query<ResultSetHeader>(
            "INSERT INTO chat_messages (session_id, role, content, sources_json) VALUES (?, 'assistant', ?, ?)",
            [sessionId, answer, sources ? JSON.stringify(sources) : null]
        );

        const newTitle =
            session.title === DEFAULT_TITLE || !session.title.trim()
                ? text.slice(0, 80)
                : session.title;

        await pool.query(
            `UPDATE chat_sessions
             SET title = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`,
            [newTitle.slice(0, 255), sessionId, userId]
        );

        sse("done", {
            userMessageId,
            assistantMessageId: am.insertId,
            answer,
            sources,
        });
    }
}

export default new ChatService();
