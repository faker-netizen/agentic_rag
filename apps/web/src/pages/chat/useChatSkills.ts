import {useCallback, useState} from "react";
import {listDomainSkills, type DomainSkillItem} from "@/service/skillsApi.ts";

export function useChatSkills() {
    const [skills, setSkills] = useState<DomainSkillItem[]>([]);
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);

    const loadSkills = useCallback(async () => {
        if (loaded) return;
        try {
            const list = await listDomainSkills();
            setSkills(list);
        } catch {
            setSkills([]);
        } finally {
            setLoaded(true);
        }
    }, [loaded]);

    return {skills, selectedSkillId, setSelectedSkillId, loadSkills, loaded};
}
