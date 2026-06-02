import {SSE_DATA_PREFIX_LEN, SSE_EVENT_PREFIX_LEN} from "@/service/sseConstants.ts";

export async function readSse(
    body: ReadableStream<Uint8Array>,
    onEvent: (event: string, dataJson: string) => void
): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {stream: true});
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) >= 0) {
            const raw = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            let eventName = "message";
            const dataLines: string[] = [];
            for (const line of raw.split("\n")) {
                if (line.startsWith("event:")) eventName = line.slice(SSE_EVENT_PREFIX_LEN).trim();
                else if (line.startsWith("data:"))
                    dataLines.push(line.slice(SSE_DATA_PREFIX_LEN).replace(/^\s/, ""));
            }
            const payload = dataLines.join("\n");
            if (payload) onEvent(eventName, payload);
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
    }
): Promise<void> {
    const run = async (retried: boolean): Promise<void> => {
        const token = options.getToken();
        const headers: Record<string, string> = {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
        };
        if (token) headers.Authorization = `Bearer ${token}`;

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

        await readSse(res.body, (event, dataStr) => {
            try {
                onEvent(event, JSON.parse(dataStr) as Record<string, unknown>);
            } catch {
                /* ignore malformed chunk */
            }
        });
    };

    await run(false);
}
