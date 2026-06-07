import type {PoolConnection} from 'mysql2/promise';
import {tableHasColumn} from './dbSchemaUtils.js';

async function migrateChatMessagesSkillId(connection: PoolConnection): Promise<void> {
  if (!(await tableHasColumn(connection, 'chat_messages', 'skill_id'))) {
    await connection.query(
      "ALTER TABLE chat_messages ADD COLUMN skill_id VARCHAR(64) NULL AFTER content"
    );
  }
}

async function createChatTables(connection: PoolConnection): Promise<void> {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      knowledge_base_id INT NULL,
      title VARCHAR(255) NOT NULL DEFAULT '新会话',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE SET NULL,
      KEY idx_chat_sessions_user (user_id),
      KEY idx_chat_sessions_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id INT NOT NULL,
      role VARCHAR(20) NOT NULL,
      content MEDIUMTEXT NOT NULL,
      sources_json JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
      KEY idx_chat_messages_session (session_id, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function createUploadSessionsTable(connection: PoolConnection): Promise<void> {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS upload_sessions (
      file_id CHAR(32) PRIMARY KEY,
      user_id INT NOT NULL,
      knowledge_base_id INT NOT NULL,
      file_name VARCHAR(512) NOT NULL,
      file_size BIGINT NOT NULL,
      chunk_size INT NOT NULL,
      total_chunks INT NOT NULL,
      file_hash VARCHAR(128) NULL,
      title VARCHAR(255) NULL,
      status ENUM('uploading','merged','canceled') NOT NULL DEFAULT 'uploading',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
      KEY idx_upload_sessions_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS upload_chunks (
      file_id CHAR(32) NOT NULL,
      chunk_index INT NOT NULL,
      etag CHAR(32) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (file_id, chunk_index),
      FOREIGN KEY (file_id) REFERENCES upload_sessions(file_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function createFileFingerprintsTable(connection: PoolConnection): Promise<void> {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS file_fingerprints (
      user_id INT NOT NULL,
      knowledge_base_id INT NOT NULL,
      file_hash VARCHAR(128) NOT NULL,
      document_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, knowledge_base_id, file_hash),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export async function createChatAndUploadTables(connection: PoolConnection): Promise<void> {
  await createChatTables(connection);
  await migrateChatMessagesSkillId(connection);
  await createUploadSessionsTable(connection);
  await createFileFingerprintsTable(connection);
}
