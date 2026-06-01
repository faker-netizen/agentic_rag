import type {ResultSetHeader} from "mysql2";
import pool from "../config/database.js";

export type KnowledgeBaseRow = {
    id: number;
    user_id: number;
    name: string;
    description: string | null;
    created_at: Date;
    updated_at: Date;
};

class KnowledgeBaseService {
    async listForUser(userId: number): Promise<KnowledgeBaseRow[]> {
        const [rows] = await pool.query(
            "SELECT * FROM knowledge_bases WHERE user_id = ? ORDER BY created_at DESC",
            [userId]
        );
        return rows as KnowledgeBaseRow[];
    }

    async create(userId: number, name: string, description?: string | null): Promise<number> {
        const trimmed = name.trim();
        if (!trimmed) throw new Error("知识库名称不能为空");
        const [result] = await pool.query<ResultSetHeader>(
            "INSERT INTO knowledge_bases (user_id, name, description) VALUES (?, ?, ?)",
            [userId, trimmed, description ?? null]
        );
        return result.insertId;
    }

    async getOwned(userId: number, kbId: number): Promise<KnowledgeBaseRow | null> {
        const [rows] = await pool.query(
            "SELECT * FROM knowledge_bases WHERE id = ? AND user_id = ? LIMIT 1",
            [kbId, userId]
        );
        const list = rows as KnowledgeBaseRow[];
        return list[0] ?? null;
    }

    async delete(userId: number, kbId: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            "DELETE FROM knowledge_bases WHERE id = ? AND user_id = ?",
            [kbId, userId]
        );
        return result.affectedRows > 0;
    }
}

export default new KnowledgeBaseService();
