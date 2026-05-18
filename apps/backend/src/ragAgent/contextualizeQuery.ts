import {ChatPromptTemplate} from "@langchain/core/prompts";
import {ChatOpenAI} from "@langchain/openai";
import {z} from "zod";
import {qwenConfig} from "../config/qwen.js";
import {formatHistoryBlock, type ChatTurn} from "../utils/chatHistory.js";

const RetrievalQuerySchema = z.object({
    searchQuery: z
        .string()
        .min(2)
        .max(200)
        .describe(
            "用于知识库向量检索的查询短语：关键词、实体名堆叠；禁止写成对用户问题的完整回答或陈述句结论"
        ),
});

function createLlm() {
    return new ChatOpenAI({
        apiKey: qwenConfig.apiKey,
        configuration: {baseURL: qwenConfig.baseURL},
        model: qwenConfig.chatModel,
        temperature: 0,
    });
}



/** 不经过 LLM：用上一轮主题 + 当前问句拼检索词 */
function fallbackRetrievalQuery(currentQuery: string, history: ChatTurn[]): string {
    const lastUser = [...history].reverse().find((h) => h.role === "user")?.content?.trim() ?? "";
    const parts = [lastUser, currentQuery.trim()].filter(Boolean);
    const merged = parts.join(" ");
    return merged.slice(0, 200);
}

/**
 * 将带指代的追问改写成可独立检索的查询（如「哪个是 ES6 提出的」→ `let const var ES6 引入`）。
 */
export async function contextualizeRagQuery(
    currentQuery: string,
    history: ChatTurn[],
    signal?: AbortSignal
): Promise<string> {
    const q = currentQuery.trim();
    if (!q || !history.length) return q;

    const historyText = formatHistoryBlock(history, {maxTurns: 6, maxCharsPerMessage: 800});
    const prompt = ChatPromptTemplate.fromMessages([
        [
            "system",
            "你是【检索查询】生成器，不是问答助手。输出仅用于向量相似度搜索，不展示给用户。\n\n" +
                "任务：根据【对话历史】（见下方 human）与【用户最新一句】，改写成一条检索用关键词短语。\n" +
                "主题、实体一律以对话历史为准；system 里的 JS 例子只是格式示范，不要照抄无关领域的词。\n\n" +
                "必须：补全指代；名词/术语堆叠或极短问句（约 8～40 字）；只表达「要搜什么」，禁止回答问题。\n\n" +
                "禁止：陈述句结论、教程式解释、礼貌套话。\n\n" +
                "格式示例（仅说明输入输出形态）：\n" +
                "用户最新：再和 X 比较一下 → … X 对比\n" +
                "用户最新：哪个是 Y 版本提出的 → … Y 版本 引入 哪个\n" +
                "错误示范：…是 A 和 B（这是答案，不是检索词）",
        ],
        ["human", "【对话历史】\n{history}\n\n【用户最新一句】\n{query}"],
    ]);

    const llm = createLlm().withStructuredOutput(RetrievalQuerySchema);
    const messages = await prompt.formatMessages({history: historyText, query: q});

    try {
        const out = await llm.invoke(messages, {signal});
        const candidate = out.searchQuery.trim();
        if (candidate) {
            console.log(candidate)
            return candidate.slice(0, 200);
        }
    } catch {
        /* 结构化失败则走 fallback */
    }

    return fallbackRetrievalQuery(q, history);
}
