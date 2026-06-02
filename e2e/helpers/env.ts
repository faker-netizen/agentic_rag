export function getE2eBaseUrl(): string {
    return process.env.E2E_BASE_URL ?? "http://localhost:5173";
}

export function getE2eApiUrl(): string {
    return process.env.E2E_API_URL ?? "http://localhost:3001";
}

export type E2eCredentials = {
    email: string;
    password: string;
};

export function getE2eCredentials(): E2eCredentials | null {
    const email = process.env.E2E_USER_EMAIL?.trim() ?? process.env.ADMIN_EMAIL?.trim();
    const password = process.env.E2E_USER_PASSWORD ?? process.env.ADMIN_PASSWORD;
    if (!email || !password) return null;
    return {email, password};
}

export function requireE2eCredentials(): E2eCredentials {
    const creds = getE2eCredentials();
    if (!creds) {
        throw new Error(
            "缺少 E2E_USER_EMAIL / E2E_USER_PASSWORD。请复制 e2e/.env.example 为 e2e/.env 并填写（可与 backend ADMIN_* 一致）。"
        );
    }
    return creds;
}
