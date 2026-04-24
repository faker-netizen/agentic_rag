# RAG服务使用说明

## 概述

本项目已完成从手写RAG到LangChain全流程RAG的重构，使用DeepSeek作为LLM和Embedding服务提供商。

## 核心服务

### ragService.ts

提供以下主要功能：

1. **ingestDocument**: 文档摄入
   - 使用LangChain的RecursiveCharacterTextSplitter分割文本
   - 使用DeepSeek的Embedding服务生成向量
   - 存储到MemoryVectorStore

2. **retrieveRelevantChunks**: 检索相关文档块
   - 支持按documentId过滤
   - 返回相关度分数和元数据

3. **answerWithRAG**: 使用RAG回答问题
   - 使用LangChain的retrieval chain
   - 结合检索到的文档内容生成回答

4. **deleteDocument**: 删除文档
   - 从向量存储中标记删除
   - 在检索时过滤已删除文档

## 环境变量配置

在`.env`文件中添加以下配置：

```env
# DeepSeek API配置
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_EMBEDDING_MODEL=text-embedding-3-small

# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=design_to_code

# 服务器配置
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

## API接口

### 文档管理

1. **上传文档**
   - POST `/api/documents/upload`
   - 支持的文件类型: .pdf, .doc, .docx, .txt, .md
   - 文件大小限制: 10MB

2. **获取所有文档**
   - GET `/api/documents`

3. **获取单个文档**
   - GET `/api/documents/:id`

4. **删除文档**
   - DELETE `/api/documents/:id`

### RAG查询

1. **查询接口**
   - POST `/api/rag/query`
   - 请求体: `{ "query": "你的问题" }`
   - 返回: `{ "success": true, "answer": "回答", "sources": [...] }`

## 技术栈

- **LangChain**: 用于构建RAG流程
- **DeepSeek**: 提供LLM和Embedding服务
- **MemoryVectorStore**: 向量存储（可后续切换到Qdrant）
- **RecursiveCharacterTextSplitter**: 文本分割
- **Express**: Web框架
- **MySQL**: 文档元数据存储

## 迁移说明

原有API保持不变，所有改动都在服务层完成：

- `processAndSaveDocument`: 现在使用ragService.ingestDocument
- `searchSimilarChunks`: 现在调用ragService.retrieveRelevantChunks
- `deleteDocument`: 现在调用ragService.deleteDocument

## 未来改进

1. 将MemoryVectorStore替换为Qdrant等持久化向量数据库
2. 添加文档更新功能
3. 支持更多文件类型
4. 添加流式响应支持
5. 优化检索策略（如混合检索）
