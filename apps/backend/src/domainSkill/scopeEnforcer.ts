import knowledgeBaseService from "../services/knowledgeBaseService.js";
import {DomainSkillError} from "./types.js";
import type {DomainSkillDef} from "./types.js";

export async function assertKbScope(userId: number, knowledgeBaseId: number | null): Promise<number> {
    if (knowledgeBaseId == null) {
        throw new DomainSkillError("请先绑定或选择知识库", "KB_REQUIRED");
    }
    const kb = await knowledgeBaseService.getOwned(userId, knowledgeBaseId);
    if (!kb) throw new DomainSkillError("知识库不存在或无权访问", "KB_FORBIDDEN");
    return kb.id;
}

export function assertSkillAllowsKb(skill: DomainSkillDef, kbId: number | null): void {
    if (skill.requiresKb && kbId == null) {
        throw new DomainSkillError("该 Skill 需要知识库", "KB_REQUIRED");
    }
}
