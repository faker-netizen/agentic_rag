import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import documentService from '../services/documentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${ext}`));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 限制文件大小为10MB
  }
});

// 上传文档
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const title = req.body.title || req.file.originalname;
    const documentId = await documentService.processAndSaveDocument(req.file.path, title);

    res.json({
      success: true,
      documentId,
      message: '文档上传并处理成功'
    });
  } catch (error) {
    console.error('上传文档失败:', error);
    res.status(500).json({ error: '上传文档失败' });
  }
});

// 获取所有文档
router.get('/', async (req, res) => {
  try {
    const documents = await documentService.getAllDocuments();
    res.json({ success: true, documents });
  } catch (error) {
    console.error('获取文档列表失败:', error);
    res.status(500).json({ error: '获取文档列表失败' });
  }
});

// 获取单个文档
router.get('/:id', async (req, res) => {
  try {
    const document = await documentService.getDocument(Number(req.params.id));
    if (!document) {
      return res.status(404).json({ error: '文档不存在' });
    }
    res.json({ success: true, document });
  } catch (error) {
    console.error('获取文档失败:', error);
    res.status(500).json({ error: '获取文档失败' });
  }
});

// 删除文档
router.delete('/:id', async (req, res) => {
  try {
    const success = await documentService.deleteDocument(Number(req.params.id));
    if (success) {
      res.json({ success: true, message: '文档删除成功' });
    } else {
      res.status(404).json({ error: '文档不存在' });
    }
  } catch (error) {
    console.error('删除文档失败:', error);
    res.status(500).json({ error: '删除文档失败' });
  }
});

export default router;
