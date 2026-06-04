import {getSkillById, SKILL_ID_KB_CATALOG} from "./skillRegistry.js";
import {assertKbScope, assertSkillAllowsKb} from "./scopeEnforcer.js";
import {emitStatus} from "./emitStatus.js";
import {runSkillAgent} from "./runSkillAgent.js";
import {streamSkillRagAnswer} from "./streamSkillRag.js";
import {runKbCatalogSkill} from "./runKbCatalogSkill.js";
import {DomainSkillError} from "./types.js";
import type {DomainSkillRunParams, DomainSkillRunResult} from "./types.js";

export async function runDomainSkill(params: DomainSkillRunParams): Promise<DomainSkillRunResult> {
    const skill = getSkillById(params.skillId);
    if (!skill) throw new DomainSkillError(`未知的 Skill: ${params.skillId}`, "SKILL_NOT_FOUND");

    const kbId = await assertKbScope(params.userId, params.knowledgeBaseId);
    assertSkillAllowsKb(skill, kbId);

    if (skill.id === SKILL_ID_KB_CATALOG) {
        return runKbCatalogSkill({...params, knowledgeBaseId: kbId});
    }

    params.sse("skill", {skillId: skill.id, skillName: skill.name});
    emitStatus(params.sse, "started", "开始处理");
    emitStatus(params.sse, "searching", "正在检索…");

    await runSkillAgent(skill, {userId: params.userId, knowledgeBaseId: kbId}, params.query, params.signal);

    emitStatus(params.sse, "analyzing", "正在分析…");
    return streamSkillRagAnswer({
        skill,
        userId: params.userId,
        knowledgeBaseId: kbId,
        query: params.query,
        history: params.history,
        sse: params.sse,
        signal: params.signal,
    });
}
