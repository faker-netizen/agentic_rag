import {RequestError} from "@/service/request.ts";

export function errText(e: unknown): string {
    return e instanceof RequestError ? e.message : "操作失败，请稍后重试";
}

export function isAbortError(e: unknown): boolean {
    if (e instanceof DOMException && e.name === "AbortError") return true;
    if (e instanceof Error && e.name === "AbortError") return true;
    return false;
}

export function uploadErrMsg(e: unknown): string | null {
    if (e && typeof e === "object" && "response" in e) {
        const data = (e as {response?: {data?: {error?: string}}}).response?.data;
        if (data?.error) return data.error;
    }
    return null;
}
