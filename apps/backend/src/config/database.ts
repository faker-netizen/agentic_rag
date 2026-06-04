import mysql from 'mysql2/promise';
import type {RowDataPacket} from 'mysql2';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import {migrateDocumentsIndexSummary} from './migrateDocumentsIndexSummary.js';

dotenv.config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rag_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 测试数据库连接
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('数据库连接成功');
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
  }
};

async function tableHasColumn(
  connection: mysql.PoolConnection,
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

async function migrateKnowledgeBaseSchema(connection: mysql.PoolConnection): Promise<void> {
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

async function createUserAuthTables(connection: mysql.PoolConnection): Promise<void> {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash CHAR(64) NOT NULL,
      jti CHAR(36) NOT NULL,
      revoked_at TIMESTAMP NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      replaced_by_token_hash CHAR(64) NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_token_hash (token_hash),
      KEY idx_user_id (user_id),
      KEY idx_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function createDocumentTables(connection: mysql.PoolConnection): Promise<void> {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      file_path VARCHAR(255),
      file_type VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS embeddings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      document_id INT NOT NULL,
      chunk_text TEXT NOT NULL,
      embedding JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function migrateChatMessagesSkillId(connection: mysql.PoolConnection): Promise<void> {
  if (!(await tableHasColumn(connection, 'chat_messages', 'skill_id'))) {
    await connection.query(
      "ALTER TABLE chat_messages ADD COLUMN skill_id VARCHAR(64) NULL AFTER content"
    );
  }
}

async function createChatTables(connection: mysql.PoolConnection): Promise<void> {
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

async function createUploadSessionsTable(connection: mysql.PoolConnection): Promise<void> {
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

async function createFileFingerprintsTable(connection: mysql.PoolConnection): Promise<void> {
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

async function createUploadTables(connection: mysql.PoolConnection): Promise<void> {
  await createUploadSessionsTable(connection);
  await createFileFingerprintsTable(connection);
}

async function createChatAndUploadTables(connection: mysql.PoolConnection): Promise<void> {
  await createChatTables(connection);
  await migrateChatMessagesSkillId(connection);
  await createUploadTables(connection);
}

async function seedAdminUser(connection: mysql.PoolConnection): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return;

  const [rows] = await connection.query(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [adminEmail]
  );
  const existing = rows as Array<{ id: number }>;
  if (existing.length) return;

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await connection.query(
    'INSERT INTO users (email, password_hash) VALUES (?, ?)',
    [adminEmail, passwordHash]
  );
  console.log(`已创建初始管理员账号: ${adminEmail}`);
}

// 初始化数据库表
export const initializeTables = async (): Promise<void> => {
  try {
    const connection = await pool.getConnection();

    await createUserAuthTables(connection);
    await createDocumentTables(connection);
    await migrateKnowledgeBaseSchema(connection);
    await migrateDocumentsIndexSummary(connection);
    await createChatAndUploadTables(connection);
    await seedAdminUser(connection);

    connection.release();
    console.log('数据库表初始化成功');
  } catch (error) {
    console.error('数据库表初始化失败:', error);
    throw error;
  }
};

export default pool;
