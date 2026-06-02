type PrepareBodyInput = {
    fileName: string;
    fileSize: number;
    chunkSize: number;
    totalChunks: number;
    fileHash?: string;
    title?: string;
    resumeFileId?: string;
};

export function parsePrepareBody(body: unknown): {ok: true; value: PrepareBodyInput} | {ok: false; error: string} {
    const raw = body ?? {};
    const fileName = typeof (raw as {fileName?: unknown}).fileName === "string"
        ? (raw as {fileName: string}).fileName.trim()
        : "";
    const fileSize = Number((raw as {fileSize?: unknown}).fileSize);
    const chunkSize = Number((raw as {chunkSize?: unknown}).chunkSize);
    const totalChunks = Number((raw as {totalChunks?: unknown}).totalChunks);
    const fileHash =
        typeof (raw as {fileHash?: unknown}).fileHash === "string"
            ? (raw as {fileHash: string}).fileHash.trim()
            : undefined;
    const title =
        typeof (raw as {title?: unknown}).title === "string"
            ? (raw as {title: string}).title.trim()
            : undefined;
    const resumeFileId =
        typeof (raw as {fileId?: unknown}).fileId === "string"
            ? (raw as {fileId: string}).fileId.trim()
            : undefined;

    if (!fileName) return {ok: false, error: "fileName 不能为空"};
    if (!Number.isFinite(fileSize) || fileSize < 0) return {ok: false, error: "fileSize 无效"};
    if (!Number.isFinite(chunkSize) || chunkSize <= 0) return {ok: false, error: "chunkSize 无效"};
    if (!Number.isFinite(totalChunks) || totalChunks <= 0) {
        return {ok: false, error: "totalChunks 无效"};
    }

    return {
        ok: true,
        value: {fileName, fileSize, chunkSize, totalChunks, fileHash, title, resumeFileId},
    };
}

export type {PrepareBodyInput};
