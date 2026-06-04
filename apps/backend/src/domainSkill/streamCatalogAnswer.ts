import {AIMessageChunk} from "@langchain/core/messages";
import documentService, {type CatalogDocumentEntry} from "../services/documentService.js";
import {createLLM, messageChunkToText} from "../services/ragServiceHelpers.js";
import {CATALOG_CONTEXT_MAX_CHARS, RAG_CONTEXT_MAX_CHARS} from "../services/serviceConstants.js";
import {isStreamAborted} from "../utils/streamAbort.js";
import type {ChatSource} from "../services/chatService.js";
import {
    formatAbortedAnswer,
    type ChatHistoryTurn,
    type SseEmitter,
} from "../services/chatStreamHelpers.js";
import {emitStatus} from "./emitStatus.js";
import {HumanMessage, SystemMessage, AIMessage} from "@langchain/core/messages";
import {truncateChatContent} from "../utils/chatHistory.js";

type ReadySummary = {id: number; title: string; summary: string};

type CatalogStreamParams = {
    userId: number;
    knowledgeBaseId: number;
    query: string;
    history: ChatHistoryTurn[];
    entries: CatalogDocumentEntry[];
    sse: SseEmitter;
    signal?: AbortSignal;
};

function partitionEntries(entries: CatalogDocumentEntry[]): {
    ready: ReadySummary[];
    missingTitles: string[];
} {
    const ready: ReadySummary[] = [];
    const missingTitles: string[] = [];
    for (const e of entries) {
        if (e.summary_status === "ready" && e.summary?.trim()) {
            ready.push({id: e.id, title: e.title, summary: e.summary.trim()});
        } else {
            missingTitles.push(e.title);
        }
    }
    return {ready, missingTitles};
}

function buildCatalogContext(ready: ReadySummary[], missingTitles: string[]): string {
    const blocks = ready.map(
        (r) => `### ${r.title} (id=${r.id})\n${r.summary}`
    );
    let ctx = blocks.join("\n\n");
    if (missingTitles.length) {
        ctx += `\n\n【以下文档尚未生成摘要，请勿编造其内容】\n${missingTitles.map((t) => `- ${t}`).join("\n")}`;
    }
    if (ctx.length > CATALOG_CONTEXT_MAX_CHARS) {
        ctx = ctx.slice(0, CATALOG_CONTEXT_MAX_CHARS) + "\n\n…（部分摘要因长度限制未纳入）";
    }
    return ctx;
}

function buildCatalogMessages(
    query: string,
    context: string,
    history: ChatHistoryTurn[]
): (SystemMessage | HumanMessage | AIMessage)[] {
    const systemText =
        "你是知识库概览助手。仅依据【各文档已生成的摘要】回答用户关于知识库整体的问题。" +
        "按文档分条组织回答；对未生成摘要的文档只列出标题并提示用户到知识库管理界面生成摘要。不要编造摘要中不存在的信息。";
    const msgs: (SystemMessage | HumanMessage | AIMessage)[] = [new SystemMessage(systemText)];
    for (const h of history) {
        if (h.role === "user") msgs.push(new HumanMessage(h.content));
        else msgs.push(new AIMessage(truncateChatContent(h.content, RAG_CONTEXT_MAX_CHARS)));
    }
    msgs.push(
        new HumanMessage(`【知识库文档摘要】\n${context}\n\n【用户问题】\n${query}`)
    );
    return msgs;
}

export async function streamCatalogAnswer(params: CatalogStreamParams): Promise<{
    answer: string;
    sources: ChatSource[] | null;
    aborted?: boolean;
}> {
    const {query, history, entries, sse, signal} = params;
    const {ready, missingTitles} = partitionEntries(entries);
    const sources: ChatSource[] = ready.map((r) => ({id: r.id, title: r.title}));

    emitStatus(sse, "writing", "正在生成汇总…");

    if (!ready.length) {
        const hint =
            entries.length === 0
                ? "当前知识库暂无文档。请先上传文档，并在知识库管理中对文档点击「生成摘要」。"
                : `当前知识库有 ${entries.length} 篇文档，但均未生成摘要。请在知识库 Finder 中为各文档点击「生成摘要」后再试。`;
        sse("token", {text: hint});
        return {answer: hint, sources: null};
    }

    const context = buildCatalogContext(ready, missingTitles);
    let answer = "";

    try {
        const llm = createLLM();
        const stream = await llm.stream(buildCatalogMessages(query, context, history), {signal});
        for await (const chunk of stream) {
            const text = messageChunkToText(chunk as AIMessageChunk);
            if (!text) continue;
            answer += text;
            sse("token", {text});
        }
        if (sources.length) sse("sources", {sources});
        return {answer, sources};
    } catch (e) {
        if (isStreamAborted(e, signal)) {
            return {answer: formatAbortedAnswer(answer), sources, aborted: true};
        }
        throw e;
    }
}

export async function loadCatalogEntries(userId: number, knowledgeBaseId: number) {
    return documentService.listCatalogEntries(userId, knowledgeBaseId);
}
