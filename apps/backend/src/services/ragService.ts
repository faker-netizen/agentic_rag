import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {ChatOpenAI} from "@langchain/openai";
import VectorIndex from "../config/vectorIndex.js";
import {Document} from "@langchain/core/documents";
import {qwenConfig} from "../config/qwen.js";
import pool from "../config/database.js";
import {HumanMessage, AIMessage, SystemMessage, AIMessageChunk} from "@langchain/core/messages";

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

type AnswerWithRagResult = {
    answer: string;
    chunks: RagChunkItem[];
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

            await Promise.all(
                texts.map((text, i) =>
                    pool.query(
                        "INSERT INTO embeddings (document_id, chunk_text, embedding) VALUES (?, ?, ?)",
                        [params.documentId, text, JSON.stringify(vectors[i])]
                    )
                )
            );
        } catch (error) {
            console.error("[RAG] ingestDocument failed:", error);
            throw error;
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

    async answerWithRAG(
        query: string,
        opts?: {documentId?: number; knowledgeBaseId?: number; userId?: number; k?: number; minScore?: number}
    ): Promise<AnswerWithRagResult> {
        try {
            const llm = createLLM();
            const chunks = await this.retrieveRelevantChunks(query, opts);
            if (!chunks.length) {
                return {
                    answer: "信息不足",
                    chunks: [],
                };
            }

            const context = chunks
                .map((c, i) => `片段${i + 1}(score=${c.score.toFixed(3)}):\n${c.content}`)
                .join("\n\n");

            const prompt = ChatPromptTemplate.fromMessages([
                [
                    "system",
                    "你是专业文档问答助手。只能根据提供上下文回答；若信息不足，必须回答“信息不足”。不要编造。",
                ],
                ["human", "问题：{input}\n\n上下文：\n{context}"],
            ]);

            const messages = await prompt.formatMessages({
                input: query,
                context,
            });

            const resp = await llm.invoke(messages);
            const answer =
                typeof resp.content === "string" ? resp.content : JSON.stringify(resp.content);

            return {answer, chunks};
        } catch (error) {
            console.error("[RAG] answerWithRAG failed:", error);
            throw error;
        }
    }

    /** 无知识库时的多轮纯对话（由 chat 层传入已落库的历史，不含本轮用户句） */
    async chatPlain(
        userMessage: string,
        history: Array<{role: "user" | "assistant"; content: string}>
    ): Promise<string> {
        const llm = createLLM();
        const msgs: (SystemMessage | HumanMessage | AIMessage)[] = [
            new SystemMessage("你是友好、简洁的中文助手。回答要有帮助、可读。"),
        ];
        for (const h of history) {
            if (h.role === "user") msgs.push(new HumanMessage(h.content));
            else msgs.push(new AIMessage(h.content));
        }
        msgs.push(new HumanMessage(userMessage));
        const resp = await llm.invoke(msgs);
        return typeof resp.content === "string" ? resp.content : JSON.stringify(resp.content);
    }

    /**
     * 与 answerWithRAG 同逻辑，使用 ChatOpenAI.stream（底层为 OpenAI 兼容流式 Chat Completions，适用于千问 compatible-mode）。
     */
    async *answerWithRAGStream(
        query: string,
        opts?: {
            documentId?: number;
            knowledgeBaseId?: number;
            userId?: number;
            k?: number;
            minScore?: number;
            /** 中止时 LangChain / 底层 HTTP 会取消流式请求 */
            signal?: AbortSignal;
        }
    ): AsyncGenerator<RagStreamPart> {
        const chunks = await this.retrieveRelevantChunks(query, opts);
        yield {type: "context", chunks};
        if (!chunks.length) {
            yield {type: "token", text: "信息不足"};
            return;
        }

        const llm = createLLM();
        const context = chunks
            .map((c, i) => `片段${i + 1}(score=${c.score.toFixed(3)}):\n${c.content}`)
            .join("\n\n");

        const prompt = ChatPromptTemplate.fromMessages([
            [
                "system",
                "你是专业文档问答助手。只能根据提供上下文回答；若信息不足，必须回答“信息不足”。不要编造。",
            ],
            ["human", "问题：{input}\n\n上下文：\n{context}"],
        ]);

        const messages = await prompt.formatMessages({
            input: query,
            context,
        });

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

    /** 与 chatPlain 同逻辑，流式输出 */
    async *streamChatPlain(
        userMessage: string,
        history: Array<{role: "user" | "assistant"; content: string}>,
        signal?: AbortSignal
    ): AsyncGenerator<string> {
        const llm = createLLM();
        const msgs: (SystemMessage | HumanMessage | AIMessage)[] = [
            new SystemMessage("你是友好、简洁的中文助手。回答要有帮助、可读。"),
        ];
        for (const h of history) {
            if (h.role === "user") msgs.push(new HumanMessage(h.content));
            else msgs.push(new AIMessage(h.content));
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
