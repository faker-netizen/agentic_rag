import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import type {ResultSetHeader} from "mysql2";
import pool from "../config/database.js";
import documentService from "./documentService.js";
import {BYTES_PER_GB} from "./serviceConstants.js";
import type {UploadSessionRow} from "./chunkUploadPaths.js";
import {chunkPath} from "./chunkUploadPaths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function assertMergeComplete(session: UploadSessionRow, uploaded: number[]): void {
    if (uploaded.length !== session.total_chunks) {
        const missing = session.total_chunks - uploaded.length;
        throw new Error(`分片未传齐，还差 ${missing} 个分片`);
    }
    for (let i = 0; i < session.total_chunks; i++) {
        if (!uploaded.includes(i)) {
            throw new Error(`缺少分片 ${i}`);
        }
    }
}

export async function writeMergedFile(session: UploadSessionRow, fileId: string): Promise<string> {
    const uploadsDir = path.join(__dirname, "../../uploads");
    await fs.mkdir(uploadsDir, {recursive: true});
    const safeBase = `${Date.now()}-${Math.round(Math.random() * BYTES_PER_GB)}`;
    const ext = path.extname(session.file_name).toLowerCase();
    const mergedPath = path.join(uploadsDir, `${safeBase}${ext}`);

    for (let i = 0; i < session.total_chunks; i++) {
        const part = await fs.readFile(chunkPath(fileId, i));
        if (i === 0) await fs.writeFile(mergedPath, part);
        else await fs.appendFile(mergedPath, part);
    }
    return mergedPath;
}

export async function persistMergedDocument(
    session: UploadSessionRow,
    mergedPath: string,
    userId: number
): Promise<number> {
    const ext = path.extname(session.file_name).toLowerCase();
    const title =
        (session.title && session.title.trim()) ||
        path.basename(session.file_name, ext) ||
        "未命名";

    const documentId = await documentService.processAndSaveDocument(
        mergedPath,
        title,
        userId,
        session.knowledge_base_id
    );

    if (session.file_hash) {
        await pool.query(
            `INSERT INTO file_fingerprints (user_id, knowledge_base_id, file_hash, document_id)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE document_id = VALUES(document_id)`,
            [userId, session.knowledge_base_id, session.file_hash, documentId]
        );
    }
    return documentId;
}

export async function markSessionMerged(fileId: string): Promise<void> {
    await pool.query<ResultSetHeader>(
        `UPDATE upload_sessions SET status = 'merged' WHERE file_id = ?`,
        [fileId]
    );
}
