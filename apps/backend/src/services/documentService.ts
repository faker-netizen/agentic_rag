import pool from '../config/database.js';
import path from 'path';
import ragService from './ragService.js';
import {parseDocumentFile} from './documentContentParser.js';
import {DOCUMENT_LIST_DEFAULT_LIMIT, DOCUMENT_SUMMARY_PREVIEW_CHARS} from './serviceConstants.js';
import {deleteStoredFile} from '../storage/localFileStorage.js';
import type {ResultSetHeader} from 'mysql2';
import type {DocumentIndexingStatus, DocumentSummaryStatus} from './documentTypes.js';

export interface Document {
    id?: number;
    user_id?: number | null;
    knowledge_base_id?: number | null;
    title: string;
    content: string;
    file_path?: string;
    file_type?: string;
    indexing_status?: DocumentIndexingStatus;
    indexed_at?: Date | null;
    summary?: string | null;
    summary_status?: DocumentSummaryStatus;
    summary_at?: Date | null;
    created_at?: Date;
    updated_at?: Date;
}

export type DocumentListItem = {
    id: number;
    user_id: number;
    knowledge_base_id: number;
    title: string;
    file_path?: string | null;
    file_type?: string | null;
    indexing_status: DocumentIndexingStatus;
    summary_status: DocumentSummaryStatus;
    summary_preview: string | null;
    created_at: Date;
    updated_at: Date;
};

export type CatalogDocumentEntry = {
    id: number;
    title: string;
    summary_status: DocumentSummaryStatus;
    indexing_status: DocumentIndexingStatus;
    summary: string | null;
};

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
            `INSERT INTO documents (
                user_id, knowledge_base_id, title, content, file_path, file_type,
                indexing_status, summary_status
             ) VALUES (?, ?, ?, ?, ?, ?, 'none', 'none')`,
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

    async listDocumentsInKnowledgeBase(userId: number, knowledgeBaseId: number): Promise<DocumentListItem[]> {
        const [rows] = await pool.query(
            `SELECT id, user_id, knowledge_base_id, title, file_path, file_type,
                    indexing_status, summary_status,
                    CASE WHEN summary IS NOT NULL AND CHAR_LENGTH(summary) > 0
                         THEN LEFT(summary, ?) ELSE NULL END AS summary_preview,
                    created_at, updated_at
             FROM documents
             WHERE user_id = ? AND knowledge_base_id = ?
               AND (origin IS NULL OR origin = 'knowledge_base')
             ORDER BY created_at DESC`,
            [DOCUMENT_SUMMARY_PREVIEW_CHARS, userId, knowledgeBaseId]
        );
        return rows as DocumentListItem[];
    }

    async listCatalogEntries(userId: number, knowledgeBaseId: number): Promise<CatalogDocumentEntry[]> {
        const [rows] = await pool.query(
            `SELECT id, title, summary_status, indexing_status, summary
             FROM documents
             WHERE user_id = ? AND knowledge_base_id = ?
             ORDER BY id ASC`,
            [userId, knowledgeBaseId]
        );
        return rows as CatalogDocumentEntry[];
    }

    async beginSummarize(userId: number, knowledgeBaseId: number, documentId: number): Promise<'ok' | 'pending' | 'missing'> {
        const doc = await this.getDocumentScoped(documentId, userId, knowledgeBaseId);
        if (!doc) return 'missing';
        if (doc.summary_status === 'pending') return 'pending';
        await pool.query(
            `UPDATE documents SET summary_status = 'pending', updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ? AND knowledge_base_id = ?`,
            [documentId, userId, knowledgeBaseId]
        );
        return 'ok';
    }

    async beginIndex(userId: number, knowledgeBaseId: number, documentId: number): Promise<'ok' | 'pending' | 'missing'> {
        const doc = await this.getDocumentScoped(documentId, userId, knowledgeBaseId);
        if (!doc) return 'missing';
        if (doc.indexing_status === 'pending') return 'pending';
        await pool.query(
            `UPDATE documents SET indexing_status = 'pending', updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ? AND knowledge_base_id = ?`,
            [documentId, userId, knowledgeBaseId]
        );
        return 'ok';
    }

    async markSummaryReady(
        documentId: number,
        userId: number,
        knowledgeBaseId: number,
        summary: string
    ): Promise<void> {
        await pool.query(
            `UPDATE documents
             SET summary = ?, summary_status = 'ready', summary_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ? AND knowledge_base_id = ?`,
            [summary, documentId, userId, knowledgeBaseId]
        );
    }

    async markSummaryFailed(documentId: number, userId: number, knowledgeBaseId: number): Promise<void> {
        await pool.query(
            `UPDATE documents SET summary_status = 'failed', updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ? AND knowledge_base_id = ?`,
            [documentId, userId, knowledgeBaseId]
        );
    }

    async markIndexingReady(documentId: number, userId: number, knowledgeBaseId: number): Promise<void> {
        await pool.query(
            `UPDATE documents
             SET indexing_status = 'indexed', indexed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ? AND knowledge_base_id = ?`,
            [documentId, userId, knowledgeBaseId]
        );
    }

    async markIndexingFailed(documentId: number, userId: number, knowledgeBaseId: number): Promise<void> {
        await pool.query(
            `UPDATE documents SET indexing_status = 'failed', updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ? AND knowledge_base_id = ?`,
            [documentId, userId, knowledgeBaseId]
        );
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

    async processAndSaveDocument(
        filePath: string,
        title: string,
        userId: number,
        knowledgeBaseId: number
    ): Promise<number> {
        const content = (await parseDocumentFile(filePath)).trim();
        if (!content) {
            throw new Error('文件解析后内容为空（请检查是否为扫描版 PDF 或空文档）');
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

            return documentId;
        } catch (e) {
            if (documentId != null) {
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
        limit: number = DOCUMENT_LIST_DEFAULT_LIMIT
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
