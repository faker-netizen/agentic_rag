import ragService from "../services/ragService.js";
import {resolveSourcesFromChunks} from "../utils/ragSources.js";
import {isStreamAborted} from "../utils/streamAbort.js";
import type {ChatSource} from "../services/chatService.js";
import {
    formatAbortedAnswer,
    type ChatHistoryTurn,
    type SseEmitter,
} from "../services/chatStreamHelpers.js";
import {RAG_TOP_K} from "../services/serviceConstants.js";
import {DomainSkillError} from "./types.js";
import {emitStatus} from "./emitStatus.js";
import type {DomainSkillDef} from "./types.js";

type StreamParams = {
    skill: DomainSkillDef;
    userId: number;
    knowledgeBaseId: number;
    query: string;
    history: ChatHistoryTurn[];
    sse: SseEmitter;
    signal?: AbortSignal;
};

export async function streamSkillRagAnswer(params: StreamParams): Promise<{
    answer: string;
    sources: ChatSource[] | null;
    aborted?: boolean;
}> {
    const {skill, userId, knowledgeBaseId, query, history, sse, signal} = params;
    emitStatus(sse, "writing", "正在生成…");
    let answer = "";
    let sources: ChatSource[] | null = null;
    let sawIndexedContext = false;

    try {
        for await (const part of ragService.answerWithRAGStream(query, {
            userId,
            knowledgeBaseId,
            k: RAG_TOP_K,
            history,
            signal,
            extraSystemPolicy: skill.systemPolicy || undefined,
            forbidPlainFallback: true,
        })) {
            if (part.type === "context") {
                if (part.chunks.length > 0) sawIndexedContext = true;
                sources =
                    part.chunks.length > 0
                        ? await resolveSourcesFromChunks(part.chunks, userId, knowledgeBaseId)
                        : null;
                if (sources && !sources.length) sources = null;
                sse("sources", {sources});
            } else if (part.type === "token") {
                answer += part.text;
                sse("token", {text: part.text});
            }
        }
        if (!sawIndexedContext && !answer.trim()) {
            emitStatus(sse, "failed", "未找到可用的检索索引");
            throw new DomainSkillError("未找到可用的检索索引", "NO_INDEXED_DOCS");
        }
        return {answer, sources};
    } catch (e) {
        if (isStreamAborted(e, signal)) {
            return {answer: formatAbortedAnswer(answer), sources, aborted: true};
        }
        throw e;
    }
}
