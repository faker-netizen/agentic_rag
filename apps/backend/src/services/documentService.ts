import pool from '../config/database.js';
import {createRequire} from 'node:module';
import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import ragService from './ragService.js';
import {deleteStoredFile} from '../storage/localFileStorage.js';
import type {ResultSetHeader} from 'mysql2';

const require = createRequire(import.meta.url);
type PdfParseResult = {text?: string; numpages?: number};
const pdfParse = require('pdf-parse') as (data: Buffer) => Promise<PdfParseResult>;

export interface Document {
    id?: number;
    user_id?: number | null;
    knowledge_base_id?: number | null;
    title: string;
    content: string;
    file_path?: string;
    file_type?: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface DocumentChunk {
    id?: number;
    document_id: number;
    chunk_text: string;
    embedding?: number[];
    created_at?: Date;
}

class DocumentService {
    async saveDocument(document: Document & {user_id: number; knowledge_base_id: number}): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO documents (user_id, knowledge_base_id, title, content, file_path, file_type) VALUES (?, ?, ?, ?, ?, ?)',
            [
                document.user_id,
                document.knowledge_base_id,
                document.title,
                document.content,
                document.file_path ?? null,
                document.file_type ?? null,
            ]
        );
        return result.insertId;
    }

    private async deleteDocumentRecord(
        userId: number,
        knowledgeBaseId: number,
        documentId: number
    ): Promise<void> {
        await pool.query(
            'DELETE FROM documents WHERE id = ? AND user_id = ? AND knowledge_base_id = ?',
            [documentId, userId, knowledgeBaseId]
        );
    }

    async getDocumentScoped(
        documentId: number,
        userId: number,
        knowledgeBaseId: number
    ): Promise<Document | null> {
        const [rows] = await pool.query(
            `SELECT * FROM documents
             WHERE id = ? AND user_id = ? AND knowledge_base_id = ? LIMIT 1`,
            [documentId, userId, knowledgeBaseId]
        );
        const documents = rows as Document[];
        return documents.length > 0 ? documents[0] : null;
    }

    async listDocumentsInKnowledgeBase(userId: number, knowledgeBaseId: number): Promise<Document[]> {
        const [rows] = await pool.query(
            `SELECT id, user_id, knowledge_base_id, title, file_path, file_type, created_at, updated_at
             FROM documents
             WHERE user_id = ? AND knowledge_base_id = ?
             ORDER BY created_at DESC`,
            [userId, knowledgeBaseId]
        );
        return rows as Document[];
    }

    async deleteDocumentScoped(
        userId: number,
        knowledgeBaseId: number,
        documentId: number
    ): Promise<boolean> {
        const doc = await this.getDocumentScoped(documentId, userId, knowledgeBaseId);
        if (!doc) return false;

        await ragService.deleteEmbeddingsForDocument(documentId);

        const [result] = await pool.query<ResultSetHeader>(
            'DELETE FROM documents WHERE id = ? AND user_id = ? AND knowledge_base_id = ?',
            [documentId, userId, knowledgeBaseId]
        );

        if (result.affectedRows > 0) {
            await deleteStoredFile(doc.file_path);
        }

        return result.affectedRows > 0;
    }

    async processPDF(filePath: string): Promise<string> {
        const dataBuffer = await fs.readFile(filePath);
        let data: PdfParseResult;
        try {
            data = await pdfParse(dataBuffer);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error(
                `PDF 解析失败（可能已加密、损坏或版本过新）: ${msg}`
            );
        }
        const text = (data.text ?? '').trim();
        if (!text) {
            throw new Error(
                'PDF 中未提取到文本。若为扫描件（整页为图片），需先做 OCR；也可能是仅含图片/图层的版式文件。'
            );
        }
        return data.text ?? '';
    }

    async processWord(filePath: string): Promise<string> {
        const dataBuffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({buffer: dataBuffer});
        return result.value;
    }

    async processText(filePath: string): Promise<string> {
        return await fs.readFile(filePath, 'utf-8');
    }

    async processFile(filePath: string, _fileType: string): Promise<string> {
        const ext = path.extname(filePath).toLowerCase();

        if (ext === '.pdf') {
            return await this.processPDF(filePath);
        }
        if (['.doc', '.docx'].includes(ext)) {
            return await this.processWord(filePath);
        }
        if (['.txt', '.md'].includes(ext)) {
            return await this.processText(filePath);
        }
        throw new Error(`不支持的文件类型: ${ext}`);
    }

    async processAndSaveDocument(
        filePath: string,
        title: string,
        userId: number,
        knowledgeBaseId: number
    ): Promise<number> {
        const content = (await this.processFile(filePath, path.extname(filePath))).trim();
        if (!content) {
            throw new Error('文件解析后内容为空，无法建立检索（请检查是否为扫描版 PDF 或空文档）');
        }

        let documentId: number | null = null;
        try {
            documentId = await this.saveDocument({
                user_id: userId,
                knowledge_base_id: knowledgeBaseId,
                title,
                content,
                file_path: filePath,
                file_type: path.extname(filePath),
            });

            await ragService.ingestDocument({
                text: content,
                documentId,
                title,
                source: filePath,
            });

            return documentId;
        } catch (e) {
            if (documentId != null) {
                await ragService.deleteEmbeddingsForDocument(documentId);
                await this.deleteDocumentRecord(userId, knowledgeBaseId, documentId);
            }
            await deleteStoredFile(filePath);
            throw e;
        }
    }

    async searchSimilarChunks(
        query: string,
        userId: number,
        knowledgeBaseId: number,
        limit: number = 5
    ): Promise<DocumentChunk[]> {
        const relevantChunks = await ragService.retrieveRelevantChunks(query, {
            k: limit,
            userId,
            knowledgeBaseId,
        });

        return relevantChunks.map((chunk, index) => ({
            id: index,
            document_id: chunk.metadata.documentId,
            chunk_text: chunk.content,
            similarity: chunk.score || 0,
        }));
    }
}

export default new DocumentService();
