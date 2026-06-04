import http from "@/service/request.ts";

export type DomainSkillItem = {
    id: string;
    name: string;
    description: string;
    requiresKb: boolean;
};

export async function listDomainSkills(): Promise<DomainSkillItem[]> {
    const res = await http.get<{success: boolean; skills: DomainSkillItem[]}>("/api/skills");
    return res.skills ?? [];
}
