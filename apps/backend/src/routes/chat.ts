import express from "express";
import chatService from "../services/chatService.js";
import {bindRequestAbort, createSseWriter, setupSseResponse} from "../utils/sse.js";

const router = express.Router();

function requireUserId(req: express.Request, res: express.Response): number | null {
    const uid = req.user?.id;
    if (uid == null || !Number.isFinite(uid)) {
        res.status(401).json({error: "未登录"});
        return null;
    }
    return uid;
}

function parseId(raw: string | string[] | undefined): number | null {
    const s = Array.isArray(raw) ? raw[0] : raw;
    if (s == null || typeof s !== "string") return null;
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : null;
}

/** POST /api/chat/sessions  { knowledgeBaseId?, title? } */
router.post("/sessions", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const kbRaw = req.body?.knowledgeBaseId;
        const knowledgeBaseId =
            kbRaw === null || kbRaw === undefined || kbRaw === ""
                ? undefined
                : Number(kbRaw);
        if (knowledgeBaseId !== undefined && !Number.isFinite(knowledgeBaseId)) {
            return res.status(400).json({error: "knowledgeBaseId 无效"});
        }
        const title = req.body?.title;
        const id = await chatService.createSession(userId, {
            knowledgeBaseId: knowledgeBaseId as number | undefined,
            title: typeof title === "string" ? title : undefined,
        });
        res.status(201).json({success: true, sessionId: id});
    } catch (e) {
        const msg = e instanceof Error ? e.message : "创建会话失败";
        if (msg.includes("知识库不存在")) {
            return res.status(404).json({error: msg});
        }
        console.error("create chat session failed:", e);
        res.status(500).json({error: "创建会话失败"});
    }
});

/** GET /api/chat/sessions */
router.get("/sessions", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const sessions = await chatService.listSessions(userId);
        res.json({success: true, sessions});
    } catch (e) {
        console.error("list chat sessions failed:", e);
        res.status(500).json({error: "获取会话列表失败"});
    }
});

/** GET /api/chat/sessions/:sessionId */
router.get("/sessions/:sessionId", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const sessionId = parseId(req.params.sessionId);
        if (sessionId == null) return res.status(400).json({error: "无效的会话 id"});
        const session = await chatService.getSession(userId, sessionId);
        if (!session) return res.status(404).json({error: "会话不存在"});
        res.json({success: true, session});
    } catch (e) {
        console.error("get chat session failed:", e);
        res.status(500).json({error: "获取会话失败"});
    }
});

/** PATCH /api/chat/sessions/:sessionId  { title } */
router.patch("/sessions/:sessionId", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const sessionId = parseId(req.params.sessionId);
        if (sessionId == null) return res.status(400).json({error: "无效的会话 id"});
        const title = req.body?.title;
        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({error: "title 不能为空"});
        }
        const ok = await chatService.updateSessionTitle(userId, sessionId, title);
        if (!ok) return res.status(404).json({error: "会话不存在"});
        res.json({success: true});
    } catch (e) {
        console.error("patch chat session failed:", e);
        res.status(500).json({error: "更新会话失败"});
    }
});

/** DELETE /api/chat/sessions/:sessionId */
router.delete("/sessions/:sessionId", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const sessionId = parseId(req.params.sessionId);
        if (sessionId == null) return res.status(400).json({error: "无效的会话 id"});
        const ok = await chatService.deleteSession(userId, sessionId);
        if (!ok) return res.status(404).json({error: "会话不存在"});
        res.json({success: true});
    } catch (e) {
        console.error("delete chat session failed:", e);
        res.status(500).json({error: "删除会话失败"});
    }
});

/** GET /api/chat/sessions/:sessionId/messages */
router.get("/sessions/:sessionId/messages", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const sessionId = parseId(req.params.sessionId);
        if (sessionId == null) return res.status(400).json({error: "无效的会话 id"});
        const session = await chatService.getSession(userId, sessionId);
        if (!session) return res.status(404).json({error: "会话不存在"});
        const messages = await chatService.listMessages(userId, sessionId);
        res.json({success: true, messages});
    } catch (e) {
        console.error("list chat messages failed:", e);
        res.status(500).json({error: "获取消息失败"});
    }
});

/** POST /api/chat/sessions/:sessionId/messages  { content } — SSE：meta|sources|token|aborted|error|done */
router.post("/sessions/:sessionId/messages", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const sessionId = parseId(req.params.sessionId);
        if (sessionId == null) return res.status(400).json({error: "无效的会话 id"});
        const content = req.body?.content;
        if (typeof content !== "string" || !content.trim()) {
            return res.status(400).json({error: "content 不能为空"});
        }
        const session = await chatService.getSession(userId, sessionId);
        if (!session) return res.status(404).json({error: "会话不存在"});

        setupSseResponse(res);
        const {signal, cleanup} = bindRequestAbort(req);
        const sse = createSseWriter(res);

        try {
            await chatService.appendMessage(userId, session, content, sse, signal);
        } catch (e) {
            const message = e instanceof Error ? e.message : "发送失败";
            sse("error", {message});
        } finally {
            cleanup();
        }
        res.end();
    } catch (e) {
        const msg = e instanceof Error ? e.message : "发送失败";
        if (msg.includes("消息内容不能为空")) {
            return res.status(400).json({error: msg});
        }
        console.error("append chat message failed:", e);
        if (!res.headersSent) {
            res.status(500).json({error: "发送消息失败"});
        } else {
            res.end();
        }
    }
});

export default router;
