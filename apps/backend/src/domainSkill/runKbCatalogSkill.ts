import {assertKbScope, assertSkillAllowsKb} from "./scopeEnforcer.js";
import {emitStatus} from "./emitStatus.js";
import {getSkillById, SKILL_ID_KB_CATALOG} from "./skillRegistry.js";
import {loadCatalogEntries, streamCatalogAnswer} from "./streamCatalogAnswer.js";
import {DomainSkillError} from "./types.js";
import type {DomainSkillRunParams, DomainSkillRunResult} from "./types.js";

export async function runKbCatalogSkill(params: DomainSkillRunParams): Promise<DomainSkillRunResult> {
    const skill = getSkillById(SKILL_ID_KB_CATALOG);
    if (!skill) throw new DomainSkillError(`未知的 Skill: ${SKILL_ID_KB_CATALOG}`, "SKILL_NOT_FOUND");

    const kbId = await assertKbScope(params.userId, params.knowledgeBaseId);
    assertSkillAllowsKb(skill, kbId);

    params.sse("skill", {skillId: skill.id, skillName: skill.name});
    emitStatus(params.sse, "started", "开始处理");
    emitStatus(params.sse, "listing", "正在列举文档…");

    const entries = await loadCatalogEntries(params.userId, kbId);

    emitStatus(params.sse, "reading", "正在读取摘要…");

    return streamCatalogAnswer({
        userId: params.userId,
        knowledgeBaseId: kbId,
        query: params.query,
        history: params.history,
        entries,
        sse: params.sse,
        signal: params.signal,
    });
}
