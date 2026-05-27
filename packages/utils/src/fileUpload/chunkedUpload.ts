/**
 * 大文件分片上传：分片、断点续传、秒传、失败重试、超时重传、进度回调。
 */
export type UploadStatus =
    | "idle"
    | "hashing"
    | "preparing"
    | "uploading"
    | "paused"
    | "merging"
    | "success"
    | "error"
    | "canceled";

export interface UploadChunkMeta {
    index: number;
    start: number;
    end: number;
    size: number;
    uploaded: boolean;
    uploading: boolean;
    progress: number;
    retries: number;
    etag?: string;
}

export interface UploadTaskSnapshot {
    taskId: string;
    fileId: string;
    fileName: string;
    fileSize: number;
    chunkSize: number;
    totalChunks: number;
    uploadedChunks: number;
    uploadedBytes: number;
    progress: number;
    status: UploadStatus;
    error?: string;
}

export interface UploadPrepareResponse {
    fileId: string;
    uploadedChunkIndexes: number[];
    /** 秒传：服务端已有相同文件，无需上传分片 */
    instant?: boolean;
    documentId?: number;
}

export interface UploadChunkResponse {
    etag?: string;
}

export interface UploadMergeResponse {
    fileId: string;
    fileUrl?: string;
    documentId?: number;
}

export interface UploadSessionInfo {
    fileId: string;
    fileName: string;
    fileSize: number;
    chunkSize: number;
    totalChunks: number;
    fileHash?: string;
}

export interface UploadApi {
    prepare(params: {
        taskId: string;
        fileName: string;
        fileSize: number;
        chunkSize: number;
        totalChunks: number;
        fileHash?: string;
        /** 续传：传入未完成任务的 fileId，服务端返回已上传分片索引 */
        fileId?: string;
        biz?: Record<string, unknown>;
    }): Promise<UploadPrepareResponse>;

    uploadChunk(params: {
        fileId: string;
        chunkIndex: number;
        chunk: Blob;
        chunkSize: number;
        totalChunks: number;
        fileName: string;
        signal?: AbortSignal;
        biz?: Record<string, unknown>;
        onUploadProgress?: (loaded: number, total: number) => void;
    }): Promise<UploadChunkResponse>;

    merge(params: {
        fileId: string;
        fileName: string;
        fileSize: number;
        totalChunks: number;
        biz?: Record<string, unknown>;
    }): Promise<UploadMergeResponse>;

    cancel?(params: {fileId: string; biz?: Record<string, unknown>}): Promise<void>;
}

export interface UploadEvents {
    onStatusChange?: (status: UploadStatus, snapshot: UploadTaskSnapshot) => void;
    onProgress?: (snapshot: UploadTaskSnapshot) => void;
    onChunkSuccess?: (chunkIndex: number, snapshot: UploadTaskSnapshot) => void;
    onChunkRetry?: (chunkIndex: number, retryCount: number, err: unknown, snapshot: UploadTaskSnapshot) => void;
    onError?: (err: unknown, snapshot: UploadTaskSnapshot) => void;
    onSuccess?: (result: UploadMergeResponse, snapshot: UploadTaskSnapshot) => void;
}

