import express from "express";
import multer from "multer";
import path from "path";
import {fileURLToPath} from "url";
import fs from "fs/promises";
import chatpdfDocumentService from "../services/chatpdfDocumentService.js";
import pdfSummarizeService from "../services/pdfSummarizeService.js";
import {decodeMultipartUtf8} from "../utils/multipartUtf8.js";
import {parseRouteParamId, requireUserId} from "../utils/routeHelpers.js";
import {isManagedLocalPath} from "../storage/localFileStorage.js";
import {bindRequestAbort, setupSseResponse, writeSseEvent} from "../utils/sse.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path.join(__dirname, "../../uploads"));
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const safeName = decodeMultipartUtf8(file.originalname);
        cb(null, `chatpdf-${uniqueSuffix}${path.extname(safeName)}`);
    },
});

const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        const original = decodeMultipartUtf8(file.originalname);
        Object.assign(file, {originalname: original});
        const ext = path.extname(original).toLowerCase();
        if (ext === ".pdf") cb(null, true);
        else cb(new Error(`仅支持 PDF 文件: ${ext}`));
    },
    limits: {fileSize: 50 * 1024 * 1024},
});

/** GET /api/chatpdf/documents */
router.get("/documents", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const documents = await chatpdfDocumentService.listForUser(userId);
        res.json({success: true, documents});
    } catch (e) {
        console.error("list chatpdf documents failed:", e);
        res.status(500).json({error: "获取文档列表失败"});
    }
});

/** POST /api/chatpdf/upload */
router.post("/upload", upload.single("file"), async (req, res) => {
    const uploadedPath = req.file?.path;
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        if (!req.file || !uploadedPath) {
            return res.status(400).json({error: "没有上传文件"});
        }
        const title =
            decodeMultipartUtf8(
                typeof req.body?.title === "string" ? req.body.title.trim() : ""
            ) || decodeMultipartUtf8(req.file.originalname) || "未命名";
        const result = await chatpdfDocumentService.createFromUpload(
            userId,
            title,
            uploadedPath
        );
        res.json({success: true, ...result});
    } catch (e) {
        if (uploadedPath) await fs.unlink(uploadedPath).catch(() => undefined);
        console.error("chatpdf upload failed:", e);
        const msg = e instanceof Error ? e.message : "上传失败";
        res.status(500).json({error: msg});
    }
});

/** GET /api/chatpdf/documents/:docId/file */
router.get("/documents/:docId/file", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const docId = parseRouteParamId(req.params.docId);
        if (docId == null) return res.status(400).json({error: "无效的文档 id"});
        const doc = await chatpdfDocumentService.getOwnedChatPdf(userId, docId);
        if (!doc?.file_path || !isManagedLocalPath(doc.file_path)) {
            return res.status(404).json({error: "文件不存在"});
        }
        res.setHeader("Content-Type", "application/pdf");
        res.sendFile(path.resolve(doc.file_path));
    } catch (e) {
        console.error("chatpdf file stream failed:", e);
        res.status(500).json({error: "读取文件失败"});
    }
});

/** GET /api/chatpdf/documents/:docId/summary */
router.get("/documents/:docId/summary", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const docId = parseRouteParamId(req.params.docId);
        if (docId == null) return res.status(400).json({error: "无效的文档 id"});
        const summary = await chatpdfDocumentService.getSummary(docId, userId);
        if (!summary) return res.status(404).json({error: "暂无总结"});
        res.json({success: true, summary});
    } catch (e) {
        console.error("get chatpdf summary failed:", e);
        res.status(500).json({error: "获取总结失败"});
    }
});

/** POST /api/chatpdf/documents/:docId/summarize — SSE */
router.post("/documents/:docId/summarize", async (req, res) => {
    const userId = requireUserId(req, res);
    if (userId == null) return;
    const docId = parseRouteParamId(req.params.docId);
    if (docId == null) return res.status(400).json({error: "无效的文档 id"});

    setupSseResponse(res);
    const {cleanup} = bindRequestAbort(req);

    try {
        writeSseEvent(res, "status", {phase: "started", label: "开始生成总结"});
        writeSseEvent(res, "status", {phase: "writing", label: "正在分析文档…"});
        const summary = await pdfSummarizeService.summarizeDocument(docId, userId);
        writeSseEvent(res, "summary", {summary});
        writeSseEvent(res, "done", {});
    } catch (e) {
        const msg = e instanceof Error ? e.message : "总结失败";
        writeSseEvent(res, "error", {message: msg});
    } finally {
        cleanup();
        if (!res.writableEnded) res.end();
    }
});

export default router;
