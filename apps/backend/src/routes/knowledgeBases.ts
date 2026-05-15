import express from 'express';
import multer from 'multer';
import path from 'path';
import {fileURLToPath} from 'url';
import knowledgeBaseService from '../services/knowledgeBaseService.js';
import documentService from '../services/documentService.js';
import {decodeMultipartUtf8} from '../utils/multipartUtf8.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const safeName = decodeMultipartUtf8(file.originalname);
        cb(null, uniqueSuffix + path.extname(safeName));
    },
});

const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        const original = decodeMultipartUtf8(file.originalname);
        Object.assign(file, {originalname: original});
        const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.md'];
        const ext = path.extname(original).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`不支持的文件类型: ${ext}`));
        }
    },
    limits: {fileSize: 10 * 1024 * 1024},
});

function requireUserId(req: express.Request, res: express.Response): number | null {
    const uid = req.user?.id;
    if (uid == null || !Number.isFinite(uid)) {
        res.status(401).json({error: '未登录'});
        return null;
    }
    return uid;
}

function parseKbId(raw: string | string[] | undefined): number | null {
    const s = Array.isArray(raw) ? raw[0] : raw;
    if (s == null || typeof s !== "string") return null;
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : null;
}

/** GET /api/knowledge-bases */
router.get('/', async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const list = await knowledgeBaseService.listForUser(userId);
        res.json({success: true, knowledgeBases: list});
    } catch (error) {
        console.error('list knowledge bases failed:', error);
        res.status(500).json({error: '获取知识库列表失败'});
    }
});

/** POST /api/knowledge-bases  { name, description? } */
router.post('/', async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const name = req.body?.name;
        if (!name || typeof name !== 'string') {
            return res.status(400).json({error: 'name 不能为空'});
        }
        const description = req.body?.description;
        const id = await knowledgeBaseService.create(
            userId,
            name,
            typeof description === 'string' ? description : undefined
        );
        res.status(201).json({success: true, id, message: '知识库已创建'});
    } catch (error) {
        console.error('create knowledge base failed:', error);
        res.status(500).json({error: '创建知识库失败'});
    }
});

/** GET /api/knowledge-bases/:kbId */
router.get('/:kbId', async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const kbId = parseKbId(req.params.kbId);
        if (kbId == null) return res.status(400).json({error: '无效的知识库 id'});
        const kb = await knowledgeBaseService.getOwned(userId, kbId);
        if (!kb) return res.status(404).json({error: '知识库不存在'});
        res.json({success: true, knowledgeBase: kb});
    } catch (error) {
        console.error('get knowledge base failed:', error);
        res.status(500).json({error: '获取知识库失败'});
    }
});

/** DELETE /api/knowledge-bases/:kbId */
router.delete('/:kbId', async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const kbId = parseKbId(req.params.kbId);
        if (kbId == null) return res.status(400).json({error: '无效的知识库 id'});
        const ok = await knowledgeBaseService.delete(userId, kbId);
        if (!ok) return res.status(404).json({error: '知识库不存在'});
        res.json({success: true, message: '知识库已删除'});
    } catch (error) {
        console.error('delete knowledge base failed:', error);
        res.status(500).json({error: '删除知识库失败'});
    }
});

/** GET /api/knowledge-bases/:kbId/documents */
router.get('/:kbId/documents', async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const kbId = parseKbId(req.params.kbId);
        if (kbId == null) return res.status(400).json({error: '无效的知识库 id'});
        const kb = await knowledgeBaseService.getOwned(userId, kbId);
        if (!kb) return res.status(404).json({error: '知识库不存在'});
        const documents = await documentService.listDocumentsInKnowledgeBase(userId, kbId);
        res.json({success: true, documents});
    } catch (error) {
        console.error('list documents failed:', error);
        res.status(500).json({error: '获取文档列表失败'});
    }
});

/** POST /api/knowledge-bases/:kbId/upload */
router.post('/:kbId/upload', upload.single('file'), async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const kbId = parseKbId(req.params.kbId);
        if (kbId == null) return res.status(400).json({error: '无效的知识库 id'});
        const kb = await knowledgeBaseService.getOwned(userId, kbId);
        if (!kb) return res.status(404).json({error: '知识库不存在'});
        if (!req.file) {
            return res.status(400).json({error: '没有上传文件'});
        }
        const rawTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
        const title =
            decodeMultipartUtf8(rawTitle) ||
            decodeMultipartUtf8(req.file.originalname) ||
            '未命名';
        const documentId = await documentService.processAndSaveDocument(
            req.file.path,
            title,
            userId,
            kbId
        );
        res.json({success: true, documentId, message: '文档上传并处理成功'});
    } catch (error) {
        console.error('upload document failed:', error);
        res.status(500).json({error: '上传文档失败'});
    }
});

/** GET /api/knowledge-bases/:kbId/documents/:docId */
router.get('/:kbId/documents/:docId', async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const kbId = parseKbId(req.params.kbId);
        const docId = parseKbId(req.params.docId);
        if (kbId == null || docId == null) {
            return res.status(400).json({error: '无效的 id'});
        }
        const kb = await knowledgeBaseService.getOwned(userId, kbId);
        if (!kb) return res.status(404).json({error: '知识库不存在'});
        const document = await documentService.getDocumentScoped(docId, userId, kbId);
        if (!document) return res.status(404).json({error: '文档不存在'});
        res.json({success: true, document});
    } catch (error) {
        console.error('get document failed:', error);
        res.status(500).json({error: '获取文档失败'});
    }
});

/** DELETE /api/knowledge-bases/:kbId/documents/:docId */
router.delete('/:kbId/documents/:docId', async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const kbId = parseKbId(req.params.kbId);
        const docId = parseKbId(req.params.docId);
        if (kbId == null || docId == null) {
            return res.status(400).json({error: '无效的 id'});
        }
        const kb = await knowledgeBaseService.getOwned(userId, kbId);
        if (!kb) return res.status(404).json({error: '知识库不存在'});
        const ok = await documentService.deleteDocumentScoped(userId, kbId, docId);
        if (!ok) return res.status(404).json({error: '文档不存在'});
        res.json({success: true, message: '文档删除成功'});
    } catch (error) {
        console.error('delete document failed:', error);
        res.status(500).json({error: '删除文档失败'});
    }
});

export default router;
