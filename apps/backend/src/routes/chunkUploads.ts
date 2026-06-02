import express from "express";
import multer from "multer";
import knowledgeBaseService from "../services/knowledgeBaseService.js";
import chunkUploadService from "../services/chunkUploadService.js";
import {parseRouteParamId, requireUserId} from "../utils/routeHelpers.js";
import {parsePrepareBody, type PrepareBodyInput} from "./chunkUploadPrepare.js";

type KbUploadParams = {kbId: string; fileId?: string};

const router = express.Router({mergeParams: true});

const chunkMem = multer({
    storage: multer.memoryStorage(),
    limits: {fileSize: 20 * 1024 * 1024},
});

async function assertKbOwned(userId: number, kbId: number): Promise<boolean> {
    const kb = await knowledgeBaseService.getOwned(userId, kbId);
    return kb != null;
}

async function respondUploadPrepare(
    res: express.Response,
    userId: number,
    body: PrepareBodyInput,
    kbId: number
): Promise<void> {
    const result = await chunkUploadService.prepare({
        userId,
        knowledgeBaseId: kbId,
        fileName: body.fileName,
        fileSize: body.fileSize,
        chunkSize: body.chunkSize,
        totalChunks: body.totalChunks,
        fileHash: body.fileHash,
        title: body.title,
        fileId: body.resumeFileId || undefined,
    });

    if (result.instant) {
        res.json({
            success: true,
            fileId: result.fileId,
            uploadedChunkIndexes: [],
            instant: true,
            documentId: result.documentId,
        });
        return;
    }

    const uploadedChunkIndexes =
        body.resumeFileId && result.uploadedChunkIndexes
            ? result.uploadedChunkIndexes
            : await chunkUploadService.listUploadedChunkIndexes(result.fileId, userId);

    res.json({success: true, fileId: result.fileId, uploadedChunkIndexes, instant: false});
}

async function handleUploadPrepare(req: express.Request, res: express.Response): Promise<void> {
    const userId = requireUserId(req, res);
    if (userId == null) return;
    const kbId = parseRouteParamId((req.params as KbUploadParams).kbId);
    if (kbId == null) {
        res.status(400).json({error: "无效的知识库 id"});
        return;
    }
    if (!(await assertKbOwned(userId, kbId))) {
        res.status(404).json({error: "知识库不存在"});
        return;
    }

    const parsed = parsePrepareBody(req.body);
    if (!parsed.ok) {
        res.status(400).json({error: parsed.error});
        return;
    }

    await respondUploadPrepare(res, userId, parsed.value, kbId);
}

/** POST /api/knowledge-bases/:kbId/uploads/prepare */
router.post("/prepare", async (req, res) => {
    try {
        await handleUploadPrepare(req, res);
    } catch (e) {
        const msg = e instanceof Error ? e.message : "初始化上传失败";
        console.error("upload prepare failed:", e);
        res.status(400).json({error: msg});
    }
});

/** POST /api/knowledge-bases/:kbId/uploads/chunk  multipart: chunk + fileId + chunkIndex */
router.post("/chunk", chunkMem.single("chunk"), async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const kbId = parseRouteParamId((req.params as KbUploadParams).kbId);
        if (kbId == null) return res.status(400).json({error: "无效的知识库 id"});

        const fileId = typeof req.body?.fileId === "string" ? req.body.fileId.trim() : "";
        const chunkIndex = Number(req.body?.chunkIndex);
        if (!fileId) return res.status(400).json({error: "fileId 不能为空"});
        if (!Number.isFinite(chunkIndex) || chunkIndex < 0) {
            return res.status(400).json({error: "chunkIndex 无效"});
        }
        if (!req.file?.buffer) {
            return res.status(400).json({error: "缺少分片数据 chunk"});
        }

        const session = await chunkUploadService.getSession(fileId, userId);
        if (!session || session.knowledge_base_id !== kbId) {
            return res.status(404).json({error: "上传任务不存在"});
        }

        const {etag} = await chunkUploadService.saveChunk(fileId, userId, chunkIndex, req.file.buffer);
        res.json({success: true, etag});
    } catch (e) {
        const msg = e instanceof Error ? e.message : "分片上传失败";
        console.error("upload chunk failed:", e);
        res.status(400).json({error: msg});
    }
});

/** POST /api/knowledge-bases/:kbId/uploads/merge  { fileId } */
router.post("/merge", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const kbId = parseRouteParamId((req.params as KbUploadParams).kbId);
        if (kbId == null) return res.status(400).json({error: "无效的知识库 id"});

        const fileId = typeof req.body?.fileId === "string" ? req.body.fileId.trim() : "";
        if (!fileId) return res.status(400).json({error: "fileId 不能为空"});

        const session = await chunkUploadService.getSession(fileId, userId);
        if (!session || session.knowledge_base_id !== kbId) {
            return res.status(404).json({error: "上传任务不存在"});
        }

        const {documentId, filePath} = await chunkUploadService.merge(fileId, userId);
        res.json({
            success: true,
            fileId,
            documentId,
            fileUrl: filePath,
            message: "文档上传并处理成功",
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "合并失败";
        console.error("upload merge failed:", e);
        res.status(400).json({error: msg});
    }
});

/** DELETE /api/knowledge-bases/:kbId/uploads/:fileId */
router.delete("/:fileId", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const fileId = typeof req.params.fileId === "string" ? req.params.fileId : "";
        if (!fileId) return res.status(400).json({error: "fileId 无效"});
        await chunkUploadService.cancel(fileId, userId);
        res.json({success: true});
    } catch (e) {
        console.error("upload cancel failed:", e);
        res.status(500).json({error: "取消上传失败"});
    }
});

/** GET /api/knowledge-bases/:kbId/uploads/:fileId/status */
router.get("/:fileId/status", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const fileId = typeof req.params.fileId === "string" ? req.params.fileId : "";
        const status = await chunkUploadService.getUploadStatus(fileId, userId);
        if (!status) {
            return res.status(404).json({error: "上传任务不存在或已结束"});
        }
        const {session, uploadedChunkIndexes} = status;
        res.json({
            success: true,
            fileId,
            uploadedChunkIndexes,
            fileName: session.file_name,
            fileSize: session.file_size,
            chunkSize: session.chunk_size,
            totalChunks: session.total_chunks,
            status: session.status,
        });
    } catch {
        res.status(500).json({error: "获取上传状态失败"});
    }
});

export default router;
