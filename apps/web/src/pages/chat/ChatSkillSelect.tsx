import {Select, Typography} from "antd";
import type {DomainSkillItem} from "@/service/skillsApi.ts";

type ChatSkillSelectProps = {
    skills: DomainSkillItem[];
    selectedSkillId: string | null;
    sending: boolean;
    onSkillChange: (id: string | null) => void;
};

export default function ChatSkillSelect({
    skills,
    selectedSkillId,
    sending,
    onSkillChange,
}: ChatSkillSelectProps) {
    if (skills.length === 0) return null;
    return (
        <div className="chat-skill-select">
            <Typography.Text type="secondary" style={{marginRight: 8}}>
                Skill
            </Typography.Text>
            <Select
                allowClear
                placeholder="不选：自动问答；概览：全库摘要汇总"
                style={{minWidth: 200}}
                value={selectedSkillId ?? undefined}
                onChange={(v) => onSkillChange(v ?? null)}
                disabled={sending}
                options={skills.map((s) => ({value: s.id, label: s.name}))}
            />
        </div>
    );
}
