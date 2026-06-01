import {OpenAI} from "openai";
import {qwenConfig} from "./qwen.js";

const client = new OpenAI({
    apiKey: qwenConfig.apiKey,
    baseURL: qwenConfig.baseURL,
});

/** 通义 embedding API 单次 input 条数上限 */
const EMBEDDING_BATCH_SIZE = 10;

export async function getEmbedding(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];

    const vectors: number[][] = [];
    for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
        const completion = await client.embeddings.create({
            model: qwenConfig.embeddingModel,
            input: batch,
        });
        const sorted = [...completion.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        vectors.push(...sorted.map((item) => item.embedding));
    }
    return vectors;
}
