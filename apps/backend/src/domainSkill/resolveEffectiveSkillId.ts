import {SKILL_ID_KB_RAG} from "./skillRegistry.js";

/** UI 未选 Skill 时：有 KB → 隐式 kb-rag；否则 null（plain） */
export function resolveEffectiveSkillId(
    requestSkillId: string | null | undefined,
    knowledgeBaseId: number | null
): string | null {
    if (requestSkillId != null && String(requestSkillId).trim() !== "") {
        return String(requestSkillId).trim();
    }
    if (knowledgeBaseId != null) return SKILL_ID_KB_RAG;
    return null;
}
