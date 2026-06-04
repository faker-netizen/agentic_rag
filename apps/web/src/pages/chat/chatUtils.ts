import {RequestError} from "@/service/request.ts";
import {SseError, sseErrorMessage} from "@/service/sseErrors.ts";

export function errText(e: unknown): string {
    return e instanceof RequestError ? e.message : "操作失败，请稍后重试";
}

export function isAbortError(e: unknown): boolean {
    if (e instanceof SseError && e.kind === "abort") return true;
    if (e instanceof DOMException && e.name === "AbortError") return true;
    if (e instanceof Error && e.name === "AbortError") return true;
    return false;
}

export function streamErrText(e: unknown): string {
    if (e instanceof SseError) return sseErrorMessage(e.kind);
    return errText(e);
}

export function uploadErrMsg(e: unknown): string | null {
    if (e && typeof e === "object" && "response" in e) {
        const data = (e as {response?: {data?: {error?: string}}}).response?.data;
        if (data?.error) return data.error;
    }
    return null;
}
