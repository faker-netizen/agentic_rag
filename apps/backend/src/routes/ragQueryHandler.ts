import type express from "express";
import ragService, {type RagStreamPart} from "../services/ragService.js";
import knowledgeBaseService from "../services/knowledgeBaseService.js";
import {resolveSourcesFromChunks} from "../utils/ragSources.js";
import {getUserId, parsePositiveInt} from "../utils/routeHelpers.js";
import {isStreamAborted} from "../utils/streamAbort.js";
import {bindRequestAbort, createSseWriter, setupSseResponse} from "../utils/sse.js";

type RagQueryInput = {
    userId: number;
    query: string;
    knowledgeBaseId: number;
};

async function parseRagQueryInput(
    req: express.Request,
    res: express.Response
): Promise<RagQueryInput | null> {
    const userId = getUserId(req);
    if (userId == null) {
        res.status(401).json({error: "未登录"});
        return null;
    }

    const {query, knowledgeBaseId: kbRaw} = req.body ?? {};
    if (!query || typeof query !== "string") {
        res.status(400).json({error: "查询内容不能为空"});
        return null;
    }

    const knowledgeBaseId = parsePositiveInt(kbRaw);
    if (knowledgeBaseId == null) {
        res.status(400).json({error: "knowledgeBaseId 无效"});
        return null;
    }

    const kb = await knowledgeBaseService.getOwned(userId, knowledgeBaseId);
    if (!kb) {
        res.status(404).json({error: "知识库不存在"});
        return null;
    }

    return {userId, query: query.trim(), knowledgeBaseId};
}

async function emitRagStreamPart(
    part: RagStreamPart,
    input: RagQueryInput,
    sse: ReturnType<typeof createSseWriter>,
    state: {answer: string; sources: Awaited<ReturnType<typeof resolveSourcesFromChunks>>}
): Promise<void> {
    if (part.type === "context") {
        state.sources =
            part.chunks.length > 0
                ? await resolveSourcesFromChunks(part.chunks, input.userId, input.knowledgeBaseId)
                : [];
        sse("sources", {sources: state.sources});
        return;
    }
    state.answer += part.text;
    sse("token", {text: part.text});
}

async function streamRagQueryAnswer(
    res: express.Response,
    input: RagQueryInput,
    signal: AbortSignal
): Promise<void> {
    const sse = createSseWriter(res);
    const state = {answer: "", sources: [] as Awaited<ReturnType<typeof resolveSourcesFromChunks>>};

    try {
        for await (const part of ragService.answerWithRAGStream(input.query, {
            userId: input.userId,
            knowledgeBaseId: input.knowledgeBaseId,
            k: 3,
            signal,
        })) {
            await emitRagStreamPart(part, input, sse, state);
        }
    } catch (e) {
        if (isStreamAborted(e, signal)) {
            sse("aborted", {stopped: true});
        } else {
            const message = e instanceof Error ? e.message : "查询失败";
            state.answer = `生成失败：${message}`;
            sse("error", {message: state.answer});
        }
    }

    sse("done", {answer: state.answer, sources: state.sources});
}

export async function handleRagQuery(req: express.Request, res: express.Response): Promise<void> {
    try {
        const input = await parseRagQueryInput(req, res);
        if (!input) return;

        setupSseResponse(res);
        const {signal, cleanup} = bindRequestAbort(req);
        try {
            await streamRagQueryAnswer(res, input, signal);
        } finally {
            cleanup();
        }
        res.end();
    } catch (error) {
        console.error("RAG查询失败:", error);
        if (!res.headersSent) {
            res.status(500).json({error: "查询失败"});
        } else {
            res.end();
        }
    }
}
