import {SSE_STATUS_LABEL_MAX} from "../services/serviceConstants.js";
import type {SseEmitter} from "../services/chatStreamHelpers.js";
import type {StatusPhase} from "./types.js";

export function truncateStatusLabel(label: string): string {
    const t = label.trim();
    if (t.length <= SSE_STATUS_LABEL_MAX) return t;
    return t.slice(0, SSE_STATUS_LABEL_MAX);
}

export function emitStatus(sse: SseEmitter, phase: StatusPhase, label: string): void {
    sse("status", {phase, label: truncateStatusLabel(label)});
}
