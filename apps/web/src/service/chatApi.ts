import http from "@/service/request.ts";
import {apiBase, refreshAccessToken} from "@/service/authRefresh.ts";
import {getAccessToken} from "@/service/token.ts";
import {fetchSsePost} from "@/service/sseClient.ts";

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

export type StreamChatHandlers = {
    onMeta: (p: {userMessageId: number}) => void;
    onSources: (p: {sources: ChatSource[] | null}) => void;
    onToken: (p: {text: string}) => void;
    onError: (p: {message: string}) => void;
    onAborted?: (p: {stopped?: boolean}) => void;
    onDone: (p: SendMessageResult) => void;
};

/** POST /api/chat/sessions/:id/messages — SSE */
export async function streamChatMessage(
    sessionId: number,
    content: string,
    handlers: StreamChatHandlers,
    options?: {signal?: AbortSignal}
): Promise<void> {
    const url = `${apiBase()}/api/chat/sessions/${sessionId}/messages`;

    await fetchSsePost(
        url,
        {content},
        (event, data) => {
            if (event === "meta") handlers.onMeta({userMessageId: Number(data.userMessageId)});
            else if (event === "sources")
                handlers.onSources({sources: (data.sources as ChatSource[] | null) ?? null});
            else if (event === "token") handlers.onToken({text: String(data.text ?? "")});
            else if (event === "error") handlers.onError({message: String(data.message ?? "")});
            else if (event === "aborted") handlers.onAborted?.({stopped: Boolean(data.stopped)});
            else if (event === "done") {
                handlers.onDone({
                    userMessageId: Number(data.userMessageId),
                    assistantMessageId: Number(data.assistantMessageId),
                    answer: String(data.answer ?? ""),
                    sources: (data.sources as ChatSource[] | null) ?? null,
                });
            }
        },
        {
            getToken: getAccessToken,
            refreshToken: refreshAccessToken,
            signal: options?.signal,
        }
    );
}
