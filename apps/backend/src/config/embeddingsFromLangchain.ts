import dotenv from "dotenv";
import {OpenAIEmbeddings} from "@langchain/openai";
import {OpenAI} from "openai";

dotenv.config();

export const embeddingsObj = new OpenAIEmbeddings({
    model: process.env.QWEN_EMBEDDING_MODEL,
    apiKey: process.env.QWEN_API_KEY,
    configuration: {
        baseURL: process.env.QWEN_BASE_URL
    }
});
// model: process.env.ZHIPU_EMBEDDING_MODEL,
// apiKey: process.env.ZHIPU_API_KEY,
// configuration: {
//     baseURL: process.env.ZHIPU_BASE_URL
// }
export const openaiQwen = new OpenAI({
    apiKey: process.env.QWEN_API_KEY,
    baseURL: process.env.QWEN_BASE_URL
});

export async function getEmbedding(texts: string[]):Promise<number[][]> {
    try {
        const completion = await openaiQwen.embeddings.create({
            model: 'text-embedding-v4',
            input: texts,
        });
        return completion.data.map((item)=>item.embedding)
    } catch (error) {
        console.error('Error:', error);
        return []
    }
}