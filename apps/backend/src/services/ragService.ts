import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {ChatOpenAI} from "@langchain/openai";
import VectorIndex from "../config/vectorIndex.js";
import {Document} from "@langchain/core/documents";
import {qwenConfig} from "../config/qwen.js";
import pool from "../config/database.js";
import {HumanMessage, AIMessage, SystemMessage, AIMessageChunk} from "@langchain/core/messages";
import {invokeRagRetrievalGraph} from "../ragAgent/ragRetrievalGraph.js";
import {truncateChatContent, type ChatTurn} from "../utils/chatHistory.js";

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

/** 流式：先下发检索到的片段（用于引用），再逐 token 输出模型文本 */
export type RagStreamPart =
    | {type: "context"; chunks: RagChunkItem[]}
    | {type: "token"; text: string};

function messageChunkToText(chunk: AIMessageChunk): string {
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

function createLLM() {
    return new ChatOpenAI({
        apiKey: qwenConfig.apiKey,
        configuration: {baseURL: qwenConfig.baseURL},
        model: qwenConfig.chatModel,
        temperature: Number.isFinite(qwenConfig.temperature) ? qwenConfig.temperature : 0.2,
    });
}

export type RagChatHistory = ChatTurn[];

function buildRagGenerationMessages(
    query: string,
    context: string,
    history: RagChatHistory
): (SystemMessage | HumanMessage | AIMessage)[] {
    const msgs: (SystemMessage | HumanMessage | AIMessage)[] = [
        new SystemMessage(
            "你是专业文档问答助手。主要依据【参考上下文】回答【当前问题】。\n" +
                "若用户为追问、对比或指代，可结合【对话历史】理解意图；技术细节须来自参考上下文或历史中助手已给出的、与文档一致的内容，不要编造。\n" +
                "若参考上下文与历史仍不足以回答，明确说明信息不足。"
        ),
    ];
    for (const h of history) {
        if (h.role === "user") msgs.push(new HumanMessage(h.content));
        else msgs.push(new AIMessage(truncateChatContent(h.content, 2000)));
    }
    msgs.push(
        new HumanMessage(`【参考上下文】\n${context}\n\n【当前问题】\n${query}`)
    );
    return msgs;
}

class RAGService {
    async ingestDocument(params: {
        text: string;
        documentId: number;
        title: string;
        source?: string;
    }): Promise<void> {
        try {
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 300,
                chunkOverlap: 100,
            });

            const docs = await splitter.splitDocuments([
                new Document({
                    pageContent: params.text,
                    metadata: {
                        documentId: params.documentId,
                        title: params.title,
                        source: params.source ?? `document_${params.documentId}`,
                    },
                }),
            ]);

            const texts = docs.map((d) => d.pageContent).filter(Boolean);
            if (!texts.length) return;

            const vectors = await VectorIndex.embedTexts(texts);
            if (vectors.length !== texts.length) {
                throw new Error(
                    `embed result mismatch: texts=${texts.length}, vectors=${vectors.length}`
                );
            }

            const dim = vectors[0]?.length ?? 0;
            if (!dim) throw new Error("empty embedding vector");
            for (const v of vectors) {
                if (!Array.isArray(v) || v.length !== dim) {
                    throw new Error("invalid embedding dimension");
                }
            }

            await this.insertEmbeddingRows(params.documentId, texts, vectors);
        } catch (error) {
            console.error("[RAG] ingestDocument failed:", error);
            throw error;
        }
    }

    private async insertEmbeddingRows(
        documentId: number,
        texts: string[],
        vectors: number[][]
    ): Promise<void> {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            for (let i = 0; i < texts.length; i++) {
                await conn.query(
                    "INSERT INTO embeddings (document_id, chunk_text, embedding) VALUES (?, ?, ?)",
                    [documentId, texts[i], JSON.stringify(vectors[i])]
                );
            }
            await conn.commit();
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    }

    async deleteEmbeddingsForDocument(documentId: number): Promise<void> {
        await pool.query("DELETE FROM embeddings WHERE document_id = ?", [documentId]);
    }

    async retrieveRelevantChunks(
        query: string,
        opts?: {
            documentId?: number;
            knowledgeBaseId?: number;
            userId?: number;
            k?: number;
            minScore?: number;
        }
    ): Promise<RagChunkItem[]> {
        try {
            const k = opts?.k ?? 5;
            const minScore = opts?.minScore ?? 0.2;

            if (opts?.userId == null) {
                return [];
            }

            const [queryVec] = await VectorIndex.embedTexts([query]);
            if (!queryVec || !queryVec.length) return [];

            const args: unknown[] = [opts.userId];
            const parts = ["d.user_id = ?"];

            if (opts.knowledgeBaseId != null) {
                parts.push("d.knowledge_base_id = ?");
                args.push(opts.knowledgeBaseId);
            }
            if (opts.documentId) {
                parts.push("e.document_id = ?");
                args.push(opts.documentId);
            }

            const sql = `
                SELECT e.id, e.document_id, e.chunk_text, e.embedding
                FROM embeddings e
                INNER JOIN documents d ON d.id = e.document_id
                WHERE ${parts.join(" AND ")}
                ORDER BY e.id DESC LIMIT 2000
            `;

            const [rows] = await pool.query(sql, args);
            const candidates = rows as EmbeddingRow[];
            const scored: RagChunkItem[] = [];

            for (const row of candidates) {
                const vec = row.embedding;
                if (!Array.isArray(vec) || vec.length !== queryVec.length) continue;
                const score = VectorIndex.cosineSimilarity(queryVec, vec);
                if (!Number.isFinite(score)) continue;
                if (score < minScore) continue;
                scored.push({
                    content: row.chunk_text,
                    metadata: {
                        documentId: row.document_id,
                        embeddingId: row.id,
                    },
                    score,
                });
            }
            scored.sort((a, b) => b.score - a.score);
            return scored.slice(0, k);
        } catch (error) {
            console.error("[RAG] retrieveRelevantChunks failed:", error);
            throw error;
        }
    }

    private shouldUsePlainChatFallback(state: {
        chunks: RagChunkItem[];
        evalResult?: {sufficient: boolean} | null;
    }): boolean {
        return !state.chunks.length || !state.evalResult?.sufficient;
    }

    /**
     * RAG 问答（仅 SSE 流式）。先 context 片段，再 token。
     */
    async *answerWithRAGStream(
        query: string,
        opts?: {
            documentId?: number;
            knowledgeBaseId?: number;
            userId?: number;
            k?: number;
            minScore?: number;
            history?: RagChatHistory;
            /** 中止时 LangChain / 底层 HTTP 会取消流式请求 */
            signal?: AbortSignal;
        }
    ): AsyncGenerator<RagStreamPart> {
        if (opts?.userId == null) {
            yield {type: "context", chunks: []};
            yield {type: "token", text: "信息不足"};
            return;
        }
        const history = opts?.history ?? [];
        const state = await invokeRagRetrievalGraph({
            userQuery: query,
            conversationHistory: history,
            ragOpts: {
                userId: opts.userId,
                knowledgeBaseId: opts.knowledgeBaseId,
                documentId: opts.documentId,
                k: opts.k ?? 5,
                minScore: opts.minScore,
                signal: opts?.signal,
            },
        });
        const chunks = state.chunks as RagChunkItem[];
        yield {type: "context", chunks: this.shouldUsePlainChatFallback({chunks, evalResult: state.evalResult}) ? [] : chunks};
        if (this.shouldUsePlainChatFallback({chunks, evalResult: state.evalResult})) {
            for await (const delta of this.streamChatPlain(query, history, opts?.signal, {
                ragFallback: true,
            })) {
                yield {type: "token", text: delta};
            }
            return;
        }

        const llm = createLLM();
        const context = chunks
            .map((c, i) => `片段${i + 1}(score=${c.score.toFixed(3)}):\n${c.content}`)
            .join("\n\n");

        const messages = buildRagGenerationMessages(query, context, history);

        try {
            const stream = await llm.stream(messages, {signal: opts?.signal});
            for await (const chunk of stream) {
                const text = messageChunkToText(chunk as AIMessageChunk);
                if (text) yield {type: "token", text};
            }
        } catch (error) {
            console.error("[RAG] answerWithRAGStream failed:", error);
            throw error;
        }
    }

    /** 无知识库或多轮纯对话（流式）；ragFallback 表示检索未命中后的兜底 */
    async *streamChatPlain(
        userMessage: string,
        history: Array<{role: "user" | "assistant"; content: string}>,
        signal?: AbortSignal,
        options?: {ragFallback?: boolean}
    ): AsyncGenerator<string> {
        const llm = createLLM();
        const systemText = options?.ragFallback
            ? "你是友好、简洁的中文助手。当前知识库未检索到足够相关的文档片段，请结合【对话历史】与用户问题作答；" +
              "不要编造文档或引用来源，可说明未在知识库中找到直接依据，再基于常识与上下文尽量有帮助地回复。"
            : "你是友好、简洁的中文助手。回答要有帮助、可读。";
        const msgs: (SystemMessage | HumanMessage | AIMessage)[] = [new SystemMessage(systemText)];
        for (const h of history) {
            if (h.role === "user") msgs.push(new HumanMessage(h.content));
            else msgs.push(new AIMessage(truncateChatContent(h.content, 2000)));
        }
        msgs.push(new HumanMessage(userMessage));
        try {
            const stream = await llm.stream(msgs, {signal});
            for await (const chunk of stream) {
                const text = messageChunkToText(chunk as AIMessageChunk);
                if (text) yield text;
            }
        } catch (error) {
            console.error("[RAG] streamChatPlain failed:", error);
            throw error;
        }
    }
}

export default new RAGService();
