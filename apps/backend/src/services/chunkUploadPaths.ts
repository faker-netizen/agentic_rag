import crypto from "node:crypto";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CHUNKS_ROOT = path.join(__dirname, "../../uploads/chunks");
export const ALLOWED_EXT = new Set([".pdf", ".doc", ".docx", ".txt", ".md"]);

export type UploadSessionRow = {
    file_id: string;
    user_id: number;
    knowledge_base_id: number;
    file_name: string;
    file_size: number;
    chunk_size: number;
    total_chunks: number;
    file_hash: string | null;
    title: string | null;
    status: "uploading" | "merged" | "canceled";
};

export function newFileId(): string {
    return crypto.randomUUID().replace(/-/g, "");
}

export function sessionDir(fileId: string): string {
    return path.join(CHUNKS_ROOT, fileId);
}

export function chunkPath(fileId: string, index: number): string {
    return path.join(sessionDir(fileId), `${index}.part`);
}

export function assertAllowedFileName(fileName: string): void {
    const ext = path.extname(fileName).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
        throw new Error(`不支持的文件类型: ${ext || "(无扩展名)"}`);
    }
}
