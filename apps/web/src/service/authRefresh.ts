import {setAccessToken} from "@/service/token.ts";

import {apiBaseUrl} from "@/service/apiBase.ts";

export function apiBase(): string {
    return apiBaseUrl();
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
