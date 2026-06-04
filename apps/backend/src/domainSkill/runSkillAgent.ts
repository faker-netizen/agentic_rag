import {createAgent} from "langchain";
import {ChatOpenAI} from "@langchain/openai";
import {qwenConfig} from "../config/qwen.js";
import {DOMAIN_SKILL_MAX_AGENT_STEPS} from "../services/serviceConstants.js";
import {createKbSearchTool, type KbSearchState} from "./kbSearchTool.js";
import type {DomainSkillDef, SkillScope} from "./types.js";

const AGENT_BASE =
    "你是文档工作平台助手。需要检索知识库时必须调用 kb_search，不要编造检索结果。";

function createModel() {
    return new ChatOpenAI({
        apiKey: qwenConfig.apiKey,
        configuration: {baseURL: qwenConfig.baseURL},
        model: qwenConfig.chatModel,
        temperature: Number.isFinite(qwenConfig.temperature) ? qwenConfig.temperature : 0.2,
    });
}

export async function runSkillAgent(
    skill: DomainSkillDef,
    scope: SkillScope,
    query: string,
    signal?: AbortSignal
): Promise<KbSearchState> {
    const state: KbSearchState = {chunks: [], lastQuery: query};
    const kbTool = createKbSearchTool(scope, state);
    const system = [AGENT_BASE, skill.systemPolicy].filter(Boolean).join("\n");
    const agent = createAgent({
        model: createModel(),
        tools: [kbTool],
        systemPrompt: system,
    });
    const limit = Math.min(32, DOMAIN_SKILL_MAX_AGENT_STEPS * 4 + 2);
    await agent.invoke({messages: [{role: "user", content: query}]}, {recursionLimit: limit, signal});
    return state;
}
