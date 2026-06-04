import {useCallback, useEffect, useState} from "react";
import {
    deleteDocument,
    listDocuments,
    type KnowledgeBaseDocument,
} from "@/service/knowledgeBaseApi.ts";
import {RequestError} from "@/service/request.ts";

function errMsg(e: unknown): string {
    return e instanceof RequestError ? e.message : "操作失败，请稍后重试";
}

export function useKnowledgeBaseDocList(kbId: number | null) {
    const [docs, setDocs] = useState<KnowledgeBaseDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshDocs = useCallback(async (options?: {silent?: boolean}) => {
        if (kbId == null) {
            setDocs([]);
            return;
        }
        if (!options?.silent) {
            setLoading(true);
            setError(null);
        }
        try {
            const list = await listDocuments(kbId);
            setDocs(list);
        } catch (e) {
            if (!options?.silent) {
                setError(errMsg(e));
                setDocs([]);
            }
        } finally {
            if (!options?.silent) setLoading(false);
        }
    }, [kbId]);

    useEffect(() => {
        void refreshDocs();
    }, [refreshDocs]);

    const removeDocument = useCallback(
        async (doc: KnowledgeBaseDocument) => {
            if (kbId == null) return;
            try {
                await deleteDocument(kbId, doc.id);
                await refreshDocs();
            } catch (e) {
                throw new Error(errMsg(e));
            }
        },
        [kbId, refreshDocs]
    );

    return {docs, loading, error, refreshDocs, removeDocument};
}
