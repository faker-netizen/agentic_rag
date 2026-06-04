import {SSE_DATA_PREFIX_LEN, SSE_EVENT_PREFIX_LEN, SSE_IDLE_TIMEOUT_MS} from "@/service/sseConstants.ts";
import {SseError} from "@/service/sseErrors.ts";

export type StreamStatusPayload = {phase: string; label: string};

export type FetchSseHandlers = {
    onEvent: (event: string, data: Record<string, unknown>) => void;
    onStatus?: (p: StreamStatusPayload) => void;
};

function parseSseBlock(raw: string): {event: string; payload: string} {
    let eventName = "message";
    const dataLines: string[] = [];
    for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(SSE_EVENT_PREFIX_LEN).trim();
        else if (line.startsWith("data:"))
            dataLines.push(line.slice(SSE_DATA_PREFIX_LEN).replace(/^\s/, ""));
    }
    return {event: eventName, payload: dataLines.join("\n")};
}

export async function readSse(
    body: ReadableStream<Uint8Array>,
    handlers: FetchSseHandlers,
    options?: {signal?: AbortSignal; idleTimeoutMs?: number}
): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const idleMs = options?.idleTimeoutMs ?? SSE_IDLE_TIMEOUT_MS;
    let buffer = "";
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let idleFired = false;

    const clearIdle = () => {
        if (idleTimer != null) clearTimeout(idleTimer);
        idleTimer = null;
    };

    const armIdle = () => {
        clearIdle();
        idleTimer = setTimeout(() => {
            idleFired = true;
            void reader.cancel();
        }, idleMs);
    };

    const dispatch = (event: string, payload: string) => {
        if (!payload) return;
        if (event === "status") {
            try {
                const data = JSON.parse(payload) as StreamStatusPayload;
                handlers.onStatus?.(data);
            } catch {
                /* ignore */
            }
            return;
        }
        try {
            handlers.onEvent(event, JSON.parse(payload) as Record<string, unknown>);
        } catch {
            /* ignore malformed chunk */
        }
    };

    armIdle();
    try {
        for (;;) {
            const {done, value} = await reader.read();
            if (done) break;
            armIdle();
            buffer += decoder.decode(value, {stream: true});
            let sep: number;
            while ((sep = buffer.indexOf("\n\n")) >= 0) {
                const raw = buffer.slice(0, sep);
                buffer = buffer.slice(sep + 2);
                if (raw.startsWith(":")) continue;
                const {event, payload} = parseSseBlock(raw);
                dispatch(event, payload);
            }
        }
    } catch (e) {
        clearIdle();
        if (options?.signal?.aborted) {
            throw new SseError("abort", "aborted");
        }
        if (idleFired) {
            throw new SseError("idle_timeout", "idle");
        }
        if (e instanceof SseError) throw e;
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("cancel") || msg.includes("abort")) {
            throw new SseError("abort", msg);
        }
        throw new SseError("network", msg || "network");
    } finally {
        clearIdle();
    }

    if (buffer.trim()) {
        const lines = buffer.split("\n\n");
        for (const raw of lines) {
            if (!raw.trim() || raw.startsWith(":")) continue;
            const {event, payload} = parseSseBlock(raw);
            dispatch(event, payload);
        }
    }
}

export async function fetchSsePost(
    url: string,
    body: unknown,
    onEvent: (event: string, data: Record<string, unknown>) => void,
    options: {
        getToken: () => string | null;
        refreshToken: () => Promise<boolean>;
        signal?: AbortSignal;
        onStatus?: (p: StreamStatusPayload) => void;
        idleTimeoutMs?: number;
    }
): Promise<void> {
    const run = async (retried: boolean): Promise<void> => {
        const token = options.getToken();
        const headers: Record<string, string> = {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        try {
            const res = await fetch(url, {
                method: "POST",
                credentials: "include",
                headers,
                body: JSON.stringify(body),
                signal: options.signal,
            });

            if (res.status === 401 && !retried) {
                const ok = await options.refreshToken();
                if (ok) return run(true);
                throw new Error("登录已过期，请重新登录");
            }

            if (!res.ok || !res.body) {
                const t = await res.text().catch(() => "");
                let errMsg = `请求失败(${res.status})`;
                if (t) {
                    try {
                        const j = JSON.parse(t) as {error?: string; message?: string};
                        errMsg = j.error || j.message || errMsg;
                    } catch {
                        errMsg = t;
                    }
                }
                throw new Error(errMsg);
            }

            await readSse(
                res.body,
                {onEvent, onStatus: options.onStatus},
                {signal: options.signal, idleTimeoutMs: options.idleTimeoutMs}
            );
        } catch (e) {
            if (options.signal?.aborted) {
                throw new SseError("abort", "aborted");
            }
            if (e instanceof SseError) throw e;
            if (e instanceof Error && e.name === "AbortError") {
                throw new SseError("abort", e.message);
            }
            if (e instanceof TypeError || (e instanceof Error && e.message.includes("fetch"))) {
                throw new SseError("network", e instanceof Error ? e.message : "network");
            }
            throw e;
        }
    };

    await run(false);
}
