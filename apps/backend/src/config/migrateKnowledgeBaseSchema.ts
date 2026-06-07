import type {PoolConnection} from 'mysql2/promise';
import {tableHasColumn} from './dbSchemaUtils.js';

export async function migrateKnowledgeBaseSchema(connection: PoolConnection): Promise<void> {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS knowledge_bases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      KEY idx_kb_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  if (!(await tableHasColumn(connection, 'documents', 'user_id'))) {
    await connection.query(
      'ALTER TABLE documents ADD COLUMN user_id INT NULL, ADD KEY idx_documents_user (user_id)'
    );
    await connection.query(`
      ALTER TABLE documents
        ADD CONSTRAINT fk_documents_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
  }

  if (!(await tableHasColumn(connection, 'documents', 'knowledge_base_id'))) {
    await connection.query(
      'ALTER TABLE documents ADD COLUMN knowledge_base_id INT NULL, ADD KEY idx_documents_kb (knowledge_base_id)'
    );
    await connection.query(`
      ALTER TABLE documents
        ADD CONSTRAINT fk_documents_kb
        FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE
    `);
  }
}
