/** 刷新后续传：本地持久化未完成的分片上传任务 */

export type PendingChunkUpload = {
    fileId: string;
    kbId: number;
    fileName: string;
    fileSize: number;
    chunkSize: number;
    totalChunks: number;
    lastModified: number;
    title?: string;
    fileHash?: string;
    updatedAt: string;
};

const STORAGE_KEY = "d2c_chunk_upload_pending_v1";

function readAll(): PendingChunkUpload[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isPendingRecord);
    } catch {
        return [];
    }
}

function isPendingRecord(v: unknown): v is PendingChunkUpload {
    if (!v || typeof v !== "object") return false;
    const o = v as Record<string, unknown>;
    return (
        typeof o.fileId === "string" &&
        typeof o.kbId === "number" &&
        typeof o.fileName === "string" &&
        typeof o.fileSize === "number" &&
        typeof o.chunkSize === "number" &&
        typeof o.totalChunks === "number" &&
        typeof o.lastModified === "number"
    );
}

function writeAll(list: PendingChunkUpload[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function savePendingUpload(record: PendingChunkUpload): void {
    const list = readAll().filter((p) => p.fileId !== record.fileId);
    list.push({...record, updatedAt: new Date().toISOString()});
    writeAll(list);
}

export function removePendingUpload(fileId: string): void {
    writeAll(readAll().filter((p) => p.fileId !== fileId));
}

export function getPendingUpload(fileId: string): PendingChunkUpload | null {
    return readAll().find((p) => p.fileId === fileId) ?? null;
}

export function listPendingUploadsForKb(kbId: number): PendingChunkUpload[] {
    return readAll().filter((p) => p.kbId === kbId);
}

export function updatePendingProgress(fileId: string, uploadedChunks: number): void {
    const list = readAll();
    const idx = list.findIndex((p) => p.fileId === fileId);
    if (idx < 0) return;
    list[idx] = {...list[idx], updatedAt: new Date().toISOString()};
    writeAll(list);
}

/** 校验用户选择的文件是否与未完成记录一致 */
export function fileMatchesPending(file: File, pending: PendingChunkUpload): string | null {
    if (file.name !== pending.fileName) {
        return `请选择原文件「${pending.fileName}」，当前为「${file.name}」`;
    }
    if (file.size !== pending.fileSize) {
        return "文件大小与未完成上传不一致";
    }
    if (file.lastModified !== pending.lastModified) {
        return "文件已修改，请使用未改动的原文件续传";
    }
    if (Math.ceil(file.size / pending.chunkSize) !== pending.totalChunks) {
        return "分片参数与记录不一致，无法续传";
    }
    return null;
}