export interface UploadOptions extends UploadEvents {
    chunkSize?: number;
    concurrency?: number;
    maxRetries?: number;
    retryBaseDelayMs?: number;
    /** 单分片上传超时（毫秒），超时后触发重试 */
    chunkTimeoutMs?: number;
    autoStart?: boolean;
    /** 是否在 prepare 前计算文件指纹（用于秒传） */
    computeHash?: boolean;
    /** 刷新后续传：与本地持久化的 fileId 一致 */
    resumeFileId?: string;
    /** prepare 成功后回调，用于持久化 fileId 等（断点续传） */
    onSessionReady?: (info: UploadSessionInfo) => void;
    biz?: Record<string, unknown>;
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BASE_DELAY = 500;
const DEFAULT_CHUNK_TIMEOUT_MS = 120_000;

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function uuid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `task_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
}

function bufToHex(buf: ArrayBuffer): string {
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 用于秒传/去重：小文件全量 SHA-256；大文件采样头尾 + 元信息 */
export async function computeFileFingerprint(
    file: File,
    onProgress?: (percent: number) => void
): Promise<string> {
    const fullHashMax = 50 * 1024 * 1024;
    if (file.size <= fullHashMax) {
        onProgress?.(0);
        const buf = await file.arrayBuffer();
        onProgress?.(50);
        const hash = await crypto.subtle.digest("SHA-256", buf);
        onProgress?.(100);
        return bufToHex(hash);
    }

    const sample = 2 * 1024 * 1024;
    onProgress?.(10);
    const head = await file.slice(0, Math.min(sample, file.size)).arrayBuffer();
    onProgress?.(40);
    const tailStart = Math.max(0, file.size - sample);
    const tail = await file.slice(tailStart, file.size).arrayBuffer();
    onProgress?.(70);
    const meta = new TextEncoder().encode(`${file.name}\n${file.size}\n${file.type}`);
    const combined = new Uint8Array(meta.byteLength + head.byteLength + tail.byteLength);
    combined.set(new Uint8Array(meta), 0);
    combined.set(new Uint8Array(head), meta.byteLength);
    combined.set(new Uint8Array(tail), meta.byteLength + head.byteLength);
    const hash = await crypto.subtle.digest("SHA-256", combined);
    onProgress?.(100);
    return `sample:${bufToHex(hash)}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(message)), ms);
        promise.then(
            (v) => {
                clearTimeout(timer);
                resolve(v);
            },
            (e) => {
                clearTimeout(timer);
                reject(e);
            }
        );
    });
}

export class ChunkedUploadTask {
    public readonly taskId: string;
    public readonly file: File;
    public readonly api: UploadApi;
    public readonly options: Required<
        Pick<
            UploadOptions,
            | "chunkSize"
            | "concurrency"
            | "maxRetries"
            | "retryBaseDelayMs"
            | "chunkTimeoutMs"
            | "autoStart"
            | "computeHash"
        >
    > &
        UploadEvents & {
            biz?: Record<string, unknown>;
            resumeFileId?: string;
            onSessionReady?: (info: UploadSessionInfo) => void;
        };

    private fileId = "";
    private fileHash = "";
    private chunks: UploadChunkMeta[] = [];
    private controllers = new Map<number, AbortController>();
    private status: UploadStatus = "idle";
    private errorMsg = "";
    private canceled = false;
    private paused = false;
    private running = false;
    private mergeResult?: UploadMergeResponse;

    constructor(file: File, api: UploadApi, options: UploadOptions = {}) {
        this.taskId = uuid();
        this.file = file;
        this.api = api;
        this.options = {
            chunkSize: options.chunkSize ?? DEFAULT_CHUNK_SIZE,
            concurrency: options.concurrency ?? DEFAULT_CONCURRENCY,
            maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
            retryBaseDelayMs: options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY,
            chunkTimeoutMs: options.chunkTimeoutMs ?? DEFAULT_CHUNK_TIMEOUT_MS,
            autoStart: options.autoStart ?? true,
            computeHash: options.computeHash ?? true,
            resumeFileId: options.resumeFileId,
            biz: options.biz,
            onStatusChange: options.onStatusChange,
            onProgress: options.onProgress,
            onChunkSuccess: options.onChunkSuccess,
            onChunkRetry: options.onChunkRetry,
            onError: options.onError,
            onSuccess: options.onSuccess,
            onSessionReady: options.onSessionReady,
        };
        this.initChunks();
    }

    private initChunks() {
        const totalChunks = Math.ceil(this.file.size / this.options.chunkSize);
        this.chunks = Array.from({length: totalChunks}, (_, index) => {
            const start = index * this.options.chunkSize;
            const end = Math.min(this.file.size, start + this.options.chunkSize);
            return {
                index,
                start,
                end,
                size: end - start,
                uploaded: false,
                uploading: false,
                progress: 0,
                retries: 0,
            };
        });
    }

    getSnapshot(): UploadTaskSnapshot {
        const uploadedBytesByChunk = this.chunks.reduce((acc, c) => {
            if (c.uploaded) return acc + c.size;
            return acc + Math.floor((c.progress / 100) * c.size);
        }, 0);

        const uploadedChunks = this.chunks.filter((c) => c.uploaded).length;
        const progress =
            this.file.size === 0 ? 100 : clamp(Math.round((uploadedBytesByChunk / this.file.size) * 100), 0, 100);

        return {
            taskId: this.taskId,
            fileId: this.fileId,
            fileName: this.file.name,
            fileSize: this.file.size,
            chunkSize: this.options.chunkSize,
            totalChunks: this.chunks.length,
            uploadedChunks,
            uploadedBytes: uploadedBytesByChunk,
            progress,
            status: this.status,
            error: this.errorMsg || undefined,
        };
    }

