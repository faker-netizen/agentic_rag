/** 生产同域 Nginx 反代时返回空字符串；开发默认 localhost:3001 */
export function apiBaseUrl(): string {
    const fromEnv = import.meta.env.VITE_API_BASE_URL;
    if (fromEnv != null && fromEnv !== "") {
        return fromEnv;
    }
    return import.meta.env.PROD ? "" : "http://localhost:3001";
}
