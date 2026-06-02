import crypto from "node:crypto";
import fs from "node:fs/promises";
import type {RowDataPacket} from "mysql2";
import pool from "../config/database.js";
import {
    assertMergeComplete,
    markSessionMerged,
    persistMergedDocument,
    writeMergedFile,
} from "./chunkUploadMerge.js";
import {
    assertAllowedFileName,
    chunkPath,
    sessionDir,
    type UploadSessionRow,
} from "./chunkUploadPaths.js";
import {
    createNewUploadSession,
    ensureChunkDirs,
    findInstantDocument,
    getUploadSession,
    resumePrepareSession,
    tryInstantUpload,
} from "./chunkUploadSession.js";

class ChunkUploadService {
    async ensureDirs(): Promise<void> {
        await ensureChunkDirs();
    }

    async findInstantDocument(
        userId: number,
        knowledgeBaseId: number,
        fileHash: string
    ): Promise<number | null> {
        return findInstantDocument(userId, knowledgeBaseId, fileHash);
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
            return resumePrepareSession({
                ...params,
                fileId: params.fileId,
                listUploadedChunkIndexes: (id, uid) => this.listUploadedChunkIndexes(id, uid),
            });
        }

        if (params.fileHash) {
            const instant = await tryInstantUpload(params);
            if (instant) return instant;
        }

        return createNewUploadSession(params);
    }

    async getSession(fileId: string, userId: number): Promise<UploadSessionRow | null> {
        return getUploadSession(fileId, userId);
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

    async merge(fileId: string, userId: number): Promise<{documentId: number; filePath: string}> {
        const session = await this.getSession(fileId, userId);
        if (!session) throw new Error("上传任务不存在");
        if (session.status === "merged") {
            throw new Error("文件已合并，请勿重复操作");
        }

        const uploaded = await this.listUploadedChunkIndexes(fileId, userId);
        assertMergeComplete(session, uploaded);

        const mergedPath = await writeMergedFile(session, fileId);
        const documentId = await persistMergedDocument(session, mergedPath, userId);

        await markSessionMerged(fileId);
        await this.cleanupChunks(fileId);
        return {documentId, filePath: mergedPath};
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

    async getUploadStatus(
        fileId: string,
        userId: number
    ): Promise<{session: UploadSessionRow; uploadedChunkIndexes: number[]} | null> {
        const session = await this.getSession(fileId, userId);
        if (!session || session.status !== "uploading") return null;
        const uploadedChunkIndexes = await this.listUploadedChunkIndexes(fileId, userId);
        return {session, uploadedChunkIndexes};
    }
}

export type {UploadSessionRow} from "./chunkUploadPaths.js";
export default new ChunkUploadService();