    private emitStatus(status: UploadStatus) {
        this.status = status;
        this.options.onStatusChange?.(status, this.getSnapshot());
    }

    private emitProgress() {
        this.options.onProgress?.(this.getSnapshot());
    }

    private setError(err: unknown) {
        this.errorMsg = err instanceof Error ? err.message : String(err) || "unknown error";
        this.emitStatus("error");
        this.options.onError?.(err, this.getSnapshot());
    }

    async start() {
        if (this.running) return;
        this.running = true;
        this.canceled = false;
        this.paused = false;
        this.errorMsg = "";

        try {
            if (this.options.computeHash) {
                this.emitStatus("hashing");
                this.fileHash = await computeFileFingerprint(this.file, () => this.emitProgress());
            }

            this.emitStatus("preparing");
            const prepareRes = await this.api.prepare({
                taskId: this.taskId,
                fileName: this.file.name,
                fileSize: this.file.size,
                chunkSize: this.options.chunkSize,
                totalChunks: this.chunks.length,
                fileHash: this.fileHash || undefined,
                fileId: this.options.resumeFileId,
                biz: this.options.biz,
            });
            this.fileId = prepareRes.fileId;

            if (prepareRes.instant && prepareRes.documentId != null) {
                this.mergeResult = {
                    fileId: prepareRes.fileId,
                    documentId: prepareRes.documentId,
                };
                this.chunks.forEach((c) => {
                    c.uploaded = true;
                    c.progress = 100;
                });
                this.emitStatus("success");
                this.emitProgress();
                this.options.onSuccess?.(this.mergeResult, this.getSnapshot());
                return;
            }

            this.options.onSessionReady?.({
                fileId: this.fileId,
                fileName: this.file.name,
                fileSize: this.file.size,
                chunkSize: this.options.chunkSize,
                totalChunks: this.chunks.length,
                fileHash: this.fileHash || undefined,
            });

            const uploadedSet = new Set(prepareRes.uploadedChunkIndexes || []);
            this.chunks.forEach((c) => {
                if (uploadedSet.has(c.index)) {
                    c.uploaded = true;
                    c.progress = 100;
                }
            });
            this.emitProgress();

            await this.uploadLoop();

            if (this.canceled || this.paused) return;

            this.emitStatus("merging");
            this.mergeResult = await this.api.merge({
                fileId: this.fileId,
                fileName: this.file.name,
                fileSize: this.file.size,
                totalChunks: this.chunks.length,
                biz: this.options.biz,
            });

            this.emitStatus("success");
            this.emitProgress();
            this.options.onSuccess?.(this.mergeResult, this.getSnapshot());
        } catch (err) {
            if (this.canceled || this.paused) return;
            this.setError(err);
            throw err;
        } finally {
            this.running = false;
        }
    }

    pause() {
        if (this.status !== "uploading" && this.status !== "preparing" && this.status !== "hashing") return;
        this.paused = true;
        this.controllers.forEach((c) => c.abort());
        this.controllers.clear();
        this.chunks.forEach((c) => (c.uploading = false));
        this.emitStatus("paused");
    }

    async resume() {
        if (this.status !== "paused" && this.status !== "error") return;
        this.paused = false;
        this.errorMsg = "";
        await this.uploadLoopOnly();
    }

    /** 断点续传：不重新 prepare，仅上传缺失分片后 merge */
    private async uploadLoopOnly() {
        if (!this.fileId) {
            await this.start();
            return;
        }
        this.running = true;
        try {
            await this.uploadLoop();
            if (this.canceled || this.paused) return;
            this.emitStatus("merging");
            this.mergeResult = await this.api.merge({
                fileId: this.fileId,
                fileName: this.file.name,
                fileSize: this.file.size,
                totalChunks: this.chunks.length,
                biz: this.options.biz,
            });
            this.emitStatus("success");
            this.emitProgress();
            this.options.onSuccess?.(this.mergeResult, this.getSnapshot());
        } catch (err) {
            if (this.canceled || this.paused) return;
            this.setError(err);
            throw err;
        } finally {
            this.running = false;
        }
    }

