import {ChatOpenAI} from "@langchain/openai";
import VectorIndex from "../config/vectorIndex.js";
import {qwenConfig} from "../config/qwen.js";
import {HumanMessage, AIMessage, SystemMessage, AIMessageChunk} from "@langchain/core/messages";
import {truncateChatContent, type ChatTurn} from "../utils/chatHistory.js";
import {
    DEFAULT_MIN_SCORE,
    DEFAULT_RETRIEVAL_K,
    EMBEDDING_CANDIDATE_LIMIT,
    RAG_CONTEXT_MAX_CHARS,
    RAG_TEMPERATURE,
} from "./serviceConstants.js";
import {INDEXED_DOCUMENT_SQL} from "./documentTypes.js";
export type RagChunkItem = {
    content: string;
    score: number;
    metadata: {documentId: number; embeddingId: number};
};

type EmbeddingRow = {
    id: number;
    document_id: number;
    chunk_text: string;
    embedding: number[];
};

export type RagChatHistory = ChatTurn[];

export function messageChunkToText(chunk: AIMessageChunk): string {
    const c = chunk.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
        return c
            .map((block) => {
                if (typeof block === "string") return block;
                if (block && typeof block === "object" && "text" in block) {
                    return String((block as {text?: string}).text ?? "");
                }
                return "";
            })
            .join("");
    }
    return "";
}

export function createLLM() {
    return new ChatOpenAI({
        apiKey: qwenConfig.apiKey,
        configuration: {baseURL: qwenConfig.baseURL},
        model: qwenConfig.chatModel,
        temperature: Number.isFinite(qwenConfig.temperature) ? qwenConfig.temperature : RAG_TEMPERATURE,
    });
}

export function buildRagGenerationMessages(
    query: string,
    context: string,
    history: RagChatHistory,
    extraSystemPolicy?: string
): (SystemMessage | HumanMessage | AIMessage)[] {
    let systemText =
        "你是专业文档问答助手。主要依据【参考上下文】回答【当前问题】。\n" +
        "若用户为追问、对比或指代，可结合【对话历史】理解意图；技术细节须来自参考上下文或历史中助手已给出的、与文档一致的内容，不要编造。\n" +
        "若参考上下文与历史仍不足以回答，明确说明信息不足。";
    if (extraSystemPolicy?.trim()) {
        systemText += `\n\n【本 Skill 附加要求】\n${extraSystemPolicy.trim()}`;
    }
    const msgs: (SystemMessage | HumanMessage | AIMessage)[] = [new SystemMessage(systemText)];
    for (const h of history) {
        if (h.role === "user") msgs.push(new HumanMessage(h.content));
        else msgs.push(new AIMessage(truncateChatContent(h.content, RAG_CONTEXT_MAX_CHARS)));
    }
    msgs.push(new HumanMessage(`【参考上下文】\n${context}\n\n【当前问题】\n${query}`));
    return msgs;
}

export function validateEmbeddingBatch(texts: string[], vectors: number[][]): void {
    if (vectors.length !== texts.length) {
        throw new Error(`embed result mismatch: texts=${texts.length}, vectors=${vectors.length}`);
    }
    const dim = vectors[0]?.length ?? 0;
    if (!dim) throw new Error("empty embedding vector");
    for (const v of vectors) {
        if (!Array.isArray(v) || v.length !== dim) {
            throw new Error("invalid embedding dimension");
        }
    }
}

export function scoreEmbeddingCandidates(
    candidates: EmbeddingRow[],
    queryVec: number[],
    minScore: number,
    k: number
): RagChunkItem[] {
    const scored: RagChunkItem[] = [];
    for (const row of candidates) {
        const vec = row.embedding;
        if (!Array.isArray(vec) || vec.length !== queryVec.length) continue;
        const score = VectorIndex.cosineSimilarity(queryVec, vec);
        if (!Number.isFinite(score) || score < minScore) continue;
        scored.push({
            content: row.chunk_text,
            metadata: {documentId: row.document_id, embeddingId: row.id},
            score,
        });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
}

export function buildEmbeddingScopeFilter(opts?: {
    documentId?: number;
    knowledgeBaseId?: number;
    userId?: number;
}): {parts: string[]; args: unknown[]} {
    const args: unknown[] = [opts?.userId];
    const parts = ["d.user_id = ?"];
    if (opts?.knowledgeBaseId != null) {
        parts.push("d.knowledge_base_id = ?");
        args.push(opts.knowledgeBaseId);
    }
    if (opts?.documentId) {
        parts.push("e.document_id = ?");
        args.push(opts.documentId);
    }
    parts.push(INDEXED_DOCUMENT_SQL);
    return {parts, args};
}

export function defaultRetrievalK(k?: number): number {
    return k ?? DEFAULT_RETRIEVAL_K;
}

export function defaultMinScore(minScore?: number): number {
    return minScore ?? DEFAULT_MIN_SCORE;
}

export function embeddingCandidateLimit(): number {
    return EMBEDDING_CANDIDATE_LIMIT;
}
