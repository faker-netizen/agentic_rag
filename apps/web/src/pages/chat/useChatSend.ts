import {useCallback, useRef, useState} from "react";
import {message} from "antd";
import {streamChatMessage, type ChatMessage, type ChatSource} from "@/service/chatApi.ts";
import type {useRafStreamBuffer} from "@/hooks/useRafStreamBuffer.ts";
import {errText, isAbortError} from "@/pages/chat/chatUtils.ts";

type StreamBuffer = ReturnType<typeof useRafStreamBuffer>;

type StreamHandlerCtx = {
    tempUser: number;
    tempAsst: number;
    streamBuffer: StreamBuffer;
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setStreamingAssistantId: (id: number | null) => void;
};

function buildStreamHandlers(ctx: StreamHandlerCtx) {
    const {tempUser, tempAsst, streamBuffer, setMessages, setStreamingAssistantId} = ctx;
    return {
        onMeta: ({userMessageId}: {userMessageId: number}) => {
            setMessages((prev) =>
                prev.map((m) => (m.id === tempUser ? {...m, id: userMessageId} : m))
            );
        },
        onSources: ({sources}: {sources: ChatSource[] | null}) => {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === tempAsst
                        ? {...m, sources_json: sources?.length ? JSON.stringify(sources) : null}
                        : m
                )
            );
        },
        onToken: ({text: delta}: {text: string}) => {
            streamBuffer.append(delta);
        },
        onError: ({message: errMsg}: {message: string}) => {
            message.warning(errMsg);
        },
        onDone: (r: {assistantMessageId: number; answer: string; sources: ChatSource[] | null}) => {
            streamBuffer.flush(r.answer);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === tempAsst
                        ? {
                              ...m,
                              id: r.assistantMessageId,
                              content: r.answer,
                              sources_json: r.sources?.length ? JSON.stringify(r.sources) : null,
                          }
                        : m
                )
            );
            requestAnimationFrame(() => {
                setStreamingAssistantId(null);
                streamBuffer.reset();
            });
        },
    };
}

type SendDeps = {
    selectedId: number | null;
    streamBuffer: StreamBuffer;
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    loadMessages: (id: number) => Promise<void>;
    loadSessions: () => Promise<void>;
};

export function useChatSend({
    selectedId,
    streamBuffer,
    setMessages,
    loadMessages,
    loadSessions,
}: SendDeps) {
    const streamAbortRef = useRef<AbortController | null>(null);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [streamingAssistantId, setStreamingAssistantId] = useState<number | null>(null);

    const onSend = useCallback(async () => {
        const text = input.trim();
        if (!selectedId || !text) return;
        setSending(true);
        const tempUser = -Date.now();
        const tempAsst = tempUser - 1;
        setStreamingAssistantId(tempAsst);
        streamBuffer.reset();
        const nowIso = new Date().toISOString();
        setMessages((prev) => [
            ...prev,
            {
                id: tempUser,
                session_id: selectedId,
                role: "user",
                content: text,
                sources_json: null,
                created_at: nowIso,
            },
            {
                id: tempAsst,
                session_id: selectedId,
                role: "assistant",
                content: "",
                sources_json: null,
                created_at: nowIso,
            },
        ]);
        setInput("");
        const ac = new AbortController();
        streamAbortRef.current = ac;
        const handlers = buildStreamHandlers({
            tempUser,
            tempAsst,
            streamBuffer,
            setMessages,
            setStreamingAssistantId,
        });
        try {
            await streamChatMessage(selectedId, text, handlers, {signal: ac.signal});
            await loadSessions();
        } catch (e) {
            if (isAbortError(e)) {
                message.info("已停止生成");
                await loadMessages(selectedId);
                await loadSessions();
            } else {
                message.error(errText(e));
                await loadMessages(selectedId);
            }
            setStreamingAssistantId(null);
            streamBuffer.reset();
        } finally {
            streamAbortRef.current = null;
            setSending(false);
        }
    }, [input, selectedId, streamBuffer, setMessages, loadMessages, loadSessions]);

    const onStopStream = useCallback(() => {
        streamAbortRef.current?.abort();
    }, []);

    return {input, setInput, sending, streamingAssistantId, onSend, onStopStream};
}
