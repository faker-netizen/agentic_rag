import express from "express";
import documentService from "../services/documentService.js";
import ragService from "../services/ragService.js";
import knowledgeBaseService from "../services/knowledgeBaseService.js";
import {bindRequestAbort, createSseWriter, setupSseResponse} from "../utils/sse.js";

const router = express.Router();

function parseId(raw: unknown): number | null {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
}

type RagSource = {id: number; title: string};

async function resolveSources(
    chunks: Array<{metadata: {documentId: number}}>,
    userId: number,
    knowledgeBaseId: number
): Promise<RagSource[]> {
    const sourceIds = [...new Set(chunks.map((c) => c.metadata.documentId))];
    const sources: RagSource[] = [];
    for (const id of sourceIds) {
        const doc = await documentService.getDocumentScoped(id, userId, knowledgeBaseId);
        if (doc?.id != null) sources.push({id: doc.id, title: doc.title});
    }
    return sources;
}

/** POST /api/rag/query  { query, knowledgeBaseId } — SSE：sources|token|error|done */
router.post("/query", async (req, res) => {
    try {
        const userId = req.user?.id;
        if (userId == null || !Number.isFinite(userId)) {
            return res.status(401).json({error: "未登录"});
        }

        const {query, knowledgeBaseId: kbRaw} = req.body ?? {};
        if (!query || typeof query !== "string") {
            return res.status(400).json({error: "查询内容不能为空"});
        }

        const knowledgeBaseId = parseId(kbRaw);
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
        let sources: RagSource[] = [];

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
                            ? await resolveSources(part.chunks, userId, knowledgeBaseId)
                            : [];
                    sse("sources", {sources});
                } else if (part.type === "token") {
                    answer += part.text;
                    sse("token", {text: part.text});
                }
            }
        } catch (e) {
            const aborted =
                signal.aborted ||
                (e instanceof Error &&
                    (e.name === "AbortError" || (e as NodeJS.ErrnoException).code === "ABORT_ERR"));
            if (aborted) {
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
