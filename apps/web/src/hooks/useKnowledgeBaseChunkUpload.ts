import {useCallback, useRef, useState} from "react";
import {UPLOAD_CHUNK_SIZE, uploadDocument, type PendingChunkUploadView} from "@/service/knowledgeBaseApi.ts";
import {
    CLOSED_CHUNK,
    startChunkUploadTask,
    uploadErrMsg,
    type ChunkUploadState,
} from "@/hooks/knowledgeBaseUploadHelpers.ts";
import type {ChunkedUploadTask} from "@d2c/utils";

export function useKnowledgeBaseChunkUpload(
    kbId: number | null,
    refreshDocs: () => Promise<void>,
    refreshPending: () => Promise<void>
) {
    const [chunkUpload, setChunkUpload] = useState<ChunkUploadState>(CLOSED_CHUNK);
    const resumePendingRef = useRef<PendingChunkUploadView | null>(null);

    const runChunkedUpload = useCallback(
        async (file: File, pending?: PendingChunkUploadView) => {
            if (kbId == null) return;
            const syncProgress = (task: ChunkedUploadTask) => {
                setChunkUpload((prev) => ({...prev, snapshot: task.getSnapshot()}));
            };
            const {task, documentIdPromise} = await startChunkUploadTask(
                kbId,
                file,
                pending,
                syncProgress
            );
            setChunkUpload({open: true, fileName: file.name, task, snapshot: task.getSnapshot()});
            await documentIdPromise;
            setChunkUpload(CLOSED_CHUNK);
            await refreshDocs();
            await refreshPending();
        },
        [kbId, refreshDocs, refreshPending]
    );

    const uploadFile = useCallback(
        async (file: File) => {
            if (kbId == null) return;
            try {
                if (file.size <= UPLOAD_CHUNK_SIZE) {
                    await uploadDocument(kbId, file);
                    await refreshDocs();
                } else {
                    await runChunkedUpload(file);
                }
            } catch (e) {
                await refreshPending();
                throw new Error(uploadErrMsg(e));
            }
        },
        [kbId, refreshDocs, refreshPending, runChunkedUpload]
    );

    const resumePendingUpload = useCallback(
        async (file: File, pending: PendingChunkUploadView) => {
            try {
                await runChunkedUpload(file, pending);
            } catch (e) {
                await refreshPending();
                throw new Error(uploadErrMsg(e));
            }
        },
        [runChunkedUpload, refreshPending]
    );

    const closeChunkModal = useCallback(() => setChunkUpload(CLOSED_CHUNK), []);
    const prepareResumeUpload = useCallback((pending: PendingChunkUploadView) => {
        resumePendingRef.current = pending;
    }, []);
    const consumeResumePending = useCallback(() => {
        const pending = resumePendingRef.current;
        resumePendingRef.current = null;
        return pending;
    }, []);

    return {
        chunkUpload,
        uploadFile,
        resumePendingUpload,
        closeChunkModal,
        prepareResumeUpload,
        consumeResumePending,
    };
}
