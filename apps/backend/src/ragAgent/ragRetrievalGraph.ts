/**
 * LangGraph：首轮不强制查询重写；多路召回；**LLM 评估**；不足则改写再检索一次，仍不足则交由上层走纯对话。
 * 不包含最终「生成答案」——由 ragService 在图结束后调用 LLM（支持流式）。
 */
import {Annotation, END, START, StateGraph} from "@langchain/langgraph";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {HumanMessage, SystemMessage} from "@langchain/core/messages";
import {ChatOpenAI} from "@langchain/openai";
import {z} from "zod";
import {qwenConfig} from "../config/qwen.js";
import {multiRecallChunks} from "../services/ragMultiRecall.js";
import {contextualizeRagQuery} from "./contextualizeQuery.js";
import {formatHistoryBlock, type ChatTurn} from "../utils/chatHistory.js";

/** 与 RagChunkItem 结构一致，避免 ragService ↔ 子图循环依赖 */
export type GraphChunk = {
    content: string;
    score: number;
    metadata: {documentId: number; embeddingId: number};
};

export type RagRetrievalRagOpts = {
    userId: number;
    knowledgeBaseId?: number;
    documentId?: number;
    k?: number;
    minScore?: number;
    signal?: AbortSignal;
};

/** 首次检索 + 最多 1 次改写后再检索 */
const MAX_RETRIEVAL_ATTEMPTS = 2;

const EvalSchema = z.object({
    sufficient: z.boolean().describe("当前片段是否足以准确、完整地回答用户问题"),
    /** OpenAI 结构化输出：字段须 required，可空用 nullable 而非 optional */
    reason: z.string().nullable().describe("简要理由；无补充说明时填 null"),
});

const RewriteSchema = z.object({
    queries: z
        .array(z.string().min(1))
        .min(1)
        .max(3)
        .describe("用于下一轮检索的查询句，应覆盖不同措辞或子问题"),
});

function createLlm() {
    return new ChatOpenAI({
        apiKey: qwenConfig.apiKey,
        configuration: {baseURL: qwenConfig.baseURL},
        model: qwenConfig.chatModel,
        temperature: Number.isFinite(qwenConfig.temperature) ? qwenConfig.temperature : 0.2,
    });
}

const replace = <T,>(_left: T, right: T): T => right;

const RagRetrievalAnnotation = Annotation.Root({
    userQuery: Annotation<string>(),
    /** 本轮之前的会话轮次（不含当前 userQuery） */
    conversationHistory: Annotation<ChatTurn[]>({reducer: replace, default: () => []}),
    queries: Annotation<string[]>({reducer: replace, default: () => []}),
    chunks: Annotation<GraphChunk[]>({reducer: replace, default: () => []}),
    evalResult: Annotation<{sufficient: boolean; reason?: string | null} | null>({reducer: replace, default: () => null}),
    rewriteRound: Annotation<number>({reducer: replace, default: () => 0}),
    retrievalAttempts: Annotation<number>({reducer: replace, default: () => 0}),
    ragOpts: Annotation<RagRetrievalRagOpts>({reducer: replace}),
});

export type RagRetrievalState = typeof RagRetrievalAnnotation.State;

async function prepareNode(state: RagRetrievalState): Promise<Partial<RagRetrievalState>> {
    if (state.queries?.length) return {};

    const hist = state.conversationHistory ?? [];
    if (hist.length > 0) {
        const standalone = await contextualizeRagQuery(
            state.userQuery,
            hist,
            state.ragOpts.signal
        );
        return {queries: [standalone]};
    }
    return {queries: [state.userQuery]};
}

function questionWithHistory(state: RagRetrievalState): string {
    const hist = state.conversationHistory ?? [];
    if (!hist.length) return state.userQuery;
    return `【对话历史】\n${formatHistoryBlock(hist)}\n\n【当前用户问题】\n${state.userQuery}`;
}

async function retrieveNode(state: RagRetrievalState): Promise<Partial<RagRetrievalState>> {
    const opts = state.ragOpts;
    const finalK = opts.k ?? 8;
    const merged: GraphChunk[] = [];
    const seen = new Set<number>();

    for (const q of state.queries.slice(0, 5)) {
        const {chunks} = await multiRecallChunks(q, {
            userId: opts.userId,
            knowledgeBaseId: opts.knowledgeBaseId,
            documentId: opts.documentId,
            recallPerPath: 24,
            finalK,
            minVectorScore: opts.minScore ?? 0.15,
            fusion: "rrf",
        });
        for (const c of chunks) {
            if (seen.has(c.metadata.embeddingId)) continue;
            seen.add(c.metadata.embeddingId);
            merged.push({
                content: c.content,
                score: c.score,
                metadata: {
                    documentId: c.metadata.documentId,
                    embeddingId: c.metadata.embeddingId,
                },
            });
        }
    }
    merged.sort((a, b) => b.score - a.score);
    const top = merged.slice(0, finalK);
    return {
        chunks: top,
        retrievalAttempts: state.retrievalAttempts + 1,
    };
}

