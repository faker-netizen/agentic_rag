/** 判断流式请求是否因客户端断开 / AbortSignal 而中止 */
export function isStreamAborted(error: unknown, signal?: AbortSignal): boolean {
    if (signal?.aborted === true) return true;
    if (error instanceof DOMException && error.name === "AbortError") return true;
    if (error instanceof Error) {
        if (error.name === "AbortError") return true;
        if ((error as NodeJS.ErrnoException).code === "ABORT_ERR") return true;
    }
    return false;
}
