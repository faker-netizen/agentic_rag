import dotenv from "dotenv";

dotenv.config();

/** 通义千问 — DashScope OpenAI 兼容模式（聊天 + 向量同一 baseURL / API Key） */
export const qwenConfig = {
    apiKey: process.env.QWEN_API_KEY ?? "",
    baseURL: (
        process.env.QWEN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1"
    ).replace(/\/+$/, ""),
    chatModel: process.env.QWEN_CHAT_MODEL ?? "qwen-plus",
    embeddingModel: process.env.QWEN_EMBEDDING_MODEL ?? "text-embedding-v4",
    temperature: Number(process.env.QWEN_CHAT_TEMPERATURE ?? "0.2"),
};
