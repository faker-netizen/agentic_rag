import express from "express";
import ragService from "../services/ragService.js";
import knowledgeBaseService from "../services/knowledgeBaseService.js";
import {resolveSourcesFromChunks} from "../utils/ragSources.js";
import {getUserId, parsePositiveInt} from "../utils/routeHelpers.js";
import {isStreamAborted} from "../utils/streamAbort.js";
import {bindRequestAbort, createSseWriter, setupSseResponse} from "../utils/sse.js";

const router = express.Router();

/** POST /api/rag/query  { query, knowledgeBaseId } — SSE：sources|token|error|done */
router.post("/query", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (userId == null) {
            return res.status(401).json({error: "未登录"});
        }

        const {query, knowledgeBaseId: kbRaw} = req.body ?? {};
        if (!query || typeof query !== "string") {
            return res.status(400).json({error: "查询内容不能为空"});
        }

        const knowledgeBaseId = parsePositiveInt(kbRaw);
        if (knowledgeBaseId == null) {
            return res.status(400).json({error: "knowledgeBaseId 无效"});
        }

        const kb = await knowledgeBaseService.getOwned(userId, knowledgeBaseId);
        if (!kb) {
            return res.status(404).json({error: "知识库不存在"});
        }

        setupSseResponse(res);
        const {signal, cleanup} = bindRequestAbort(req);
        const sse = createSseWriter(res);

        let answer = "";
        let sources: Awaited<ReturnType<typeof resolveSourcesFromChunks>> = [];

        try {
            for await (const part of ragService.answerWithRAGStream(query.trim(), {
                userId,
                knowledgeBaseId,
                k: 3,
                signal,
            })) {
                if (part.type === "context") {
                    sources =
                        part.chunks.length > 0
                            ? await resolveSourcesFromChunks(part.chunks, userId, knowledgeBaseId)
                            : [];
                    sse("sources", {sources});
                } else if (part.type === "token") {
                    answer += part.text;
                    sse("token", {text: part.text});
                }
            }
        } catch (e) {
            if (isStreamAborted(e, signal)) {
                sse("aborted", {stopped: true});
            } else {
                const message = e instanceof Error ? e.message : "查询失败";
                answer = `生成失败：${message}`;
                sse("error", {message: answer});
            }
        } finally {
            cleanup();
        }

        sse("done", {answer, sources});
        res.end();
    } catch (error) {
        console.error("RAG查询失败:", error);
        if (!res.headersSent) {
            res.status(500).json({error: "查询失败"});
        } else {
            res.end();
        }
    }
});

export default router;
