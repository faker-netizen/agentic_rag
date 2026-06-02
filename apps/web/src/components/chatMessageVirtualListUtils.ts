import {useCallback, useEffect, useRef, useState} from "react";
import type {Virtualizer} from "@tanstack/react-virtual";
import type {ChatMessage} from "@/service/chatApi.ts";

const SCROLL_THRESHOLD = 2;

export function useChatMessageScroll(
    messages: ChatMessage[],
    streamingAssistantId: number | null,
    streamDisplay: string,
    virtualizer: Virtualizer<HTMLDivElement, Element>
) {
    const scrollToBottom = useCallback(
        (behavior: ScrollBehavior = "smooth") => {
            if (messages.length === 0) return;
            virtualizer.scrollToIndex(messages.length - 1, {align: "end", behavior});
        },
        [messages.length, virtualizer]
    );

    useEffect(() => {
        if (messages.length === 0) return;
        scrollToBottom(messages.length <= SCROLL_THRESHOLD ? "auto" : "smooth");
    }, [messages.length, scrollToBottom]);

    useEffect(() => {
        if (streamingAssistantId == null || !streamDisplay) return;
        scrollToBottom("auto");
    }, [streamDisplay, streamingAssistantId, scrollToBottom]);

    return scrollToBottom;
}

export function useScrollToBottomRaf() {
    const scrollRafRef = useRef<number | null>(null);

    return useCallback((scrollFn: () => void) => {
        if (scrollRafRef.current != null) return;
        scrollRafRef.current = requestAnimationFrame(() => {
            scrollRafRef.current = null;
            scrollFn();
        });
    }, []);
}
