import {useCallback, useEffect, useRef, useState} from "react";
import {
    cancelPendingUpload,
    deleteDocument,
    listDocuments,
    resumeChunkedDocumentUpload,
    startChunkedDocumentUpload,
    syncPendingUploadsWithServer,
    UPLOAD_CHUNK_SIZE,
    uploadDocument,
    type KnowledgeBaseDocument,
    type PendingChunkUploadView,
} from "@/service/knowledgeBaseApi.ts";
import {RequestError} from "@/service/request.ts";
import type {ChunkedUploadTask, UploadTaskSnapshot} from "@d2c/utils";

function errMsg(e: unknown): string {
    return e instanceof RequestError ? e.message : "操作失败，请稍后重试";
}

function uploadErrMsg(e: unknown): string {
    if (e && typeof e === "object" && "response" in e) {
        const data = (e as {response?: {data?: {error?: string}}}).response?.data;
        if (data?.error) return data.error;
    }
    if (e instanceof Error) return e.message;
    return "上传失败";
}

export type ChunkUploadState = {
    open: boolean;
    fileName: string;
    task: ChunkedUploadTask | null;
    snapshot: UploadTaskSnapshot | null;
};

const CLOSED_CHUNK: ChunkUploadState = {
    open: false,
    fileName: "",
    task: null,
    snapshot: null,
};

export function useKnowledgeBaseDocuments(kbId: number | null) {
    const [docs, setDocs] = useState<KnowledgeBaseDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingUploads, setPendingUploads] = useState<PendingChunkUploadView[]>([]);
    const [chunkUpload, setChunkUpload] = useState<ChunkUploadState>(CLOSED_CHUNK);
    const resumePendingRef = useRef<PendingChunkUploadView | null>(null);

    const refreshDocs = useCallback(async () => {
        if (kbId == null) {
            setDocs([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const list = await listDocuments(kbId);
            setDocs(list);
        } catch (e) {
            setError(errMsg(e));
            setDocs([]);
        } finally {
            setLoading(false);
        }
    }, [kbId]);

    const refreshPending = useCallback(async () => {
        if (kbId == null) {
            setPendingUploads([]);
            return;
        }
        try {
            const list = await syncPendingUploadsWithServer(kbId);
            setPendingUploads(list);
        } catch {
            setPendingUploads([]);
        }
    }, [kbId]);

    useEffect(() => {
        void refreshDocs();
    }, [refreshDocs]);

    useEffect(() => {
        void refreshPending();
    }, [refreshPending]);

    const runChunkedUpload = useCallback(
        async (file: File, pending?: PendingChunkUploadView) => {
            if (kbId == null) return;
            const syncProgress = (task: ChunkedUploadTask) => {
                setChunkUpload((prev) => ({...prev, snapshot: task.getSnapshot()}));
            };
            const {task, documentIdPromise} = pending
                ? resumeChunkedDocumentUpload(kbId, file, pending)
                : startChunkedDocumentUpload(kbId, file);
            const prev = {...task.options};
            task.options.onProgress = (snap) => {
                prev.onProgress?.(snap);
                syncProgress(task);
            };
            task.options.onStatusChange = (st, snap) => {
                prev.onStatusChange?.(st, snap);
                syncProgress(task);
            };
            task.options.onSuccess = (r, snap) => {
                prev.onSuccess?.(r, snap);
                syncProgress(task);
            };
            task.options.onError = (err, snap) => {
                prev.onError?.(err, snap);
                syncProgress(task);
            };
            setChunkUpload({
                open: true,
                fileName: file.name,
                task,
                snapshot: task.getSnapshot(),
            });
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

    const abandonPendingUpload = useCallback(
        async (fileId: string) => {
            if (kbId == null) return;
            await cancelPendingUpload(kbId, fileId);
            await refreshPending();
        },
        [kbId, refreshPending]
    );

    const closeChunkModal = useCallback(() => {
        setChunkUpload(CLOSED_CHUNK);
    }, []);

    const prepareResumeUpload = useCallback((pending: PendingChunkUploadView) => {
        resumePendingRef.current = pending;
    }, []);

    const consumeResumePending = useCallback(() => {
        const pending = resumePendingRef.current;
        resumePendingRef.current = null;
        return pending;
    }, []);

    return {
        docs,
        loading,
        error,
        pendingUploads,
        chunkUpload,
        refreshDocs,
        uploadFile,
        removeDocument,
        resumePendingUpload,
        abandonPendingUpload,
        closeChunkModal,
        prepareResumeUpload,
        consumeResumePending,
    };
}
