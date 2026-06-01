import type {Request, Response} from "express";

export function setupSseResponse(res: Response): void {
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") {
        res.flushHeaders();
    }
}

export function writeSseEvent(res: Response, event: string, data: Record<string, unknown>): void {
    if (res.writableEnded) return;
    try {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
        /* 客户端已断开 */
    }
}

export type SseWriter = (event: string, data: Record<string, unknown>) => void;

export function createSseWriter(res: Response): SseWriter {
    return (event, data) => writeSseEvent(res, event, data);
}

/** 客户端断开时 abort；返回 cleanup 供 finally 调用 */
export function bindRequestAbort(req: Request): {signal: AbortSignal; cleanup: () => void} {
    const abort = new AbortController();
    const onClose = () => abort.abort();
    req.on("close", onClose);
    return {
        signal: abort.signal,
        cleanup: () => req.removeListener("close", onClose),
    };
}
