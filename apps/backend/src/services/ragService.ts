import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {ChatOpenAI} from "@langchain/openai";
import VectorIndex from "../config/vectorIndex.js";
import {Document} from "@langchain/core/documents";
import deepseekConfig from "../config/deepseek.js";
import pool from "../config/database.js";

type ChunkItem = { content: string; score: number; metadata: any };
type EmbeddingRow = {
    id: number;
    document_id: number;
    chunk_text: string;
    embedding: number[]; // JSON string
};

type AnswerWithRagResult = {
    answer: string;
    chunks: ChunkItem[];
};

function createLLM() {
    return new ChatOpenAI({
        apiKey: deepseekConfig.apiKey,
        configuration: {baseURL: deepseekConfig.baseURL},
        model: deepseekConfig.modelName,
        temperature: deepseekConfig.temperature ?? 0.2,
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
                chunkSize: 500,   // 原 200 太碎
                chunkOverlap: 100 // 原 120 在 200 下重叠过高
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

            // 校验向量合法性
            const dim = vectors[0]?.length ?? 0;
            if (!dim) throw new Error("empty embedding vector");
            for (const v of vectors) {
                if (!Array.isArray(v) || v.length !== dim) {
                    throw new Error("invalid embedding dimension");
                }
            }

            // 并发入库（学习阶段可接受）
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

    async retrieveRelevantChunks(
        query: string,
        opts?: { documentId?: number; k?: number; minScore?: number }
    ): Promise<ChunkItem[]> {
        try {
            const k = opts?.k ?? 5;
            const minScore = opts?.minScore ?? 0.2;

            const [queryVec] = await VectorIndex.embedTexts([query]);
            if (!queryVec || !queryVec.length) return [];

            let sql = `
                SELECT id, document_id, chunk_text, embedding
                FROM embeddings
            `;
            const args: any[] = [];

            if (opts?.documentId) {
                sql += ` WHERE document_id = ? `;
                args.push(opts.documentId);
            }

            sql += ` ORDER BY id DESC LIMIT 2000`;

            const [rows] = await pool.query(sql, args);
            const candidates = rows as EmbeddingRow[];
            const scored: ChunkItem[] = [];

            for (const row of candidates) {
                let vec: number[] | null = null;
                try {
                    vec = row.embedding;
                } catch {
                    continue;
                }

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
        opts?: { documentId?: number; k?: number; minScore?: number }
    ): Promise<AnswerWithRagResult> {
        try {
            const llm = createLLM();
            const chunks = await this.retrieveRelevantChunks(query, opts);
            // 无上下文直接拒答
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
                    "你是专业文档问答助手。只能根据提供上下文回答；若信息不足，必须回答“信息不足”。不要编造。"
                ],
                ["human", "问题：{input}\n\n上下文：\n{context}"],
            ]);

            const messages = await prompt.formatMessages({
                input: query,
                context,
            });

            const resp = await llm.invoke(messages);
            const answer =
                typeof resp.content === "string"
                    ? resp.content
                    : JSON.stringify(resp.content);

            return {answer, chunks};
        } catch (error) {
            console.error("[RAG] answerWithRAG failed:", error);
            throw error;
        }
    }
}

export default new RAGService();
