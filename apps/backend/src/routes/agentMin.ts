import express from "express";
import {runMiniAgent} from "../agent/minAgent.js";

const router = express.Router();

function requireUserId(req: express.Request, res: express.Response): number | null {
    const uid = req.user?.id;
    if (uid == null || !Number.isFinite(uid)) {
        res.status(401).json({error: "未登录"});
        return null;
    }
    return uid;
}

/**
 * POST /api/agent/min  { message: string, maxSteps?: number }
 * 最小 tool_calls Agent 演示（需登录）。
 */
router.post("/min", async (req, res) => {
    const userId = requireUserId(req, res);
    if (userId == null) return;

    const body = req.body ?? {};
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
        return res.status(400).json({error: "message 不能为空"});
    }

    const maxSteps =
        typeof body.maxSteps === "number" && Number.isFinite(body.maxSteps) && body.maxSteps > 0
            ? Math.min(16, Math.floor(body.maxSteps))
            : undefined;

    try {
        const result = await runMiniAgent(message, {maxSteps});
        res.json({
            success: true,
            userId,
            ...result,
        });
    } catch (e) {
        console.error("min agent failed:", e);
        res.status(500).json({error: "Agent 执行失败"});
    }
});

export default router;