    async cancel() {
        this.canceled = true;
        this.paused = false;
        this.controllers.forEach((c) => c.abort());
        this.controllers.clear();
        this.chunks.forEach((c) => {
            c.uploading = false;
            if (!c.uploaded) c.progress = 0;
        });
        this.emitStatus("canceled");
        if (this.fileId && this.api.cancel) {
            try {
                await this.api.cancel({fileId: this.fileId, biz: this.options.biz});
            } catch {
                /* ignore */
            }
        }
    }

    private async uploadLoop() {
        this.emitStatus("uploading");
        const queue = this.chunks.filter((c) => !c.uploaded);
        let cursor = 0;
        const worker = async () => {
            while (cursor < queue.length) {
                if (this.paused || this.canceled) return;
                const current = queue[cursor++];
                await this.uploadOneChunkWithRetry(current);
            }
        };
        const n = Math.min(this.options.concurrency, queue.length || 1);
        await Promise.all(Array.from({length: n}, () => worker()));
    }

    private async uploadOneChunkWithRetry(chunkMeta: UploadChunkMeta) {
        if (chunkMeta.uploaded) return;

        while (chunkMeta.retries <= this.options.maxRetries) {
            if (this.paused || this.canceled) return;

            const controller = new AbortController();
            this.controllers.set(chunkMeta.index, controller);

            try {
                chunkMeta.uploading = true;
                const blob = this.file.slice(chunkMeta.start, chunkMeta.end);

                const uploadPromise = this.api.uploadChunk({
                    fileId: this.fileId,
                    chunkIndex: chunkMeta.index,
                    chunk: blob,
                    chunkSize: this.options.chunkSize,
                    totalChunks: this.chunks.length,
                    fileName: this.file.name,
                    signal: controller.signal,
                    biz: this.options.biz,
                    onUploadProgress: (loaded, total) => {
                        if (total > 0) {
                            chunkMeta.progress = clamp(Math.round((loaded / total) * 100), 0, 100);
                            this.emitProgress();
                        }
                    },
                });

                const res = await withTimeout(
                    uploadPromise,
                    this.options.chunkTimeoutMs,
                    `分片 ${chunkMeta.index} 上传超时`
                );

                chunkMeta.uploaded = true;
                chunkMeta.uploading = false;
                chunkMeta.progress = 100;
                chunkMeta.etag = res?.etag;
                this.controllers.delete(chunkMeta.index);
                this.options.onChunkSuccess?.(chunkMeta.index, this.getSnapshot());
                this.emitProgress();
                return;
            } catch (err: unknown) {
                this.controllers.delete(chunkMeta.index);
                chunkMeta.uploading = false;
                if (this.paused || this.canceled) return;
                if (err instanceof Error && err.name === "AbortError") return;

                chunkMeta.retries += 1;
                if (chunkMeta.retries > this.options.maxRetries) {
                    throw new Error(`分片 ${chunkMeta.index} 上传失败，已超过最大重试次数`);
                }
                this.options.onChunkRetry?.(chunkMeta.index, chunkMeta.retries, err, this.getSnapshot());
                const delay = this.options.retryBaseDelayMs * 2 ** (chunkMeta.retries - 1);
                await sleep(delay);
            }
        }
    }
}

export class ChunkedUploadSDK {
    constructor(
        private api: UploadApi,
        private defaultOptions: UploadOptions = {}
    ) {}

    createTask(file: File, options: UploadOptions = {}) {
        const merged: UploadOptions = {
            ...this.defaultOptions,
            ...options,
            biz: {...(this.defaultOptions.biz || {}), ...(options.biz || {})},
        };
        const task = new ChunkedUploadTask(file, this.api, merged);
        if (merged.autoStart ?? true) {
            task.start().catch(() => undefined);
        }
        return task;
    }
}

/** @deprecated 使用 ChunkedUploadTask */
export const VideoUploadTask = ChunkedUploadTask;
/** @deprecated 使用 ChunkedUploadSDK */
export const VideoUploadSDK = ChunkedUploadSDK;
