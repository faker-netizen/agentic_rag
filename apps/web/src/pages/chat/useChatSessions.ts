import {useCallback, useEffect, useState} from "react";
import {message} from "antd";
import {
    createChatSession,
    deleteChatSession,
    listChatSessions,
    type ChatSession,
} from "@/service/chatApi.ts";
import {listKnowledgeBases, type KnowledgeBase} from "@/service/knowledgeBaseApi.ts";
import {errText} from "@/pages/chat/chatUtils.ts";

export function useChatSessions() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [kbs, setKbs] = useState<KnowledgeBase[]>([]);

    const loadSessions = useCallback(async () => {
        setLoadingSessions(true);
        try {
            const list = await listChatSessions();
            setSessions(list);
            setSelectedId((prev) => {
                if (prev != null && list.some((s) => s.id === prev)) return prev;
                return list[0]?.id ?? null;
            });
        } catch (e) {
            message.error(errText(e));
        } finally {
            setLoadingSessions(false);
        }
    }, []);

    useEffect(() => {
        void loadSessions();
    }, [loadSessions]);

    const openCreate = async () => {
        setCreateOpen(true);
        try {
            setKbs(await listKnowledgeBases());
        } catch {
            setKbs([]);
        }
    };

    const onCreate = async (values: {knowledgeBaseId?: number; title?: string}) => {
        setCreateLoading(true);
        try {
            const id = await createChatSession({
                knowledgeBaseId: values.knowledgeBaseId,
                title: values.title,
            });
            message.success("已创建会话");
            setCreateOpen(false);
            await loadSessions();
            setSelectedId(id);
        } catch (e) {
            message.error(errText(e));
        } finally {
            setCreateLoading(false);
        }
    };

    const onDeleteSession = async (id: number) => {
        try {
            await deleteChatSession(id);
            message.success("已删除");
            if (selectedId === id) setSelectedId(null);
            await loadSessions();
        } catch (e) {
            message.error(errText(e));
        }
    };

    const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;

    return {
        sessions,
        selectedId,
        setSelectedId,
        loadingSessions,
        createOpen,
        setCreateOpen,
        createLoading,
        kbs,
        openCreate,
        onCreate,
        onDeleteSession,
        loadSessions,
        selectedSession,
    };
}
