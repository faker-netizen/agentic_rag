import http from "@/service/request.ts";
import {getAccessToken, setAccessToken} from "@/service/token.ts";

export type ChatSession = {
    id: number;
    user_id: number;
    knowledge_base_id: number | null;
    title: string;
    created_at: string;
    updated_at: string;
};

export type ChatMessage = {
    id: number;
    session_id: number;
    role: string;
    content: string;
    sources_json: unknown | null;
    created_at: string;
};

export type ChatSource = {id: number; title: string};

export async function listChatSessions(): Promise<ChatSession[]> {
    const res = await http.get<{success: boolean; sessions: ChatSession[]}>("/api/chat/sessions");
    return res.sessions ?? [];
}

export async function createChatSession(params: {
    knowledgeBaseId?: number;
    title?: string;
}): Promise<number> {
    const body: {knowledgeBaseId?: number; title?: string} = {};
    if (params.knowledgeBaseId != null) body.knowledgeBaseId = params.knowledgeBaseId;
    if (params.title?.trim()) body.title = params.title.trim();
    const res = await http.post<{success: boolean; sessionId: number}, typeof body>(
        "/api/chat/sessions",
        body
    );
    return res.sessionId;
}

export async function deleteChatSession(sessionId: number): Promise<void> {
    await http.delete<{success: boolean}>(`/api/chat/sessions/${sessionId}`);
}

export async function updateChatSessionTitle(sessionId: number, title: string): Promise<void> {
    await http.patch<{success: boolean}, {title: string}>(`/api/chat/sessions/${sessionId}`, {title});
}

export async function listChatMessages(sessionId: number): Promise<ChatMessage[]> {
    const res = await http.get<{success: boolean; messages: ChatMessage[]}>(
        `/api/chat/sessions/${sessionId}/messages`
    );
    return res.messages ?? [];
}

export type SendMessageResult = {
    userMessageId: number;
    assistantMessageId: number;
    answer: string;
    sources: ChatSource[] | null;
};

function apiBase(): string {
    return import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
}

async function refreshAccessToken(): Promise<boolean> {
    const res = await fetch(`${apiBase()}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {"Content-Type": "application/json"},
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {accessToken?: string};
    if (!data.accessToken) return false;
    setAccessToken(data.accessToken);
    return true;
}

async function readSse(
    body: ReadableStream<Uint8Array>,
    onEvent: (event: string, dataJson: string) => void
): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {stream: true});
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) >= 0) {
            const raw = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            let eventName = "message";
            const dataLines: string[] = [];
            for (const line of raw.split("\n")) {
                if (line.startsWith("event:")) eventName = line.slice(6).trim();
                else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^\s/, ""));
            }
            const payload = dataLines.join("\n");
            if (payload) onEvent(eventName, payload);
        }
    }
}

export type StreamChatHandlers = {
    onMeta: (p: {userMessageId: number}) => void;
    onSources: (p: {sources: ChatSource[] | null}) => void;
    onToken: (p: {text: string}) => void;
    /** 模型或落库失败时服务端推送；随后仍会 `onDone`（answer 为失败说明） */
    onError: (p: {message: string}) => void;
    onDone: (p: SendMessageResult) => void;
};

/**
 * 发送聊天消息（SSE）。需用 fetch 消费流；401 时会尝试 refresh 后重试一次。
 * 后端为 OpenAI 兼容流式（千问 compatible-mode）经 LangChain `stream` 转发。
 */
export async function streamChatMessage(
    sessionId: number,
    content: string,
    handlers: StreamChatHandlers,
    options?: {signal?: AbortSignal}
): Promise<void> {
    const url = `${apiBase()}/api/chat/sessions/${sessionId}/messages`;
    const signal = options?.signal;

    const run = async (retried: boolean): Promise<void> => {
        const token = getAccessToken();
        const headers: Record<string, string> = {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(url, {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify({content}),
            signal,
        });

        if (res.status === 401 && !retried) {
            const ok = await refreshAccessToken();
            if (ok) return run(true);
            throw new Error("登录已过期，请重新登录");
        }

        if (!res.ok || !res.body) {
            const t = await res.text().catch(() => "");
            throw new Error(t || `请求失败(${res.status})`);
        }

        await readSse(res.body, (event, dataStr) => {
            let data: Record<string, unknown>;
            try {
                data = JSON.parse(dataStr) as Record<string, unknown>;
            } catch {
                return;
            }
            if (event === "meta") handlers.onMeta({userMessageId: Number(data.userMessageId)});
            else if (event === "sources")
                handlers.onSources({sources: (data.sources as ChatSource[] | null) ?? null});
            else if (event === "token") handlers.onToken({text: String(data.text ?? "")});
            else if (event === "error") handlers.onError({message: String(data.message ?? "")});
            else if (event === "done") {
                handlers.onDone({
                    userMessageId: Number(data.userMessageId),
                    assistantMessageId: Number(data.assistantMessageId),
                    answer: String(data.answer ?? ""),
                    sources: (data.sources as ChatSource[] | null) ?? null,
                });
            }
        });
    };

    await run(false);
}
