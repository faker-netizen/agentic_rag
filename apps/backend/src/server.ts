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
import skillsRoutes from './routes/skills.js';
import agentMinRoutes from './routes/agentMin.js';
import authRoutes from './routes/auth.js';
import { requireAuth } from './middleware/requireAuth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

/** dev / preview：5173=vite dev，4173=vite preview */
const DEFAULT_DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:4174'];

function parseCorsOrigins(): string[] {
    const raw = process.env.CORS_ORIGIN;
    if (raw) {
        return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return DEFAULT_DEV_ORIGINS;
}

const allowedOrigins = parseCorsOrigins();

// 中间件
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS blocked origin: ${origin}`));
            }
        },
        credentials: true,
    })
);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/knowledge-bases', requireAuth, knowledgeBaseRoutes);
app.use('/api/rag', requireAuth, ragRoutes);
app.use('/api/chat', requireAuth, chatRoutes);
app.use('/api/skills', requireAuth, skillsRoutes);
app.use('/api/agent', requireAuth, agentMinRoutes);

// 错误处理中间件
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('服务器错误:', err);
  const status =
    err && typeof err === 'object' && 'status' in err && typeof (err as {status: unknown}).status === 'number'
      ? (err as {status: number}).status
      : 500;
  const message = err instanceof Error ? err.message : '服务器内部错误';
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && err instanceof Error && { stack: err.stack })
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
      console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
      console.log(`健康检查: http://localhost:${PORT}/health`);
      console.log(`知识库与文档API: http://localhost:${PORT}/api/knowledge-bases`);
      console.log(`RAG API: http://localhost:${PORT}/api/rag`);
      console.log(`Chat API: http://localhost:${PORT}/api/chat`);
      console.log(`Min Agent (tool_calls): http://localhost:${PORT}/api/agent/min`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
