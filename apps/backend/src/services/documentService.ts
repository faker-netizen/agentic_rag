import pool from '../config/database.js';
import {createEmbeddingsModel} from '../config/embeddings.js'
import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import ragService from './ragService.js';

// 文档类型定义
export interface Document {
    id?: number;
    title: string;
    content: string;
    file_path?: string;
    file_type?: string;
    created_at?: Date;
    updated_at?: Date;
}

// 文档块定义
export interface DocumentChunk {
    id?: number;
    document_id: number;
    chunk_text: string;
    embedding?: number[];
    created_at?: Date;
}

// 文档服务类
class DocumentService {
    // 保存文档
    async saveDocument(document: Document): Promise<number> {
        try {
            const [result] = await pool.query(
                'INSERT INTO documents (title, content, file_path, file_type) VALUES (?, ?, ?, ?)',
                [document.title, document.content, document.file_path, document.file_type]
            );
            return (result as any).insertId;
        } catch (error) {
            console.error('保存文档失败:', error);
            throw error;
        }
    }

    // 获取文档
    async getDocument(id: number): Promise<Document | null> {
        try {
            const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
            const documents = rows as Document[];
            return documents.length > 0 ? documents[0] : null;
        } catch (error) {
            console.error('获取文档失败:', error);
            throw error;
        }
    }

    // 获取所有文档
    async getAllDocuments(): Promise<Document[]> {
        try {
            const [rows] = await pool.query('SELECT * FROM documents ORDER BY created_at DESC');
            return rows as Document[];
        } catch (error) {
            console.error('获取文档列表失败:', error);
            throw error;
        }
    }

    // 删除文档
    async deleteDocument(id: number): Promise<boolean> {
        try {
            // 从RAG向量库中移除文档
            await ragService.deleteDocument(id);

            // 从数据库中删除文档
            const [result] = await pool.query('DELETE FROM documents WHERE id = ?', [id]);

            return (result as any).affectedRows > 0;
        } catch (error) {
            console.error('删除文档失败:', error);
            throw error;
        }
    }

    // 处理PDF文件
    async processPDF(filePath: string): Promise<string> {
        try {
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdf(dataBuffer);
            return data.text;
        } catch (error) {
            console.error('处理PDF文件失败:', error);
            throw error;
        }
    }

    // 处理Word文件
    async processWord(filePath: string): Promise<string> {
        try {
            const dataBuffer = await fs.readFile(filePath);
            const result = await mammoth.extractRawText({buffer: dataBuffer});
            return result.value;
        } catch (error) {
            console.error('处理Word文件失败:', error);
            throw error;
        }
    }

    // 处理文本文件
    async processText(filePath: string): Promise<string> {
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            console.error('处理文本文件失败:', error);
            throw error;
        }
    }

    // 根据文件类型处理文件
    async processFile(filePath: string, fileType: string): Promise<string> {
        const ext = path.extname(filePath).toLowerCase();

        if (ext === '.pdf') {
            return await this.processPDF(filePath);
        } else if (['.doc', '.docx'].includes(ext)) {
            return await this.processWord(filePath);
        } else if (['.txt', '.md'].includes(ext)) {
            return await this.processText(filePath);
        } else {
            throw new Error(`不支持的文件类型: ${ext}`);
        }
    }

    // 将文档分割成块
    chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
        const chunks: string[] = [];
        let start = 0;

        while (start < text.length) {
            const end = Math.min(start + chunkSize, text.length);
            chunks.push(text.slice(start, end));
            start = end - overlap;
        }

        return chunks;
    }

    // 保存文档块及其向量
    async saveDocumentChunks(documentId: number, chunks: string[]): Promise<void> {
        try {
            const embeddingsModel = createEmbeddingsModel();
            for (const chunk of chunks) {
                // 生成向量
                const embedding = await embeddingsModel.embedQuery(chunk);

                // 保存到数据库
                await pool.query(
                    'INSERT INTO embeddings (document_id, chunk_text, embedding) VALUES (?, ?, ?)',
                    [documentId, chunk, JSON.stringify(embedding)]
                );
            }
        } catch (error) {
            console.error('保存文档块失败:', error);
            throw error;
        }
    }

    // 处理并保存文档
    async processAndSaveDocument(filePath: string, title: string): Promise<number> {
        try {
            // 处理文件内容
            const content = await this.processFile(filePath, path.extname(filePath));

            // 保存文档
            const documentId = await this.saveDocument({
                title,
                content,
                file_path: filePath,
                file_type: path.extname(filePath)
            });

            // 使用RAG服务摄入文档
            await ragService.ingestDocument({
                text: content,
                documentId,
                title,
                source: filePath,
            });

            return documentId;
        } catch (error) {
            console.error('处理并保存文档失败:', error);
            throw error;
        }
    }

    // 搜索相关文档块
    async searchSimilarChunks(query: string, limit: number = 5): Promise<DocumentChunk[]> {
        try {
            // 使用RAG服务检索相关文档块
            const relevantChunks = await ragService.retrieveRelevantChunks(query, { k: limit });

            // 转换为DocumentChunk格式以保持API兼容性
            return relevantChunks.map((chunk, index) => ({
                id: index,
                document_id: chunk.metadata.documentId,
                chunk_text: chunk.content,
                similarity: chunk.score || 0,
            }));
        } catch (error) {
            console.error('搜索相似文档块失败:', error);
            throw error;
        }
    }

    // 计算余弦相似度
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        if (!denom) return 0;
        return dotProduct / denom;
    }
}

export default new DocumentService();
