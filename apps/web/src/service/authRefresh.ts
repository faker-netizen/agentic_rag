import {setAccessToken} from "@/service/token.ts";

export function apiBase(): string {
    return import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
}

/** 与 chat 流式请求共用：刷新 accessToken（依赖 httpOnly refresh cookie） */
export async function refreshAccessToken(): Promise<boolean> {
    const res = await fetch(`${apiBase()}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {"Content-Type": "application/json"},
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {accessToken?: string};
    if (!data.accessToken) return false;
    setAccessToken(data.accessToken);
    return true;
}
