import type express from "express";
import knowledgeBaseService from "../services/knowledgeBaseService.js";
import {runDomainSkill} from "../domainSkill/domainSkillExecutor.js";
import {SKILL_ID_KB_RAG, assertKnownSkillId} from "../domainSkill/skillRegistry.js";
import {DomainSkillError} from "../domainSkill/types.js";
import {getUserId, parsePositiveInt} from "../utils/routeHelpers.js";
import {isStreamAborted} from "../utils/streamAbort.js";
import {SSE_HEARTBEAT_INTERVAL_MS} from "../services/serviceConstants.js";
import {
    bindRequestAbort,
    createSseWriter,
    setupSseResponse,
    startSseHeartbeat,
} from "../utils/sse.js";
import {emitStatus} from "../domainSkill/emitStatus.js";

type RagQueryInput = {
    userId: number;
    query: string;
    knowledgeBaseId: number;
    skillId: string;
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

    const {query, knowledgeBaseId: kbRaw, skillId: skillRaw} = req.body ?? {};
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

    const skillId =
        skillRaw === null || skillRaw === undefined || skillRaw === ""
            ? SKILL_ID_KB_RAG
            : String(skillRaw);

    return {userId, query: query.trim(), knowledgeBaseId, skillId};
}

async function streamRagQueryAnswer(
    input: RagQueryInput,
    sse: ReturnType<typeof createSseWriter>,
    signal: AbortSignal
): Promise<{answer: string; sources: unknown}> {
    try {
        const skillId = assertKnownSkillId(input.skillId);
        const result = await runDomainSkill({
            skillId,
            userId: input.userId,
            knowledgeBaseId: input.knowledgeBaseId,
            query: input.query,
            history: [],
            sse,
            signal,
        });
        return {answer: result.answer, sources: result.sources ?? []};
    } catch (e) {
        if (isStreamAborted(e, signal)) {
            sse("aborted", {stopped: true});
            return {answer: "", sources: []};
        }
        if (e instanceof DomainSkillError) {
            sse("error", {message: e.message, code: e.code});
            emitStatus(sse, "failed", e.message);
            return {answer: e.message, sources: []};
        }
        const message = e instanceof Error ? e.message : "查询失败";
        sse("error", {message});
        return {answer: `生成失败：${message}`, sources: []};
    }
}

export async function handleRagQuery(req: express.Request, res: express.Response): Promise<void> {
    try {
        const input = await parseRagQueryInput(req, res);
        if (!input) return;

        setupSseResponse(res);
        const {signal, cleanup} = bindRequestAbort(req);
        const stopHeartbeat = startSseHeartbeat(res, SSE_HEARTBEAT_INTERVAL_MS);
        const sse = createSseWriter(res);
        try {
            const state = await streamRagQueryAnswer(input, sse, signal);
            sse("done", {answer: state.answer, sources: state.sources});
        } finally {
            stopHeartbeat();
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
