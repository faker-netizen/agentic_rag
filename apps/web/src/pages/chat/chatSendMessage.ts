import {message} from "antd";
import type {ChatMessage} from "@/service/chatApi.ts";
import type {useRafStreamBuffer} from "@/hooks/useRafStreamBuffer.ts";
import {buildChatStreamHandlers, runChatStream} from "@/pages/chat/chatStreamHandlers.ts";
import {isAbortError, streamErrText} from "@/pages/chat/chatUtils.ts";

type StreamBuffer = ReturnType<typeof useRafStreamBuffer>;

export type SendMessageParams = {
    sessionId: number;
    text: string;
    skillId: string | null;
    streamBuffer: StreamBuffer;
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setStreamingAssistantId: (id: number | null) => void;
    setStreamStatus: (s: string | null) => void;
    setActiveSkillName: (s: string | null) => void;
    loadMessages: (id: number) => Promise<void>;
    loadSessions: () => Promise<void>;
    signal: AbortSignal;
};

export async function sendChatMessage(params: SendMessageParams): Promise<void> {
    const tempUser = -Date.now();
    const tempAsst = tempUser - 1;
    params.setStreamingAssistantId(tempAsst);
    params.streamBuffer.reset();
    const nowIso = new Date().toISOString();
    params.setMessages((prev) => [
        ...prev,
        {
            id: tempUser,
            session_id: params.sessionId,
            role: "user",
            content: params.text,
            sources_json: null,
            skill_id: params.skillId,
            created_at: nowIso,
        },
        {
            id: tempAsst,
            session_id: params.sessionId,
            role: "assistant",
            content: "",
            sources_json: null,
            created_at: nowIso,
        },
    ]);
    const handlers = buildChatStreamHandlers({
        tempUser,
        tempAsst,
        streamBuffer: params.streamBuffer,
        setMessages: params.setMessages,
        setStreamingAssistantId: params.setStreamingAssistantId,
        setStreamStatus: params.setStreamStatus,
        setActiveSkillName: params.setActiveSkillName,
    });
    try {
        await runChatStream({
            sessionId: params.sessionId,
            text: params.text,
            skillId: params.skillId,
            handlers,
            signal: params.signal,
        });
        await params.loadSessions();
    } catch (e) {
        if (isAbortError(e)) message.info("已停止生成");
        else message.error(streamErrText(e));
        await params.loadMessages(params.sessionId);
        await params.loadSessions();
        params.setStreamingAssistantId(null);
        params.setStreamStatus(null);
        params.setActiveSkillName(null);
        params.streamBuffer.reset();
    }
}