async function evaluateNode(state: RagRetrievalState): Promise<Partial<RagRetrievalState>> {
    const signal = state.ragOpts.signal;
    const llm = createLlm().withStructuredOutput(EvalSchema);
    const chunkText =
        state.chunks.length > 0
            ? state.chunks
                  .map((c, i) => `片段${i + 1}(score=${c.score.toFixed(3)}):\n${c.content}`)
                  .join("\n\n")
            : "（无检索到的片段）";

    const prompt = ChatPromptTemplate.fromMessages([
        [
            "system",
            "你是检索质量评估器。根据【用户问题】（可含对话历史）与检索片段，判断是否足以回答。\n" +
                "若用户为追问/对比/指代（如「再和 var 比较一下」），应结合历史中已明确的话题理解意图，不要曲解为无关概念（如把 var 听成 ===）。\n" +
                "片段需能支撑当前完整意图；若为空或明显无关，判定 sufficient=false。",
        ],
        [
            "human",
            "{q}\n\n当前检索片段：\n{chunks}\n\n请判断是否足以回答。",
        ],
    ]);
    const messages = await prompt.formatMessages({q: questionWithHistory(state), chunks: chunkText});
    const out = await llm.invoke(messages, {signal});
    return {
        evalResult: {sufficient: out.sufficient, reason: out.reason ?? undefined},
    };
}

async function rewriteQueryNode(state: RagRetrievalState): Promise<Partial<RagRetrievalState>> {
    const signal = state.ragOpts.signal;
    const llm = createLlm().withStructuredOutput(RewriteSchema);
    const prev = state.queries.join(" | ");
    const reason = state.evalResult?.reason ?? "";

    const prompt = ChatPromptTemplate.fromMessages([
        [
            "system",
            "你是查询改写助手。根据对话与用户问题、上一轮检索失败原因，生成 1～3 条**新的中文检索查询**（补全指代、换同义词），不要重复上一轮完全相同的句子。",
        ],
        [
            "human",
            "{q}\n上一轮查询：{prev}\n评估说明：{reason}\n请给出下一轮检索查询列表。",
        ],
    ]);
    const messages = await prompt.formatMessages({
        q: questionWithHistory(state),
        prev,
        reason,
    });
    const out = await llm.invoke(messages, {signal});
    return {
        queries: out.queries,
        rewriteRound: state.rewriteRound + 1,
    };
}

async function giveupNode(state: RagRetrievalState): Promise<Partial<RagRetrievalState>> {
    void state;
    return {
        chunks: [],
        evalResult: {sufficient: false, reason: "fallback_plain_chat"},
    };
}

function routeAfterEval(state: RagRetrievalState): "ready" | "rewrite" | "giveup" {
    const ok = Boolean(state.evalResult?.sufficient) && state.chunks.length > 0;
    if (ok) return "ready";
    if (state.retrievalAttempts >= MAX_RETRIEVAL_ATTEMPTS) return "giveup";
    return "rewrite";
}

let compiled: ReturnType<typeof buildGraph> | null = null;

function buildGraph() {
    const g = new StateGraph(RagRetrievalAnnotation)
        .addNode("prepare", prepareNode)
        .addNode("retrieve", retrieveNode)
        .addNode("evaluate", evaluateNode)
        .addNode("rewrite_query", rewriteQueryNode)
        .addNode("giveup", giveupNode)
        .addEdge(START, "prepare")
        .addEdge("prepare", "retrieve")
        .addEdge("retrieve", "evaluate")
        .addConditionalEdges("evaluate", routeAfterEval, {
            ready: END,
            giveup: "giveup",
            rewrite: "rewrite_query",
        })
        .addEdge("rewrite_query", "retrieve")
        .addEdge("giveup", END);

    return g.compile();
}

export function getRetrievalGraph() {
    if (!compiled) compiled = buildGraph();
    return compiled;
}

export type RagRetrievalInvokeInput = {
    userQuery: string;
    conversationHistory?: ChatTurn[];
    ragOpts: RagRetrievalRagOpts;
};

/**
 * 运行检索子图：返回最终 chunks 与 eval；不足时 chunks 为空，由 ragService 走纯对话兜底。
 */
export async function invokeRagRetrievalGraph(input: RagRetrievalInvokeInput): Promise<RagRetrievalState> {
    const graph = getRetrievalGraph();
    const initial: RagRetrievalState = {
        userQuery: input.userQuery,
        conversationHistory: input.conversationHistory ?? [],
        queries: [],
        chunks: [],
        evalResult: null,
        rewriteRound: 0,
        retrievalAttempts: 0,
        ragOpts: input.ragOpts,
    };
    return (await graph.invoke(initial, {
        recursionLimit: 32,
        signal: input.ragOpts.signal,
    })) as RagRetrievalState;
}
