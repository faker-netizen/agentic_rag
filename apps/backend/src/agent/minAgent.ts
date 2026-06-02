/**
 * 最小 Agent：`langchain` 的 **createAgent**（内置 ReAct / tool 调度），工具仍用 Zod + `tool` 定义。
 * 与业务 RAG/会话解耦，仅供演示与联调。
 */
import {createAgent} from "langchain";
import {AIMessage, BaseMessage, isAIMessage, isToolMessage} from "@langchain/core/messages";
import {tool} from "@langchain/core/tools";
import {ChatOpenAI} from "@langchain/openai";
import {z} from "zod";
import {qwenConfig} from "../config/qwen.js";

const MAX_STEPS_DEFAULT = 8;

export type MiniAgentToolCallRecord = {
    id: string;
    name: string;
    arguments: string;
};

export type MiniAgentStep = {
    stepIndex: number;
    assistantText: string | null;
    tool_calls?: MiniAgentToolCallRecord[];
    toolResults?: Array<{tool_call_id: string; content: string}>;
};

export type MiniAgentResult = {
    reply: string;
    steps: MiniAgentStep[];
    stoppedReason: "completed" | "max_steps" | "error";
    error?: string;
};

const getServerTimeSchema = z.object({});

const addIntegersSchema = z.object({
    a: z.number().int().describe("第一个整数"),
    b: z.number().int().describe("第二个整数"),
});

const reverseStringSchema = z.object({
    text: z.string().describe("要反转的文本"),
});

const getServerTimeTool = tool(
    async (_input: z.infer<typeof getServerTimeSchema>) => {
        return JSON.stringify({iso: new Date().toISOString()});
    },
    {
        name: "get_server_time",
        description: "返回当前服务器时间的 ISO8601 字符串，用于演示需要「当前时间」的问题。",
        schema: getServerTimeSchema,
    }
);

const addIntegersTool = tool(
    async ({a, b}: z.infer<typeof addIntegersSchema>) => {
        return JSON.stringify({result: a + b});
    },
    {
        name: "add_integers",
        description: "计算两个整数的和。",
        schema: addIntegersSchema,
    }
);

const reverseStringTool = tool(
    async ({text}: z.infer<typeof reverseStringSchema>) => {
        return JSON.stringify({result: [...text].reverse().join("")});
    },
    {
        name: "reverse_string",
        description: "将输入字符串按字符反转后返回（演示字符串工具）。",
        schema: reverseStringSchema,
    }
);

export const miniAgentTools = [getServerTimeTool, addIntegersTool, reverseStringTool] as const;

const DEFAULT_SYSTEM =
    "你是演示用助手。需要当前时间、整数加法或字符串反转时，必须调用提供的工具，不要编造工具结果。回答保持简洁。";

function createModel() {
    return new ChatOpenAI({
        apiKey: qwenConfig.apiKey,
        configuration: {baseURL: qwenConfig.baseURL},
        model: qwenConfig.chatModel,
        temperature: Number.isFinite(qwenConfig.temperature) ? qwenConfig.temperature : 0.2,
    });
}

function messageText(msg: BaseMessage): string {
    if (!isAIMessage(msg)) return "";
    const c = msg.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
        return c
            .map((b) => {
                if (typeof b === "string") return b;
                if (b && typeof b === "object" && "text" in b) return String((b as {text?: string}).text ?? "");
                return "";
            })
            .join("");
    }
    return "";
}

function toolCallsToRecords(ai: AIMessage): MiniAgentToolCallRecord[] {
    const raw = ai.tool_calls;
    if (!raw?.length) return [];
    return raw.map((tc) => ({
        id: tc.id ?? "",
        name: tc.name,
        arguments: JSON.stringify(tc.args ?? {}),
    }));
}

/**
 * 从 createAgent 返回的 messages 中还原「每轮 AI + 可选 tool 结果」便于 HTTP 调试展示。
 */
function buildStepsFromMessages(messages: BaseMessage[]): MiniAgentStep[] {
    const steps: MiniAgentStep[] = [];
    for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (!isAIMessage(m)) continue;

        if (m.tool_calls?.length) {
            const expected = new Set(m.tool_calls.map((tc) => tc.id).filter(Boolean));
            const toolResults: Array<{tool_call_id: string; content: string}> = [];
            for (let j = i + 1; j < messages.length; j++) {
                const t = messages[j];
                if (isToolMessage(t)) {
                    const id = t.tool_call_id ?? "";
                    if (expected.has(id)) {
                        const content =
                            typeof t.content === "string" ? t.content : JSON.stringify(t.content);
                        toolResults.push({tool_call_id: id, content});
                    }
                    if (toolResults.length >= expected.size) break;
                } else if (isAIMessage(t)) {
                    break;
                }
            }
            steps.push({
                stepIndex: steps.length,
                assistantText: messageText(m) || null,
                tool_calls: toolCallsToRecords(m),
                toolResults,
            });
        } else {
            steps.push({
                stepIndex: steps.length,
                assistantText: messageText(m) || null,
            });
        }
    }
    return steps;
}

function lastAiText(messages: BaseMessage[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (isAIMessage(m) && !m.tool_calls?.length) {
            return messageText(m);
        }
    }
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (isAIMessage(m)) return messageText(m);
    }
    return "";
}

function mapMiniAgentFailure(e: unknown): Pick<MiniAgentResult, "reply" | "steps" | "stoppedReason" | "error"> {
    const msg = e instanceof Error ? e.message : String(e);
    const hitLimit =
        /recursion/i.test(msg) || /GRAPH_RECURSION_LIMIT/i.test(msg) || /maximum/i.test(msg);
    return {
        reply: "",
        steps: [],
        stoppedReason: hitLimit ? "max_steps" : "error",
        error: hitLimit ? undefined : msg,
    };
}

/**
 * 单用户轮：由 createAgent 负责 tool_calls 循环；本函数只做入参、recursionLimit 与结果整理。
 */
export async function runMiniAgent(
    userMessage: string,
    options?: {maxSteps?: number; systemPrompt?: string}
): Promise<MiniAgentResult> {
    if (!qwenConfig.apiKey) {
        return {
            reply: "",
            steps: [],
            stoppedReason: "error",
            error: "QWEN_API_KEY 未配置",
        };
    }

    const maxSteps = options?.maxSteps ?? MAX_STEPS_DEFAULT;
    const recursionLimit = Math.min(64, Math.max(6, maxSteps * 4 + 2));
    const model = createModel();
    const agent = createAgent({
        model,
        tools: [...miniAgentTools],
        systemPrompt: options?.systemPrompt ?? DEFAULT_SYSTEM,
    });

    try {
        const result = (await agent.invoke(
            {messages: [{role: "user", content: userMessage}]},
            {recursionLimit}
        )) as {messages?: BaseMessage[]};

        const messages = result.messages ?? [];
        return {
            reply: lastAiText(messages),
            steps: buildStepsFromMessages(messages),
            stoppedReason: "completed",
        };
    } catch (e) {
        return mapMiniAgentFailure(e);
    }
}
