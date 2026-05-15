import {OpenAI} from "openai";
import {qwenConfig} from "./qwen.js";

const client = new OpenAI({
    apiKey: qwenConfig.apiKey,
    baseURL: qwenConfig.baseURL,
});

export async function getEmbedding(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const completion = await client.embeddings.create({
        model: qwenConfig.embeddingModel,
        input: texts,
    });
    const sorted = [...completion.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    return sorted.map((item) => item.embedding);
}
