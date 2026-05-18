export type ChatTurn = {role: "user" | "assistant"; content: string};

const DEFAULT_MAX_TURNS = 10;
const DEFAULT_MAX_CHARS_PER_MSG = 1500;

export function truncateChatContent(text: string, maxChars: number): string {
    const t = text.trim();
    if (t.length <= maxChars) return t;
    return `${t.slice(0, maxChars)}…`;
}

/** 格式化为 prompt 中的对话历史块（不含本轮用户句） */
export function formatHistoryBlock(
    history: ChatTurn[],
    opts?: {maxTurns?: number; maxCharsPerMessage?: number}
): string {
    const maxTurns = opts?.maxTurns ?? DEFAULT_MAX_TURNS;
    const maxChars = opts?.maxCharsPerMessage ?? DEFAULT_MAX_CHARS_PER_MSG;
    const slice = history.slice(-maxTurns);
    if (!slice.length) return "";
    return slice
        .map((h) => {
            const label = h.role === "user" ? "用户" : "助手";
            return `${label}：${truncateChatContent(h.content, maxChars)}`;
        })
        .join("\n\n");
}
