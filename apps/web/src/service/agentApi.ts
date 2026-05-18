import http from "@/service/request.ts";

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

export type MiniAgentRunResult = {
    reply: string;
    steps: MiniAgentStep[];
    stoppedReason: "completed" | "max_steps" | "error";
    error?: string;
};

/** POST /api/agent/min — 后端 createAgent + Zod tools 演示（需登录） */
export async function runMinAgent(message: string, maxSteps?: number): Promise<MiniAgentRunResult> {
    const body: {message: string; maxSteps?: number} = {message: message.trim()};
    if (maxSteps != null && Number.isFinite(maxSteps) && maxSteps > 0) {
        body.maxSteps = Math.min(16, Math.floor(maxSteps));
    }
    const res = await http.post<
        MiniAgentRunResult & {success: boolean; userId?: number},
        typeof body
    >("/api/agent/min", body);
    return {
        reply: res.reply ?? "",
        steps: Array.isArray(res.steps) ? res.steps : [],
        stoppedReason: res.stoppedReason ?? "completed",
        error: res.error,
    };
}
