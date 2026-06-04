import {message} from "antd";
import {streamChatMessage, type ChatMessage, type ChatSource} from "@/service/chatApi.ts";
import type {useRafStreamBuffer} from "@/hooks/useRafStreamBuffer.ts";

type StreamBuffer = ReturnType<typeof useRafStreamBuffer>;

export type StreamHandlerCtx = {
    tempUser: number;
    tempAsst: number;
    streamBuffer: StreamBuffer;
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setStreamingAssistantId: (id: number | null) => void;
    setStreamStatus: (s: string | null) => void;
    setActiveSkillName: (s: string | null) => void;
};

export function buildChatStreamHandlers(ctx: StreamHandlerCtx) {
    const {
        tempUser,
        tempAsst,
        streamBuffer,
        setMessages,
        setStreamingAssistantId,
        setStreamStatus,
        setActiveSkillName,
    } = ctx;
    return {
        onMeta: ({userMessageId}: {userMessageId: number}) => {
            setMessages((prev) =>
                prev.map((m) => (m.id === tempUser ? {...m, id: userMessageId} : m))
            );
        },
        onSkill: ({skillName}: {skillId: string; skillName: string}) => {
            setActiveSkillName(skillName);
        },
        onStatus: ({label}: {phase: string; label: string}) => {
            setStreamStatus(label);
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
            setStreamStatus(null);
            streamBuffer.append(delta);
        },
        onError: ({message: errMsg}: {message: string}) => {
            message.warning(errMsg);
            setStreamStatus(null);
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
                setStreamStatus(null);
                setActiveSkillName(null);
                streamBuffer.reset();
            });
        },
    };
}

export async function runChatStream(opts: {
    sessionId: number;
    text: string;
    skillId: string | null;
    handlers: ReturnType<typeof buildChatStreamHandlers>;
    signal: AbortSignal;
}): Promise<void> {
    await streamChatMessage(opts.sessionId, opts.text, opts.handlers, {
        signal: opts.signal,
        skillId: opts.skillId,
    });
}
