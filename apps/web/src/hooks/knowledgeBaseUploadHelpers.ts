import type {ChunkedUploadTask, UploadTaskSnapshot} from "@d2c/utils";
import type {PendingChunkUploadView} from "@/service/knowledgeBaseApi.ts";
import {
    resumeChunkedDocumentUpload,
    startChunkedDocumentUpload,
} from "@/service/knowledgeBaseApi.ts";

export type ChunkUploadState = {
    open: boolean;
    fileName: string;
    task: ChunkedUploadTask | null;
    snapshot: UploadTaskSnapshot | null;
};

export const CLOSED_CHUNK: ChunkUploadState = {
    open: false,
    fileName: "",
    task: null,
    snapshot: null,
};

export function attachChunkProgressHandlers(
    task: ChunkedUploadTask,
    syncProgress: (task: ChunkedUploadTask) => void
) {
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
}

export async function startChunkUploadTask(
    kbId: number,
    file: File,
    pending: PendingChunkUploadView | undefined,
    syncProgress: (task: ChunkedUploadTask) => void
) {
    const {task, documentIdPromise} = pending
        ? resumeChunkedDocumentUpload(kbId, file, pending)
        : startChunkedDocumentUpload(kbId, file);
    attachChunkProgressHandlers(task, syncProgress);
    return {task, documentIdPromise};
}

export function uploadErrMsg(e: unknown): string {
    if (e && typeof e === "object" && "response" in e) {
        const data = (e as {response?: {data?: {error?: string}}}).response?.data;
        if (data?.error) return data.error;
    }
    if (e instanceof Error) return e.message;
    return "上传失败";
}
