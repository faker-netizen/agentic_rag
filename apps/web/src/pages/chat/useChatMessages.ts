import {useCallback, useEffect, useState} from "react";
import {message} from "antd";
import {listChatMessages, type ChatMessage} from "@/service/chatApi.ts";
import {errText} from "@/pages/chat/chatUtils.ts";

export function useChatMessages(sessionId: number | null) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const loadMessages = useCallback(async (id: number) => {
        setLoadingMessages(true);
        try {
            const list = await listChatMessages(id);
            setMessages(list);
        } catch (e) {
            message.error(errText(e));
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    useEffect(() => {
        if (sessionId != null) void loadMessages(sessionId);
        else setMessages([]);
    }, [sessionId, loadMessages]);

    return {messages, setMessages, loadingMessages, loadMessages};
}
