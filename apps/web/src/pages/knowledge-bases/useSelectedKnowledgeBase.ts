import {useMemo, useState, useCallback} from "react";
import {deleteKnowledgeBase, type KnowledgeBase} from "@/service/knowledgeBaseApi.ts";
import {RequestError} from "@/service/request.ts";
import {message} from "antd";

function errMsg(e: unknown): string {
    return e instanceof RequestError ? e.message : "操作失败，请稍后重试";
}

export function useSelectedKnowledgeBase(kbs: KnowledgeBase[]) {
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const selectedKb = useMemo(() => {
        if (selectedId != null) {
            const found = kbs.find((k) => k.id === selectedId);
            if (found) return found;
        }
        return kbs[0] ?? null;
    }, [kbs, selectedId]);

    const setSelectedKb = useCallback((kb: KnowledgeBase) => {
        setSelectedId(kb.id);
    }, []);

    const deleteKb = useCallback(
        async (kb: KnowledgeBase, refresh: () => Promise<unknown>) => {
            try {
                await deleteKnowledgeBase(kb.id);
                message.success("已删除知识库");
                if (selectedId === kb.id) setSelectedId(null);
                await refresh();
            } catch (e) {
                message.error(errMsg(e));
            }
        },
        [selectedId]
    );

    return {selectedKb, setSelectedKb, deleteKb};
}
