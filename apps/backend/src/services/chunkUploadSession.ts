import fs from "node:fs/promises";
import type {RowDataPacket} from "mysql2";
import pool from "../config/database.js";
import {
    assertAllowedFileName,
    CHUNKS_ROOT,
    newFileId,
    sessionDir,
    type UploadSessionRow,
} from "./chunkUploadPaths.js";

export type {UploadSessionRow} from "./chunkUploadPaths.js";

export async function ensureChunkDirs(): Promise<void> {
    await fs.mkdir(CHUNKS_ROOT, {recursive: true});
}

export async function findInstantDocument(
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

export async function getUploadSession(
    fileId: string,
    userId: number
): Promise<UploadSessionRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT file_id, user_id, knowledge_base_id, file_name, file_size, chunk_size, total_chunks,
                file_hash, title, status
         FROM upload_sessions WHERE file_id = ? AND user_id = ? LIMIT 1`,
        [fileId, userId]
    );
    return (rows[0] as UploadSessionRow | undefined) ?? null;
}

export async function tryInstantUpload(params: {
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
    const existing = await findInstantDocument(params.userId, params.knowledgeBaseId, params.fileHash);
    if (existing == null) return null;
    return {
        fileId: newFileId(),
        uploadedChunkIndexes: [],
        instant: true,
        documentId: existing,
    };
}

export async function createNewUploadSession(params: {
    userId: number;
    knowledgeBaseId: number;
    fileName: string;
    fileSize: number;
    chunkSize: number;
    totalChunks: number;
    fileHash?: string;
    title?: string;
}): Promise<{fileId: string; uploadedChunkIndexes: number[]}> {
    assertAllowedFileName(params.fileName);
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

export async function resumePrepareSession(params: {
    userId: number;
    knowledgeBaseId: number;
    fileId: string;
    fileName: string;
    fileSize: number;
    chunkSize: number;
    totalChunks: number;
    listUploadedChunkIndexes: (fileId: string, userId: number) => Promise<number[]>;
}): Promise<{fileId: string; uploadedChunkIndexes: number[]}> {
    const session = await getUploadSession(params.fileId, params.userId);
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

    const uploadedChunkIndexes = await params.listUploadedChunkIndexes(params.fileId, params.userId);
    return {fileId: params.fileId, uploadedChunkIndexes};
}
