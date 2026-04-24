import { createEmbeddingsModel } from "./embeddings.js";

export type Vector = number[];

class VectorService {
     cosineSimilarity(a: Vector, b: Vector): number {
        if (!a.length || !b.length || a.length !== b.length) return 0;

        let dot = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        if (!denom) return 0;
        return dot / denom;
    }

    // 单条文本向量化（常用于query）
    async embedText(text: string): Promise<Vector> {
        const model = createEmbeddingsModel();
        const [vec] = await model.embedDocuments([text]);
        return vec;
    }

    // 批量文本向量化（常用于chunk）
    async embedTexts(texts: string[]): Promise<Vector[]> {
        if (!texts.length) return [];
        const model = createEmbeddingsModel();
        return await model.embedDocuments(texts);
    }

    // 计算 query 与候选向量的相似度并排序（返回 topK 下标+得分）
    rankBySimilarity(
        queryVector: Vector,
        candidates: Vector[],
        topK: number = 5
    ): Array<{ index: number; score: number }> {
        const scored = candidates.map((vec, idx) => ({
            index: idx,
            score: this.cosineSimilarity(queryVector, vec),
        }));

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK);
    }
}

export default new VectorService();
