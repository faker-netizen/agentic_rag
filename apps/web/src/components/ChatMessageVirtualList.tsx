import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    type CSSProperties,
} from "react";
import {useVirtualizer} from "@tanstack/react-virtual";
import {Empty} from "antd";
import type {ChatMessage} from "@/service/chatApi.ts";
import ChatMessageBubble from "@/components/ChatMessageBubble.tsx";

const ITEM_GAP = 16;
const ESTIMATE_ROW_HEIGHT = 96;

export type ChatMessageVirtualListHandle = {
    scrollToBottom: (behavior?: ScrollBehavior) => void;
};

export type ChatMessageVirtualListProps = {
    messages: ChatMessage[];
    loading?: boolean;
    streamingAssistantId: number | null;
    streamDisplay: string;
    style?: CSSProperties;
    className?: string;
};

const ChatMessageVirtualList = forwardRef<ChatMessageVirtualListHandle, ChatMessageVirtualListProps>(
    function ChatMessageVirtualList(
        {messages, loading = false, streamingAssistantId, streamDisplay, style, className},
        ref
    ) {
        const scrollRef = useRef<HTMLDivElement>(null);

        const virtualizer = useVirtualizer({
            count: messages.length,
            getScrollElement: () => scrollRef.current,
            estimateSize: () => ESTIMATE_ROW_HEIGHT,
            overscan: 6,
            gap: ITEM_GAP,
            getItemKey: (index) => messages[index]?.id ?? index,
        });

        const scrollToBottom = useCallback(
            (behavior: ScrollBehavior = "smooth") => {
                if (messages.length === 0) return;
                virtualizer.scrollToIndex(messages.length - 1, {align: "end", behavior});
            },
            [messages.length, virtualizer]
        );

        useImperativeHandle(ref, () => ({scrollToBottom}), [scrollToBottom]);

        useEffect(() => {
            if (messages.length === 0) return;
            scrollToBottom(messages.length <= 2 ? "auto" : "smooth");
        }, [messages.length, scrollToBottom]);

        useEffect(() => {
            if (streamingAssistantId == null || !streamDisplay) return;
            scrollToBottom("auto");
        }, [streamDisplay, streamingAssistantId, scrollToBottom]);

        if (messages.length === 0 && !loading) {
            return (
                <div
                    className={["chat-message-virtual-list", className].filter(Boolean).join(" ")}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        ...style,
                    }}
                >
                    <Empty description="发送第一条消息开始聊天" />
                </div>
            );
        }

        return (
            <div
                ref={scrollRef}
                className={["chat-message-virtual-list", className].filter(Boolean).join(" ")}
                style={{padding: 16, ...style}}
            >
                <div
                    style={{
                        height: virtualizer.getTotalSize(),
                        width: "100%",
                        position: "relative",
                    }}
                >
                    {virtualizer.getVirtualItems().map((row) => {
                        const message = messages[row.index];
                        if (!message) return null;
                        const isStreaming =
                            message.role === "assistant" &&
                            streamingAssistantId != null &&
                            message.id === streamingAssistantId;

                        return (
                            <div
                                key={row.key}
                                data-index={row.index}
                                ref={virtualizer.measureElement}
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    transform: `translateY(${row.start}px)`,
                                }}
                            >
                                <ChatMessageBubble
                                    message={message}
                                    isStreaming={isStreaming}
                                    streamDisplay={
                                        isStreaming ? streamDisplay : undefined
                                    }
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
);

export default ChatMessageVirtualList;
