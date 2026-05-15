import express from 'express';
import documentService from '../services/documentService.js';
import ragService from '../services/ragService.js';
import knowledgeBaseService from '../services/knowledgeBaseService.js';

const router = express.Router();

function parseId(raw: unknown): number | null {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
}

// RAG查询接口：必须指定 knowledgeBaseId，仅检索该库内文档
router.post('/query', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (userId == null || !Number.isFinite(userId)) {
            return res.status(401).json({error: '未登录'});
        }

        const {query, knowledgeBaseId: kbRaw} = req.body ?? {};
        if (!query || typeof query !== 'string') {
            return res.status(400).json({error: '查询内容不能为空'});
        }

        const knowledgeBaseId = parseId(kbRaw);
        if (knowledgeBaseId == null) {
            return res.status(400).json({error: 'knowledgeBaseId 无效'});
        }

        const kb = await knowledgeBaseService.getOwned(userId, knowledgeBaseId);
        if (!kb) {
            return res.status(404).json({error: '知识库不存在'});
        }

        const {answer, chunks: relevantChunks} = await ragService.answerWithRAG(query, {
            k: 3,
            userId,
            knowledgeBaseId,
        });

        if (relevantChunks.length === 0) {
            return res.json({
                success: true,
                answer: '抱歉，我没有找到相关的文档内容来回答您的问题。',
                sources: [],
            });
        }

        const sourceIds = [...new Set(relevantChunks.map((chunk) => chunk.metadata.documentId))];

        const sources = [];
        for (const id of sourceIds) {
            const doc = await documentService.getDocumentScoped(id, userId, knowledgeBaseId);
            if (doc) {
                sources.push({
                    id: doc.id,
                    title: doc.title,
                });
            }
        }

        res.json({
            success: true,
            answer,
            sources,
        });
    } catch (error) {
        console.error('RAG查询失败:', error);
        res.status(500).json({error: '查询失败'});
    }
});

export default router;
