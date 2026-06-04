export type SseErrorKind = "abort" | "network" | "idle_timeout";

export class SseError extends Error {
    readonly kind: SseErrorKind;

    constructor(kind: SseErrorKind, message: string) {
        super(message);
        this.name = "SseError";
        this.kind = kind;
    }
}

export function sseErrorMessage(kind: SseErrorKind): string {
    if (kind === "abort") return "已停止";
    if (kind === "idle_timeout") return "等待响应超时，请重试";
    return "连接中断，请检查网络后重试";
}
