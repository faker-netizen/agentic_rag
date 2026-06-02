import {useCallback, useEffect, useState} from "react";
import {
    cancelPendingUpload,
    syncPendingUploadsWithServer,
    type PendingChunkUploadView,
} from "@/service/knowledgeBaseApi.ts";

export function usePendingChunkUploads(kbId: number | null) {
    const [pendingUploads, setPendingUploads] = useState<PendingChunkUploadView[]>([]);

    const refreshPending = useCallback(async () => {
        if (kbId == null) return;
        try {
            const list = await syncPendingUploadsWithServer(kbId);
            setPendingUploads(list);
        } catch {
            setPendingUploads([]);
        }
    }, [kbId]);

    useEffect(() => {
        if (kbId == null) return;
        let active = true;
        void syncPendingUploadsWithServer(kbId)
            .then((list) => {
                if (active) setPendingUploads(list);
            })
            .catch(() => {
                if (active) setPendingUploads([]);
            });
        return () => {
            active = false;
        };
    }, [kbId]);

    const abandonPendingUpload = useCallback(
        async (fileId: string) => {
            if (kbId == null) return;
            await cancelPendingUpload(kbId, fileId);
            await refreshPending();
        },
        [kbId, refreshPending]
    );

    const visiblePending = kbId == null ? [] : pendingUploads;

    return {pendingUploads: visiblePending, refreshPending, abandonPendingUpload};
}
