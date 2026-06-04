import type {DomainSkillDef, DomainSkillId} from "./types.js";

export const SKILL_ID_KB_RAG = "kb-rag" as const;
export const SKILL_ID_BULLET_EXTRACT = "bullet-extract" as const;
export const SKILL_ID_KB_CATALOG = "kb-catalog" as const;

const BUILTIN: DomainSkillDef[] = [
    {
        id: SKILL_ID_KB_RAG,
        name: "知识库问答",
        description: "在知识库文档中检索并给出带引用的回答",
        requiresKb: true,
        systemPolicy: "",
        allowedTools: ["kb_search"],
    },
    {
        id: SKILL_ID_BULLET_EXTRACT,
        name: "要点清单提取",
        description: "检索相关文档并输出分条要点清单",
        requiresKb: true,
        systemPolicy:
            "在回答末尾以「## 要点清单」为标题，用 markdown 无序列表列出 3～8 条要点；每条一句话，须基于参考上下文。",
        allowedTools: ["kb_search"],
    },
    {
        id: SKILL_ID_KB_CATALOG,
        name: "知识库概览",
        description: "列举知识库内文档，基于已生成的文档摘要做全库汇总",
        requiresKb: true,
        systemPolicy: "",
        allowedTools: ["list_kb_documents", "get_document_summary"],
    },
];

const BY_ID = new Map<string, DomainSkillDef>(BUILTIN.map((s) => [s.id, s]));

export function listBuiltinSkills(): DomainSkillDef[] {
    return [...BUILTIN];
}

export function getSkillById(skillId: string): DomainSkillDef | null {
    return BY_ID.get(skillId) ?? null;
}

export function assertKnownSkillId(skillId: string): DomainSkillId {
    const skill = getSkillById(skillId);
    if (!skill) throw new Error(`未知的 Skill: ${skillId}`);
    return skill.id;
}
