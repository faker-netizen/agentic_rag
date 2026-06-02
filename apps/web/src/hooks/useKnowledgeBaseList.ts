import {useCallback, useContext, useEffect, useState} from "react";
import {
    createKnowledgeBase,
    listKnowledgeBases,
    type KnowledgeBase,
} from "@/service/knowledgeBaseApi.ts";
import {RequestError} from "@/service/request.ts";

function errMsg(e: unknown): string {
    return e instanceof RequestError ? e.message : "操作失败，请稍后重试";
}

export function useKnowledgeBaseList(autoLoad = true) {
    const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await listKnowledgeBases();
            setKbs(list);
            return list;
        } catch (e) {
            const msg = errMsg(e);
            setError(msg);
            setKbs([]);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (autoLoad) void refresh();
    }, [autoLoad, refresh]);

    return {kbs, loading, error, refresh};
}

export function useCreateKnowledgeBase(onSuccess?: (id: number) => void | Promise<void>) {
    const [submitting, setSubmitting] = useState(false);

    const create = useCallback(
        async (name: string, description?: string): Promise<number> => {
            setSubmitting(true);
            try {
                const id = await createKnowledgeBase(name, description);
                await onSuccess?.(id);
                return id;
            } catch (e) {
                throw new Error(errMsg(e));
            } finally {
                setSubmitting(false);
            }
        },
        [onSuccess]
    );

    return {create, submitting};
}
