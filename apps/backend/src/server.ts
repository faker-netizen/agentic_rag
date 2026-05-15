import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { testConnection, initializeTables } from './config/database.js';
import knowledgeBaseRoutes from './routes/knowledgeBases.js';
import ragRoutes from './routes/rag.js';
import chatRoutes from './routes/chat.js';
import authRoutes from './routes/auth.js';
import { requireAuth } from './middleware/requireAuth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/knowledge-bases', requireAuth, knowledgeBaseRoutes);
app.use('/api/rag', requireAuth, ragRoutes);
app.use('/api/chat', requireAuth, chatRoutes);

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 初始化数据库并启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('无法连接到数据库，服务器启动失败');
      process.exit(1);
    }

    // 初始化数据库表
    await initializeTables();

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log(`健康检查: http://localhost:${PORT}/health`);
      console.log(`知识库与文档API: http://localhost:${PORT}/api/knowledge-bases`);
      console.log(`RAG API: http://localhost:${PORT}/api/rag`);
      console.log(`Chat API: http://localhost:${PORT}/api/chat`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
