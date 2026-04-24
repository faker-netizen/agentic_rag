import express from 'express';
import documentService from '../services/documentService.js';
import ragService from '../services/ragService.js';

const router = express.Router();

// RAG查询接口
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: '查询内容不能为空' });
    }

    // 使用RAG服务回答问题
    const answer = await ragService.answerWithRAG(query, { k: 3 });

    // 检索相关文档块以获取来源信息
    const relevantChunks = await ragService.retrieveRelevantChunks(query, { k: 3 });

    if (relevantChunks.length === 0) {
      return res.json({
        success: true,
        answer: '抱歉，我没有找到相关的文档内容来回答您的问题。',
        sources: []
      });
    }

    // 提取来源文档ID
    const sourceIds = [...new Set(relevantChunks.map(chunk => chunk.metadata.documentId))];

    // 获取来源文档信息
    const sources = [];
    for (const id of sourceIds) {
      const doc = await documentService.getDocument(id);
      if (doc) {
        sources.push({
          id: doc.id,
          title: doc.title
        });
      }
    }

    res.json({
      success: true,
      answer,
      sources
    });
  } catch (error) {
    console.error('RAG查询失败:', error);
    res.status(500).json({ error: '查询失败' });
  }
});

export default router;
