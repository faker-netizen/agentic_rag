import {useCallback, useRef, useState} from "react";
import type {ChatMessage} from "@/service/chatApi.ts";
import type {useRafStreamBuffer} from "@/hooks/useRafStreamBuffer.ts";
import {sendChatMessage} from "@/pages/chat/chatSendMessage.ts";

type StreamBuffer = ReturnType<typeof useRafStreamBuffer>;

type SendDeps = {
    selectedId: number | null;
    selectedSkillId: string | null;
    streamBuffer: StreamBuffer;
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    loadMessages: (id: number) => Promise<void>;
    loadSessions: () => Promise<void>;
};

export function useChatSend({
    selectedId,
    selectedSkillId,
    streamBuffer,
    setMessages,
    loadMessages,
    loadSessions,
}: SendDeps) {
    const streamAbortRef = useRef<AbortController | null>(null);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [streamingAssistantId, setStreamingAssistantId] = useState<number | null>(null);
    const [streamStatus, setStreamStatus] = useState<string | null>(null);
    const [activeSkillName, setActiveSkillName] = useState<string | null>(null);

    const onSend = useCallback(async () => {
        const text = input.trim();
        if (!selectedId || !text) return;
        setSending(true);
        setStreamStatus(null);
        setActiveSkillName(null);
        setInput("");
        const ac = new AbortController();
        streamAbortRef.current = ac;
        await sendChatMessage({
            sessionId: selectedId,
            text,
            skillId: selectedSkillId,
            streamBuffer,
            setMessages,
            setStreamingAssistantId,
            setStreamStatus,
            setActiveSkillName,
            loadMessages,
            loadSessions,
            signal: ac.signal,
        });
        streamAbortRef.current = null;
        setSending(false);
    }, [
        input,
        selectedId,
        selectedSkillId,
        streamBuffer,
        setMessages,
        loadMessages,
        loadSessions,
    ]);

    const onStopStream = useCallback(() => {
        streamAbortRef.current?.abort();
    }, []);

    return {
        input,
        setInput,
        sending,
        streamingAssistantId,
        streamStatus,
        activeSkillName,
        onSend,
        onStopStream,
    };
}
