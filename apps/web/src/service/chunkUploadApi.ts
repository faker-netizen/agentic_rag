import axios from "axios";
import type {UploadApi} from "@d2c/utils";
import {apiBase, refreshAccessToken} from "@/service/authRefresh.ts";
import {getAccessToken} from "@/service/token.ts";

type PrepareRes = {
    success: boolean;
    fileId: string;
    uploadedChunkIndexes: number[];
    instant?: boolean;
    documentId?: number;
};

type MergeRes = {
    success: boolean;
    fileId: string;
    documentId: number;
    fileUrl?: string;
};

export type ChunkUploadStatusRes = {
    success: boolean;
    fileId: string;
    uploadedChunkIndexes: number[];
    fileName: string;
    fileSize: number;
    chunkSize: number;
    totalChunks: number;
    status: string;
};

async function withAuthRetry<T>(run: () => Promise<T>): Promise<T> {
    try {
        return await run();
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 401) {
            const ok = await refreshAccessToken();
            if (!ok) throw new Error("登录已过期，请重新登录");
            return await run();
        }
        throw e;
    }
}

function errMessage(e: unknown): string {
    if (axios.isAxiosError(e)) {
        const data = e.response?.data as {error?: string; message?: string} | undefined;
        return data?.error || data?.message || e.message || "请求失败";
    }
    return e instanceof Error ? e.message : "请求失败";
}

function authHeaders(): Record<string, string> {
    const token = getAccessToken();
    return token ? {Authorization: `Bearer ${token}`} : {};
}

type ChunkApiContext = {
    base: string;
    bizTitle?: string;
};

async function prepareUpload(
    ctx: ChunkApiContext,
    params: Parameters<UploadApi["prepare"]>[0]
) {
    return withAuthRetry(async () => {
        const res = await axios.post<PrepareRes>(
            `${ctx.base}/prepare`,
            {
                fileName: params.fileName,
                fileSize: params.fileSize,
                chunkSize: params.chunkSize,
                totalChunks: params.totalChunks,
                fileHash: params.fileHash,
                fileId: params.fileId,
                title: (params.biz?.title as string) || ctx.bizTitle,
            },
            {withCredentials: true, timeout: 60_000, headers: authHeaders()}
        );
        const d = res.data;
        return {
            fileId: d.fileId,
            uploadedChunkIndexes: d.uploadedChunkIndexes ?? [],
            instant: d.instant,
            documentId: d.documentId,
        };
    });
}

async function uploadChunk(ctx: ChunkApiContext, params: Parameters<UploadApi["uploadChunk"]>[0]) {
    return withAuthRetry(async () => {
        const form = new FormData();
        form.append("chunk", params.chunk, `${params.fileName}.part${params.chunkIndex}`);
        form.append("fileId", params.fileId);
        form.append("chunkIndex", String(params.chunkIndex));

        const res = await axios.post<{success: boolean; etag?: string}>(`${ctx.base}/chunk`, form, {
            withCredentials: true,
            timeout: 180_000,
            signal: params.signal,
            headers: authHeaders(),
            onUploadProgress: (ev) => {
                const total = ev.total ?? params.chunk.size;
                const loaded = ev.loaded ?? 0;
                params.onUploadProgress?.(loaded, total);
            },
        });
        return {etag: res.data.etag};
    }).catch((e) => {
        throw new Error(errMessage(e));
    });
}

async function mergeChunks(ctx: ChunkApiContext, params: Parameters<UploadApi["merge"]>[0]) {
    return withAuthRetry(async () => {
        const res = await axios.post<MergeRes>(
            `${ctx.base}/merge`,
            {fileId: params.fileId},
            {withCredentials: true, timeout: 600_000, headers: authHeaders()}
        );
        return {
            fileId: res.data.fileId,
            documentId: res.data.documentId,
            fileUrl: res.data.fileUrl,
        };
    }).catch((e) => {
        throw new Error(errMessage(e));
    });
}

async function cancelUpload(
    ctx: ChunkApiContext,
    params: {fileId: string; biz?: Record<string, unknown>}
) {
    await withAuthRetry(async () => {
        await axios.delete(`${ctx.base}/${params.fileId}`, {
            withCredentials: true,
            headers: authHeaders(),
        });
    }).catch(() => undefined);
}

/** 知识库大文件分片上传 API，供 ChunkedUploadSDK 使用 */
export function createKnowledgeBaseChunkUploadApi(kbId: number, title?: string): UploadApi {
    const ctx: ChunkApiContext = {
        base: `${apiBase()}/api/knowledge-bases/${kbId}/uploads`,
        bizTitle: title?.trim() || undefined,
    };

    return {
        prepare: (params) => prepareUpload(ctx, params),
        uploadChunk: (params) => uploadChunk(ctx, params),
        merge: (params) => mergeChunks(ctx, params),
        cancel: (params) => cancelUpload(ctx, params),
    };
}

/** 查询服务端上传进度（用于刷新后校验任务是否仍有效） */
export async function fetchChunkUploadStatus(
    kbId: number,
    fileId: string
): Promise<ChunkUploadStatusRes | null> {
    const base = `${apiBase()}/api/knowledge-bases/${kbId}/uploads`;
    try {
        return await withAuthRetry(async () => {
            const res = await axios.get<ChunkUploadStatusRes>(`${base}/${fileId}/status`, {
                withCredentials: true,
                headers: authHeaders(),
            });
            return res.data;
        });
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 404) return null;
        throw new Error(errMessage(e));
    }
}
