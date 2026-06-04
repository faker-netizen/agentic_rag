import type {PoolConnection} from "mysql2/promise";
import type {RowDataPacket} from "mysql2";

async function tableHasColumn(
    connection: PoolConnection,
    table: string,
    column: string
): Promise<boolean> {
    const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
        [table, column]
    );
    return rows.length > 0;
}

export async function migrateDocumentsIndexSummary(connection: PoolConnection): Promise<void> {
    if (!(await tableHasColumn(connection, "documents", "indexing_status"))) {
        await connection.query(`
      ALTER TABLE documents
        ADD COLUMN indexing_status VARCHAR(16) NOT NULL DEFAULT 'none',
        ADD COLUMN indexed_at TIMESTAMP NULL DEFAULT NULL,
        ADD COLUMN summary TEXT NULL,
        ADD COLUMN summary_status VARCHAR(16) NOT NULL DEFAULT 'none',
        ADD COLUMN summary_at TIMESTAMP NULL DEFAULT NULL
    `);
    }

    await connection.query(`
    UPDATE documents d
    SET d.indexing_status = 'indexed',
        d.indexed_at = COALESCE(d.updated_at, d.created_at)
    WHERE d.indexing_status = 'none'
      AND EXISTS (SELECT 1 FROM embeddings e WHERE e.document_id = d.id)
  `);
}
