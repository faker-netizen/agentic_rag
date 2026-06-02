import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import type {ResultSetHeader, RowDataPacket} from "mysql2";
import pool from "../config/database.js";
import documentService from "./documentService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHUNKS_ROOT = path.join(__dirname, "../../uploads/chunks");
const ALLOWED_EXT = new Set([".pdf", ".doc", ".docx", ".txt", ".md"]);

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

function newFileId(): string {
    return crypto.randomUUID().replace(/-/g, "");
}

function sessionDir(fileId: string): string {
    return path.join(CHUNKS_ROOT, fileId);
}

function chunkPath(fileId: string, index: number): string {
    return path.join(sessionDir(fileId), `${index}.part`);
}

function assertAllowedFileName(fileName: string): void {
    const ext = path.extname(fileName).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
        throw new Error(`不支持的文件类型: ${ext || "(无扩展名)"}`);
    }
}

class ChunkUploadService {
    async ensureDirs(): Promise<void> {
        await fs.mkdir(CHUNKS_ROOT, {recursive: true});
    }

    async findInstantDocument(
        userId: number,
        knowledgeBaseId: number,
        fileHash: string
    ): Promise<number | null> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT document_id FROM file_fingerprints
             WHERE user_id = ? AND knowledge_base_id = ? AND file_hash = ?
             LIMIT 1`,
            [userId, knowledgeBaseId, fileHash]
        );
        const docId = rows[0]?.document_id;
        return typeof docId === "number" && docId > 0 ? docId : null;
    }

    async prepare(params: {
        userId: number;
        knowledgeBaseId: number;
        fileName: string;
        fileSize: number;
        chunkSize: number;
        totalChunks: number;
        fileHash?: string;
        title?: string;
        /** 续传：复用已有上传会话 */
        fileId?: string;
    }): Promise<{
        fileId: string;
        uploadedChunkIndexes: number[];
        instant?: boolean;
        documentId?: number;
    }> {
        await this.ensureDirs();
        assertAllowedFileName(params.fileName);

        if (params.fileId) {
            return this.resumePrepareSession({
                userId: params.userId,
                knowledgeBaseId: params.knowledgeBaseId,
                fileId: params.fileId,
                fileName: params.fileName,
                fileSize: params.fileSize,
                chunkSize: params.chunkSize,
                totalChunks: params.totalChunks,
            });
        }

        if (params.fileHash) {
            const instant = await this.tryInstantUpload(params);
            if (instant) return instant;
        }

        return this.createNewUploadSession(params);
    }

    private async tryInstantUpload(params: {
        userId: number;
        knowledgeBaseId: number;
        fileHash?: string;
    }): Promise<{
        fileId: string;
        uploadedChunkIndexes: number[];
        instant: true;
        documentId: number;
    } | null> {
        if (!params.fileHash) return null;
        const existing = await this.findInstantDocument(
            params.userId,
            params.knowledgeBaseId,
            params.fileHash
        );
        if (existing == null) return null;
        return {
            fileId: newFileId(),
            uploadedChunkIndexes: [],
            instant: true,
            documentId: existing,
        };
    }

    private async createNewUploadSession(params: {
        userId: number;
        knowledgeBaseId: number;
        fileName: string;
        fileSize: number;
        chunkSize: number;
        totalChunks: number;
        fileHash?: string;
        title?: string;
    }): Promise<{fileId: string; uploadedChunkIndexes: number[]}> {
        const fileId = newFileId();
        await fs.mkdir(sessionDir(fileId), {recursive: true});

        await pool.query(
            `INSERT INTO upload_sessions
             (file_id, user_id, knowledge_base_id, file_name, file_size, chunk_size, total_chunks, file_hash, title, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'uploading')`,
            [
                fileId,
                params.userId,
                params.knowledgeBaseId,
                params.fileName,
                params.fileSize,
                params.chunkSize,
                params.totalChunks,
                params.fileHash ?? null,
                params.title ?? null,
            ]
        );

        return {fileId, uploadedChunkIndexes: [] as number[]};
    }

    async getSession(fileId: string, userId: number): Promise<UploadSessionRow | null> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT file_id, user_id, knowledge_base_id, file_name, file_size, chunk_size, total_chunks,
                    file_hash, title, status
             FROM upload_sessions WHERE file_id = ? AND user_id = ? LIMIT 1`,
            [fileId, userId]
        );
        return (rows[0] as UploadSessionRow | undefined) ?? null;
    }

    async saveChunk(
        fileId: string,
        userId: number,
        chunkIndex: number,
        data: Buffer
    ): Promise<{etag: string}> {
        const session = await this.getSession(fileId, userId);
        if (!session) throw new Error("上传任务不存在");
        if (session.status !== "uploading") throw new Error("上传任务已结束");

        if (chunkIndex < 0 || chunkIndex >= session.total_chunks) {
            throw new Error("无效的分片索引");
        }

        const dir = sessionDir(fileId);
        await fs.mkdir(dir, {recursive: true});
        const target = chunkPath(fileId, chunkIndex);
        await fs.writeFile(target, data);
        const etag = crypto.createHash("md5").update(data).digest("hex");

        await pool.query(
            `INSERT INTO upload_chunks (file_id, chunk_index, etag)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE etag = VALUES(etag)`,
            [fileId, chunkIndex, etag]
        );

        return {etag};
    }

    async listUploadedChunkIndexes(fileId: string, userId: number): Promise<number[]> {
        const session = await this.getSession(fileId, userId);
        if (!session) return [];

        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT chunk_index FROM upload_chunks WHERE file_id = ? ORDER BY chunk_index ASC`,
            [fileId]
        );
        const fromDb = rows.map((r) => Number(r.chunk_index)).filter((n) => Number.isFinite(n));

        const dir = sessionDir(fileId);
        let fromDisk: number[] = [];
        try {
            const files = await fs.readdir(dir);
            fromDisk = files
                .filter((f) => f.endsWith(".part"))
                .map((f) => Number(f.replace(".part", "")))
                .filter((n) => Number.isFinite(n) && n >= 0);
        } catch {
            fromDisk = [];
        }

        return [...new Set([...fromDb, ...fromDisk])].sort((a, b) => a - b);
    }

    async merge(
        fileId: string,
        userId: number
    ): Promise<{documentId: number; filePath: string}> {
        const session = await this.getSession(fileId, userId);
        if (!session) throw new Error("上传任务不存在");
        if (session.status === "merged") {
            throw new Error("文件已合并，请勿重复操作");
        }

        const uploaded = await this.listUploadedChunkIndexes(fileId, userId);
        this.assertMergeComplete(session, uploaded);

        const mergedPath = await this.writeMergedFile(session, fileId);
        const documentId = await this.persistMergedDocument(session, mergedPath, userId);

        await pool.query<ResultSetHeader>(
            `UPDATE upload_sessions SET status = 'merged' WHERE file_id = ?`,
            [fileId]
        );

        await this.cleanupChunks(fileId);
        return {documentId, filePath: mergedPath};
    }

    private assertMergeComplete(session: UploadSessionRow, uploaded: number[]): void {
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

    private async writeMergedFile(session: UploadSessionRow, fileId: string): Promise<string> {
        const uploadsDir = path.join(__dirname, "../../uploads");
        await fs.mkdir(uploadsDir, {recursive: true});
        const safeBase = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(session.file_name).toLowerCase();
        const mergedPath = path.join(uploadsDir, `${safeBase}${ext}`);

        for (let i = 0; i < session.total_chunks; i++) {
            const part = await fs.readFile(chunkPath(fileId, i));
            if (i === 0) await fs.writeFile(mergedPath, part);
            else await fs.appendFile(mergedPath, part);
        }
        return mergedPath;
    }

    private async persistMergedDocument(
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

    async cancel(fileId: string, userId: number): Promise<void> {
        const session = await this.getSession(fileId, userId);
        if (!session) return;
        await pool.query(`UPDATE upload_sessions SET status = 'canceled' WHERE file_id = ?`, [fileId]);
        await this.cleanupChunks(fileId);
    }

    private async cleanupChunks(fileId: string): Promise<void> {
        const dir = sessionDir(fileId);
        try {
            await fs.rm(dir, {recursive: true, force: true});
        } catch {
            /* ignore */
        }
        await pool.query(`DELETE FROM upload_chunks WHERE file_id = ?`, [fileId]);
    }

    /** 断点续传：校验会话并返回已上传分片 */
    private async resumePrepareSession(params: {
        userId: number;
        knowledgeBaseId: number;
        fileId: string;
        fileName: string;
        fileSize: number;
        chunkSize: number;
        totalChunks: number;
    }): Promise<{
        fileId: string;
        uploadedChunkIndexes: number[];
    }> {
        const session = await this.getSession(params.fileId, params.userId);
        if (!session) {
            throw new Error("上传任务不存在或已过期，请重新选择文件上传");
        }
        if (session.status !== "uploading") {
            throw new Error("上传任务已结束，无法续传");
        }
        if (session.knowledge_base_id !== params.knowledgeBaseId) {
            throw new Error("知识库与上传任务不匹配");
        }
        if (
            session.file_name !== params.fileName ||
            session.file_size !== params.fileSize ||
            session.chunk_size !== params.chunkSize ||
            session.total_chunks !== params.totalChunks
        ) {
            throw new Error("文件信息与未完成的上传不一致，请选择原来的同一个文件");
        }

        const uploadedChunkIndexes = await this.listUploadedChunkIndexes(params.fileId, params.userId);
        return {fileId: params.fileId, uploadedChunkIndexes};
    }

    async getUploadStatus(
        fileId: string,
        userId: number
    ): Promise<{
        session: UploadSessionRow;
        uploadedChunkIndexes: number[];
    } | null> {
        const session = await this.getSession(fileId, userId);
        if (!session || session.status !== "uploading") return null;
        const uploadedChunkIndexes = await this.listUploadedChunkIndexes(fileId, userId);
        return {session, uploadedChunkIndexes};
    }
}

export default new ChunkUploadService();
