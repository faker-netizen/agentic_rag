# RAG Backend for Design to Code

基于Node.js Express的最小可用RAG（检索增强生成）后端服务。

## 功能特性

- 文档上传与处理（支持PDF、Word、文本文件）
- 文档向量化存储
- 基于语义相似度的文档检索
- 使用OpenAI GPT进行问答
- MySQL数据库存储

## 技术栈

- Node.js
- Express
- TypeScript
- MySQL
- LangChain
- OpenAI API

## 安装

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
复制 `.env.example` 文件为 `.env`，并根据实际情况修改配置：
```bash
cp .env.example .env
```

3. 配置MySQL数据库：
确保MySQL服务已启动，并根据 `.env` 文件中的配置创建数据库：
```sql
CREATE DATABASE rag_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 运行

开发模式（使用tsx热重载）：
```bash
npm run dev
```

生产模式：
```bash
npm run build
npm start
```

## API接口

### 健康检查
```
GET /health
```

### 文档管理

#### 上传文档
```
POST /api/documents/upload
Content-Type: multipart/form-data

参数:
- file: 文件（支持PDF、Word、文本文件）
- title: 文档标题（可选，默认为文件名）
```

#### 获取所有文档
```
GET /api/documents
```

#### 获取单个文档
```
GET /api/documents/:id
```

#### 删除文档
```
DELETE /api/documents/:id
```

### RAG查询

#### 提问
```
POST /api/rag/query
Content-Type: application/json

请求体:
{
  "query": "你的问题"
}

响应:
{
  "success": true,
  "answer": "AI的回答",
  "sources": [
    {
      "id": 1,
      "title": "文档标题"
    }
  ]
}
```

## 数据库结构

### documents 表
存储上传的文档信息。

### embeddings 表
存储文档的文本块及其向量表示。

## 注意事项

1. 确保已配置有效的OpenAI API密钥
2. 上传的文件大小限制为10MB
3. 支持的文件类型：.pdf, .doc, .docx, .txt, .md
4. 首次运行时会自动创建数据库表

## 许可证

ISC
