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

async function tableExists(connection: PoolConnection, table: string): Promise<boolean> {
    const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
        [table]
    );
    return rows.length > 0;
}

export async function migrateChatPdfSchema(connection: PoolConnection): Promise<void> {
    if (!(await tableHasColumn(connection, "documents", "origin"))) {
        await connection.query(`
            ALTER TABLE documents
              ADD COLUMN origin VARCHAR(16) NOT NULL DEFAULT 'knowledge_base',
              ADD COLUMN page_count INT NULL,
              ADD COLUMN parse_status VARCHAR(16) NOT NULL DEFAULT 'none'
        `);
    }

    if (!(await tableExists(connection, "document_pages"))) {
        await connection.query(`
            CREATE TABLE document_pages (
              id INT AUTO_INCREMENT PRIMARY KEY,
              document_id INT NOT NULL,
              page_number INT NOT NULL,
              text TEXT NOT NULL,
              char_count INT NOT NULL DEFAULT 0,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY uniq_doc_page (document_id, page_number),
              FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    }

    if (!(await tableExists(connection, "document_pdf_summaries"))) {
        await connection.query(`
            CREATE TABLE document_pdf_summaries (
              document_id INT PRIMARY KEY,
              bullets_json JSON NOT NULL,
              citations_json JSON NOT NULL,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    }
}
