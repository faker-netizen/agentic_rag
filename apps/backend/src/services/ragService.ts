import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import VectorIndex from "../config/vectorIndex.js";
import { Document } from "@langchain/core/documents";
import { ChatOpenAI } from "@langchain/openai";
import deepseekConfig from "../config/deepseek.js";
import pool from "../config/database.js";

type ChunkItem = { content: string; score?: number; metadata: any };
type EmbeddingRow = {
  id: number;
  document_id: number;
  chunk_text: string;
  embedding: string; // JSON string
};
// 这里先用内存数组做最小可运行示例（你可替换成DB向量检索）
const inMemoryDocs: Document[] = [];
const deletedDocumentIds = new Set<number>();

function createLLM() {
  return new ChatOpenAI({
    apiKey: deepseekConfig.apiKey,
    configuration: { baseURL: deepseekConfig.baseURL },
    model: deepseekConfig.modelName,
    temperature: deepseekConfig.temperature,
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
        chunkSize: 200,
        chunkOverlap: 120,
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

      inMemoryDocs.push(...docs);
      const texts = docs.map((d) => d.pageContent);
      // 2) 批量向量化
      const vectors = await VectorIndex.embedTexts(texts);
      console.log(vectors)
      // 3) 落库
      for (let i = 0; i < texts.length; i++) {
        await pool.query(
            "INSERT INTO embeddings (document_id, chunk_text, embedding) VALUES (?, ?, ?)",
            [params.documentId, texts[i], JSON.stringify(vectors[i])]
        );
      }
    } catch (error) {
      console.error("[RAG] ingestDocument failed:", error);
      throw error;
    }
  }



  async retrieveRelevantChunks(
      query: string,
      opts?: { documentId?: number; k?: number }
  ): Promise<ChunkItem[]> {
    try {
      const k = opts?.k ?? 5;

      // 1) query 向量化
      const [queryVec] = await VectorIndex.embedTexts([query]);
      if (!queryVec || !queryVec.length) return [];

      // 2) 拉取候选数据（先做一个上限，避免全表扫爆内存）
      // 个人学习阶段可先 limit 2000，后面再做分页/ANN
      let sql = `
      SELECT id, document_id, chunk_text, embedding
      FROM embeddings
    `;
      const args: any[] = [];
      console.log(sql)
      if (opts?.documentId) {
        sql += ` WHERE document_id = ? `;
        args.push(opts.documentId);
      }

      sql += ` ORDER BY id DESC LIMIT 2000`;

      const [rows] = await pool.query(sql, args);
      const candidates = rows as EmbeddingRow[];

      // 3) 计算相似度并排序
      const scored: Array<ChunkItem & { score: number }> = [];

      for (const row of candidates) {
        if (deletedDocumentIds.has(row.document_id)) continue;

        let vec: number[] | null = null;
        try {
          vec = JSON.parse(row.embedding);
        } catch {
          continue;
        }

        if (!Array.isArray(vec) || vec.length !== queryVec.length) continue;

        const score = VectorIndex.cosineSimilarity(queryVec, vec);
        if (score < 0) continue;

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
      console.log(scored)
      // 4) 返回 top-k
      return scored.slice(0, k).map(({ content, metadata, score }) => ({
        content,
        metadata,
        score,
      }));
    } catch (error) {
      console.error("[RAG] retrieveRelevantChunks failed:", error);
      throw error;
    }
  }

  async answerWithRAG(
      query: string,
      opts?: { documentId?: number; k?: number }
  ): Promise<string> {
    try {
      const llm = createLLM();
      const chunks = await this.retrieveRelevantChunks(query, opts);

      const context = chunks.map((c, i) => `片段${i + 1}:\n${c.content}`).join("\n\n");

      const prompt = ChatPromptTemplate.fromMessages([
        ["system", "你是专业文档问答助手。只能根据提供上下文回答；若信息不足，请明确说“信息不足”。"],
        ["human", "问题：{input}\n\n上下文：\n{context}"],
      ]);

      const messages = await prompt.formatMessages({
        input: query,
        context: context || "（无可用上下文）",
      });

      const resp = await llm.invoke(messages);
      return typeof resp.content === "string" ? resp.content : JSON.stringify(resp.content);
    } catch (error) {
      console.error("[RAG] answerWithRAG failed:", error);
      throw error;
    }
  }

  async deleteDocument(documentId: number): Promise<void> {
    deletedDocumentIds.add(documentId);
  }
}

export default new RAGService();
