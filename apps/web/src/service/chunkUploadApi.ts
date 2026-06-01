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

/** 知识库大文件分片上传 API，供 ChunkedUploadSDK 使用 */
export function createKnowledgeBaseChunkUploadApi(kbId: number, title?: string): UploadApi {
    const base = `${apiBase()}/api/knowledge-bases/${kbId}/uploads`;
    const biz = {knowledgeBaseId: kbId, title: title?.trim() || undefined};

    return {
        async prepare(params) {
            return withAuthRetry(async () => {
                const token = getAccessToken();
                const res = await axios.post<PrepareRes>(
                    `${base}/prepare`,
                    {
                        fileName: params.fileName,
                        fileSize: params.fileSize,
                        chunkSize: params.chunkSize,
                        totalChunks: params.totalChunks,
                        fileHash: params.fileHash,
                        fileId: params.fileId,
                        title: (params.biz?.title as string) || biz.title,
                    },
                    {
                        withCredentials: true,
                        timeout: 60_000,
                        headers: token ? {Authorization: `Bearer ${token}`} : {},
                    }
                );
                const d = res.data;
                return {
                    fileId: d.fileId,
                    uploadedChunkIndexes: d.uploadedChunkIndexes ?? [],
                    instant: d.instant,
                    documentId: d.documentId,
                };
            });
        },

        async uploadChunk(params) {
            return withAuthRetry(async () => {
                const form = new FormData();
                form.append("chunk", params.chunk, `${params.fileName}.part${params.chunkIndex}`);
                form.append("fileId", params.fileId);
                form.append("chunkIndex", String(params.chunkIndex));

                const token = getAccessToken();
                const res = await axios.post<{success: boolean; etag?: string}>(`${base}/chunk`, form, {
                    withCredentials: true,
                    timeout: 180_000,
                    signal: params.signal,
                    headers: token ? {Authorization: `Bearer ${token}`} : {},
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
        },

        async merge(params) {
            return withAuthRetry(async () => {
                const token = getAccessToken();
                const res = await axios.post<MergeRes>(
                    `${base}/merge`,
                    {fileId: params.fileId},
                    {
                        withCredentials: true,
                        timeout: 600_000,
                        headers: token ? {Authorization: `Bearer ${token}`} : {},
                    }
                );
                return {
                    fileId: res.data.fileId,
                    documentId: res.data.documentId,
                    fileUrl: res.data.fileUrl,
                };
            }).catch((e) => {
                throw new Error(errMessage(e));
            });
        },

        async cancel(params) {
            await withAuthRetry(async () => {
                const token = getAccessToken();
                await axios.delete(`${base}/${params.fileId}`, {
                    withCredentials: true,
                    headers: token ? {Authorization: `Bearer ${token}`} : {},
                });
            }).catch(() => undefined);
        },
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
            const token = getAccessToken();
            const res = await axios.get<ChunkUploadStatusRes>(`${base}/${fileId}/status`, {
                withCredentials: true,
                headers: token ? {Authorization: `Bearer ${token}`} : {},
            });
            return res.data;
        });
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 404) return null;
        throw new Error(errMessage(e));
    }
}
