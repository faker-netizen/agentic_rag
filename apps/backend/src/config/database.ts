import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import {migrateDocumentsIndexSummary} from './migrateDocumentsIndexSummary.js';
import {migrateChatPdfSchema} from './migrateChatPdfSchema.js';
import {migrateKnowledgeBaseSchema} from './migrateKnowledgeBaseSchema.js';
import {createChatAndUploadTables} from './databaseChatUploadTables.js';

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
    await migrateChatPdfSchema(connection);
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
