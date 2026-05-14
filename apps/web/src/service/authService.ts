import http from "@/service/request.ts";

export type AuthUserDto = { id: number; email: string };

export type LoginResult = {
    success: boolean;
    accessToken: string;
    user: AuthUserDto;
};

export type RegisterResult = LoginResult;

/** POST /api/auth/login — 与 apps/backend 一致，Set-Cookie 由浏览器处理 */
export function login(email: string, password: string): Promise<LoginResult> {
    return http.post<LoginResult, { email: string; password: string }>("/api/auth/login", {
        email,
        password,
    });
}

/** POST /api/auth/register */
export function register(email: string, password: string): Promise<RegisterResult> {
    return http.post<RegisterResult, { email: string; password: string }>("/api/auth/register", {
        email,
        password,
    });
}

/** POST /api/auth/logout — 撤销 refresh cookie */
export function logout(): Promise<{ success: boolean }> {
    return http.post<{ success: boolean }>("/api/auth/logout", {});
}
