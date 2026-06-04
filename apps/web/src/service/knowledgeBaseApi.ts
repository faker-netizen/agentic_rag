import axios from "axios";
import {ChunkedUploadSDK, type ChunkedUploadTask} from "@d2c/utils";
import http from "@/service/request.ts";
import {apiBase, refreshAccessToken} from "@/service/authRefresh.ts";
import {getAccessToken} from "@/service/token.ts";
import {createKnowledgeBaseChunkUploadApi, fetchChunkUploadStatus} from "@/service/chunkUploadApi.ts";
import {
    fileMatchesPending,
    listPendingUploadsForKb,
    removePendingUpload,
    savePendingUpload,
    type PendingChunkUpload,
} from "@/service/uploadSessionStorage.ts";

export type KnowledgeBase = {
    id: number;
    user_id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
};

export type DocumentIndexingStatus = "none" | "pending" | "indexed" | "failed";
export type DocumentSummaryStatus = "none" | "pending" | "ready" | "failed";

export type KnowledgeBaseDocument = {
    id: number;
    user_id: number;
    knowledge_base_id: number;
    title: string;
    file_path?: string | null;
    file_type?: string | null;
    indexing_status: DocumentIndexingStatus;
    summary_status: DocumentSummaryStatus;
    summary_preview?: string | null;
    created_at: string;
    updated_at: string;
};

export async function listKnowledgeBases(): Promise<KnowledgeBase[]> {
    const res = await http.get<{success: boolean; knowledgeBases: KnowledgeBase[]}>("/api/knowledge-bases");
    return res.knowledgeBases ?? [];
}

export async function createKnowledgeBase(name: string, description?: string): Promise<number> {
    const res = await http.post<{success: boolean; id: number}, {name: string; description?: string}>(
        "/api/knowledge-bases",
        {name, ...(description ? {description} : {})}
    );
    return res.id;
}

export async function deleteKnowledgeBase(kbId: number): Promise<void> {
    await http.delete<{success: boolean}>(`/api/knowledge-bases/${kbId}`);
}

export async function listDocuments(kbId: number): Promise<KnowledgeBaseDocument[]> {
    const res = await http.get<{success: boolean; documents: KnowledgeBaseDocument[]}>(
        `/api/knowledge-bases/${kbId}/documents`
    );
    return res.documents ?? [];
}

export async function deleteDocument(kbId: number, documentId: number): Promise<void> {
    await http.delete<{success: boolean}>(`/api/knowledge-bases/${kbId}/documents/${documentId}`);
}

export async function requestDocumentSummarize(kbId: number, documentId: number): Promise<void> {
    await http.post<{success: boolean}>(
        `/api/knowledge-bases/${kbId}/documents/${documentId}/summarize`,
        {}
    );
}

export async function requestDocumentIndex(kbId: number, documentId: number): Promise<void> {
    await http.post<{success: boolean}>(
        `/api/knowledge-bases/${kbId}/documents/${documentId}/index`,
        {}
    );
}

function uploadErrorMessage(data: unknown, fallback: string): string {
    if (data && typeof data === "object") {
        const o = data as {error?: string; message?: string};
        if (o.error) return o.error;
        if (o.message) return o.message;
    }
    return fallback;
}

/** 演示用分片大小（1KB），便于观察多分片进度与断点续传 */
export const UPLOAD_CHUNK_SIZE = 1024;

/** 不超过该大小走直传；超过则走分片（演示时与分片大小对齐） */
const SIMPLE_UPLOAD_MAX = UPLOAD_CHUNK_SIZE;

export type ChunkedUploadHandle = {
    task: ChunkedUploadTask;
    documentIdPromise: Promise<number>;
};

export type {PendingChunkUpload};

function persistPendingFromSession(kbId: number, file: File, title: string | undefined) {
    return (info: {
        fileId: string;
        fileName: string;
        fileSize: number;
        chunkSize: number;
        totalChunks: number;
        fileHash?: string;
    }) => {
        savePendingUpload({
            fileId: info.fileId,
            kbId,
            fileName: info.fileName,
            fileSize: info.fileSize,
            chunkSize: info.chunkSize,
            totalChunks: info.totalChunks,
            lastModified: file.lastModified,
            title: title?.trim() || file.name,
            fileHash: info.fileHash,
            updatedAt: new Date().toISOString(),
        });
    };
}

