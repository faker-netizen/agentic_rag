import type {ChatSource} from "../services/chatService.js";
import type {ChatHistoryTurn, SseEmitter} from "../services/chatStreamHelpers.js";

export type DomainSkillId = "kb-rag" | "bullet-extract" | "kb-catalog";

export type DomainSkillDef = {
    id: DomainSkillId;
    name: string;
    description: string;
    requiresKb: boolean;
    systemPolicy: string;
    allowedTools: readonly string[];
};

export type SkillScope = {
    userId: number;
    knowledgeBaseId: number;
};

export type DomainSkillRunParams = {
    skillId: DomainSkillId;
    userId: number;
    knowledgeBaseId: number;
    query: string;
    history: ChatHistoryTurn[];
    sse: SseEmitter;
    signal?: AbortSignal;
};

export type DomainSkillRunResult = {
    answer: string;
    sources: ChatSource[] | null;
    aborted?: boolean;
};

export class DomainSkillError extends Error {
    constructor(
        message: string,
        readonly code: string
    ) {
        super(message);
        this.name = "DomainSkillError";
    }
}

export type StatusPhase =
    | "started"
    | "searching"
    | "listing"
    | "reading"
    | "analyzing"
    | "writing"
    | "failed";
