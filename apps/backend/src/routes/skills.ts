import express from "express";
import {listBuiltinSkills} from "../domainSkill/skillRegistry.js";
import {requireUserId} from "../utils/routeHelpers.js";

const router = express.Router();

/** GET /api/skills — 内置业务域 Skill 列表 */
router.get("/", async (req, res) => {
    const userId = requireUserId(req, res);
    if (userId == null) return;
    const skills = listBuiltinSkills().map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        requiresKb: s.requiresKb,
    }));
    res.json({success: true, skills});
});

export default router;