/** 分片上传（断点续传 / 秒传 / 进度），返回 task 供 UI 绑定 */
export function startChunkedDocumentUpload(
    kbId: number,
    file: File,
    title?: string,
    options?: {resumeFileId?: string}
): ChunkedUploadHandle {
    const api = createKnowledgeBaseChunkUploadApi(kbId, title);
    let resolveId!: (id: number) => void;
    let rejectId!: (reason?: unknown) => void;
    const documentIdPromise = new Promise<number>((resolve, reject) => {
        resolveId = resolve;
        rejectId = reject;
    });

    const onSessionReady = persistPendingFromSession(kbId, file, title);

    const sdk = new ChunkedUploadSDK(api);
    const task = sdk.createTask(file, {
        autoStart: false,
        chunkSize: UPLOAD_CHUNK_SIZE,
        resumeFileId: options?.resumeFileId,
        biz: {title: title?.trim() || file.name},
        onSessionReady,
        onSuccess: (result, snap) => {
            if (snap.fileId) removePendingUpload(snap.fileId);
            if (result.documentId != null) resolveId(result.documentId);
            else rejectId(new Error("上传完成但缺少 documentId"));
        },
        onError: (err, snap) => {
            if (snap.fileId) onSessionReady({
                fileId: snap.fileId,
                fileName: file.name,
                fileSize: file.size,
                chunkSize: UPLOAD_CHUNK_SIZE,
                totalChunks: Math.ceil(file.size / UPLOAD_CHUNK_SIZE),
            });
            rejectId(err);
        },
        onStatusChange: (status, snap) => {
            if (status === "canceled" && snap.fileId) removePendingUpload(snap.fileId);
        },
    });
    void task.start().catch(rejectId);
    return {task, documentIdPromise};
}

/** 本地未完成上传列表（需配合服务端 status 校验） */
export function getLocalPendingUploads(kbId: number): PendingChunkUpload[] {
    return listPendingUploadsForKb(kbId);
}

export type PendingChunkUploadView = PendingChunkUpload & {
    uploadedChunks: number;
};

/** 校验服务端任务仍有效，剔除已过期记录 */
export async function syncPendingUploadsWithServer(kbId: number): Promise<PendingChunkUploadView[]> {
    const local = listPendingUploadsForKb(kbId);
    const valid: PendingChunkUploadView[] = [];
    for (const p of local) {
        try {
            const status = await fetchChunkUploadStatus(kbId, p.fileId);
            if (!status) {
                removePendingUpload(p.fileId);
                continue;
            }
            valid.push({
                ...p,
                uploadedChunks: status.uploadedChunkIndexes.length,
            });
        } catch {
            valid.push({...p, uploadedChunks: 0});
        }
    }
    return valid;
}

export async function cancelPendingUpload(kbId: number, fileId: string): Promise<void> {
    const api = createKnowledgeBaseChunkUploadApi(kbId);
    if (api.cancel) await api.cancel({fileId});
    removePendingUpload(fileId);
}

/** 刷新后续传：需用户重新选择同一文件 */
export function resumeChunkedDocumentUpload(
    kbId: number,
    file: File,
    pending: PendingChunkUpload
): ChunkedUploadHandle {
    const mismatch = fileMatchesPending(file, pending);
    if (mismatch) {
        throw new Error(mismatch);
    }
    if (pending.chunkSize !== UPLOAD_CHUNK_SIZE) {
        throw new Error("当前分片大小与未完成上传不一致，无法续传");
    }
    return startChunkedDocumentUpload(kbId, file, pending.title, {resumeFileId: pending.fileId});
}

export function discardPendingUpload(fileId: string): void {
    removePendingUpload(fileId);
}

async function uploadDocumentSimple(kbId: number, file: File, title?: string): Promise<number> {
    const titleVal = (title?.trim() || file.name).trim();

    const postOnce = () => {
        const form = new FormData();
        form.append("file", file);
        form.append("title", titleVal);
        const token = getAccessToken();
        return axios.post<{success: boolean; documentId: number; message?: string; error?: string}>(
            `${apiBase()}/api/knowledge-bases/${kbId}/upload`,
            form,
            {
                withCredentials: true,
                timeout: 120_000,
                headers: token ? {Authorization: `Bearer ${token}`} : {},
            }
        );
    };

    const parse = (data: {success?: boolean; documentId?: number; message?: string; error?: string}) => {
        if (!data?.success || data.documentId == null) {
            throw new Error(uploadErrorMessage(data, "上传失败"));
        }
        return data.documentId;
    };

    try {
        const res = await postOnce();
        return parse(res.data);
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 401) {
            const ok = await refreshAccessToken();
            if (!ok) throw new Error("登录已过期，请重新登录");
            const res = await postOnce();
            return parse(res.data);
        }
        if (axios.isAxiosError(e)) {
            throw new Error(uploadErrorMessage(e.response?.data, e.message || "上传失败"));
        }
        throw e;
    }
}

/** 知识库文档上传：小文件直传，大文件分片 */
export async function uploadDocument(kbId: number, file: File, title?: string): Promise<number> {
    if (file.size <= SIMPLE_UPLOAD_MAX) {
        return uploadDocumentSimple(kbId, file, title);
    }
    const {documentIdPromise} = startChunkedDocumentUpload(kbId, file, title);
    return documentIdPromise;
}
