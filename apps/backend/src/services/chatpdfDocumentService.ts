import pool from "../config/database.js";
import type {ResultSetHeader} from "mysql2";
import {deleteStoredFile} from "../storage/localFileStorage.js";
import {parsePdfFileToPages} from "./pdfPageParserService.js";
import {
    DOCUMENT_ORIGIN_CHATPDF,
    type ChatPdfDocumentRow,
    type DocumentPageRow,
    type PdfCitation,
    type PdfSummaryPayload,
} from "./chatpdfTypes.js";

class ChatPdfDocumentService {
    async createFromUpload(
        userId: number,
        title: string,
        filePath: string
    ): Promise<{documentId: number; pageCount: number}> {
        const [insert] = await pool.query<ResultSetHeader>(
            `INSERT INTO documents (
                user_id, knowledge_base_id, title, content, file_path, file_type,
                origin, parse_status, indexing_status, summary_status
             ) VALUES (?, NULL, ?, '', ?, '.pdf', ?, 'pending', 'none', 'none')`,
            [userId, title, filePath, DOCUMENT_ORIGIN_CHATPDF]
        );
        const documentId = insert.insertId;
        try {
            return await this.parseAndStorePages(documentId, userId, filePath);
        } catch (e) {
            await this.deleteChatPdfDocument(userId, documentId);
            await deleteStoredFile(filePath);
            throw e;
        }
    }

    async parseAndStorePages(
        documentId: number,
        userId: number,
        filePath: string
    ): Promise<{documentId: number; pageCount: number}> {
        const doc = await this.getOwnedChatPdf(userId, documentId);
        if (!doc) throw new Error("文档不存在");

        const {pageCount, pages, fullText} = await parsePdfFileToPages(filePath);
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            await conn.query("DELETE FROM document_pages WHERE document_id = ?", [documentId]);
            for (const p of pages) {
                await conn.query(
                    `INSERT INTO document_pages (document_id, page_number, text, char_count)
                     VALUES (?, ?, ?, ?)`,
                    [documentId, p.page_number, p.text, p.text.length]
                );
            }
            await conn.query(
                `UPDATE documents
                 SET content = ?, page_count = ?, parse_status = 'ready', updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND user_id = ? AND origin = ?`,
                [fullText, pageCount, documentId, userId, DOCUMENT_ORIGIN_CHATPDF]
            );
            await conn.commit();
        } catch (e) {
            await conn.rollback();
            await pool.query(
                `UPDATE documents SET parse_status = 'failed' WHERE id = ? AND user_id = ?`,
                [documentId, userId]
            );
            throw e;
        } finally {
            conn.release();
        }
        return {documentId, pageCount};
    }

    async getOwnedChatPdf(userId: number, documentId: number): Promise<ChatPdfDocumentRow | null> {
        const [rows] = await pool.query(
            `SELECT id, user_id, title, file_path, file_type, page_count, parse_status, created_at, updated_at
             FROM documents
             WHERE id = ? AND user_id = ? AND origin = ? LIMIT 1`,
            [documentId, userId, DOCUMENT_ORIGIN_CHATPDF]
        );
        const list = rows as ChatPdfDocumentRow[];
        return list[0] ?? null;
    }

    async listForUser(userId: number): Promise<ChatPdfDocumentRow[]> {
        const [rows] = await pool.query(
            `SELECT id, user_id, title, file_path, file_type, page_count, parse_status, created_at, updated_at
             FROM documents
             WHERE user_id = ? AND origin = ?
             ORDER BY updated_at DESC`,
            [userId, DOCUMENT_ORIGIN_CHATPDF]
        );
        return rows as ChatPdfDocumentRow[];
    }

    async getPages(documentId: number, userId: number): Promise<DocumentPageRow[]> {
        const doc = await this.getOwnedChatPdf(userId, documentId);
        if (!doc) return [];
        const [rows] = await pool.query(
            `SELECT page_number, text FROM document_pages
             WHERE document_id = ? ORDER BY page_number ASC`,
            [documentId]
        );
        return rows as DocumentPageRow[];
    }

    async getSummary(documentId: number, userId: number): Promise<PdfSummaryPayload | null> {
        const doc = await this.getOwnedChatPdf(userId, documentId);
        if (!doc) return null;
        const [rows] = await pool.query(
            `SELECT bullets_json, citations_json FROM document_pdf_summaries WHERE document_id = ?`,
            [documentId]
        );
        const list = rows as Array<{
            bullets_json: PdfSummaryPayload["bullets"];
            citations_json: PdfCitation[];
        }>;
        if (!list.length) return null;
        return {bullets: list[0].bullets_json, citations: list[0].citations_json};
    }

    async saveSummary(documentId: number, userId: number, payload: PdfSummaryPayload): Promise<void> {
        const doc = await this.getOwnedChatPdf(userId, documentId);
        if (!doc) throw new Error("文档不存在");
        await pool.query(
            `INSERT INTO document_pdf_summaries (document_id, bullets_json, citations_json)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE bullets_json = VALUES(bullets_json),
               citations_json = VALUES(citations_json),
               updated_at = CURRENT_TIMESTAMP`,
            [documentId, JSON.stringify(payload.bullets), JSON.stringify(payload.citations)]
        );
    }

    async deleteChatPdfDocument(userId: number, documentId: number): Promise<boolean> {
        const doc = await this.getOwnedChatPdf(userId, documentId);
        if (!doc) return false;
        const [r] = await pool.query<ResultSetHeader>(
            "DELETE FROM documents WHERE id = ? AND user_id = ? AND origin = ?",
            [documentId, userId, DOCUMENT_ORIGIN_CHATPDF]
        );
        if (r.affectedRows > 0) await deleteStoredFile(doc.file_path);
        return r.affectedRows > 0;
    }
}

export default new ChatPdfDocumentService();
