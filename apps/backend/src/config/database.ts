import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

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
console.log(dbConfig)
// 测试数据库连接
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('数据库连接成功');
    return true;
  } catch (error) {
    console.error('数据库连接失败111:', error);
    return false;
  }
};

// 初始化数据库表
export const initializeTables = async (): Promise<void> => {
  try {
    const connection = await pool.getConnection();

    // 创建文档表
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

    // 创建向量表
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

    connection.release();
    console.log('数据库表初始化成功');
  } catch (error) {
    console.error('数据库表初始化失败:', error);
    throw error;
  }
};

export default pool;
