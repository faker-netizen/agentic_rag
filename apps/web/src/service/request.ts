// src/lib/request.ts
import axios, {AxiosError, type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig} from "axios";
import {clearAuth, getAccessToken, setAccessToken} from "@/service/token.ts";


const RETRY_STATUS = new Set([429, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(["get", "head", "options"]);

/** 后端常见错误返回结构 */
export interface ApiErrorResponse {
    error?: string;
    message?: string;
    code?: string | number;
}
type RetryConfig = InternalAxiosRequestConfig & {
    __retryCount?: number;
    retry?: number;
    retryDelay?: number;
    // 无感刷新相关标记
    _retry401?: boolean;
};

/** 统一抛出的业务错误对象 */
export class RequestError extends Error {
    status?: number;
    code?: string | number;
    raw?: unknown;

    constructor(message: string, options?: { status?: number; code?: string | number; raw?: unknown }) {
        super(message);
        this.name = "RequestError";
        this.status = options?.status;
        this.code = options?.code;
        this.raw = options?.raw;
    }
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

/** 从 axios error 中提炼用户可读信息 */
function parseAxiosError(error: AxiosError<ApiErrorResponse>): RequestError {
    const status = error.response?.status;
    const data = error.response?.data;
    const message =
        data?.error ||
        data?.message ||
        (status ? `请求失败(${status})` : "网络异常，请检查服务是否启动");

    return new RequestError(message, {
        status,
        code: data?.code,
        raw: error,
    });
}

function shouldRetry(error: AxiosError, config: RetryConfig): boolean {
    const method = (config.method || "get").toLowerCase();
    const isIdempotent = IDEMPOTENT_METHODS.has(method);

    // 非幂等请求默认不重试
    if (!isIdempotent) return false;

    // 超时
    if (error.code === "ECONNABORTED") return true;

    // 网络断开/跨域等无响应
    if (!error.response) return true;

    // 特定状态码
    if (RETRY_STATUS.has(error.response.status)) return true;

    return false;
}

// ===== 无感刷新状态 =====
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;
const waitQueue: Array<{
    resolve: () => void;
    reject: (err: unknown) => void;
}> = [];

const flushQueue = (err?: unknown) => {
    while (waitQueue.length) {
        const task = waitQueue.shift()!;
        if (err) task.reject(err);
        else task.resolve();
    }
};


const isRefreshEndpoint = (url?: string) => {
    if (!url) return false;
    return url.includes("/api/auth/refresh");
};

/** 登录/注册失败也会返回 401，这类 401 不应触发 refresh，否则会误清 token、多打 refresh */
const isCredentialRejected401 = (url?: string) => {
    if (!url) return false;
    return url.includes("/api/auth/login") || url.includes("/api/auth/register");
};

const doRefresh = async () => {
    // 用独立 axios，避免走同一个拦截器导致循环
   const res= await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"}/api/auth/refresh`,
        {},
        {withCredentials: true, timeout: 10000}
    );
    // 按你后端返回结构改字段名
    const newAccessToken = res.data?.accessToken;
    if (!newAccessToken) {
        throw new Error("refresh succeeded but accessToken missing");
    }
    setAccessToken(newAccessToken);
};

/** 创建 axios 实例 */
function createHttpClient(): AxiosInstance {
    const instance = axios.create({
        baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001",
        timeout: 15000,
        withCredentials: true, // 关键：cookie鉴权
        headers: {
            "Content-Type": "application/json",
        },
    });
    // 请求拦截器
    instance.interceptors.request.use(
        (config) => {
            const token = getAccessToken();
            if (token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // 响应拦截器
    instance.interceptors.response.use(
        (response) => {
            const body = response.data as Record<string, unknown> | null;
            // 仅当存在统一 envelope 字段 `code` 时做业务码校验（如 { code, data, message }）
            if (body && typeof body === "object" && "code" in body) {
                const ok = body.code === 0 || body.code === "0";
                if (!ok) {
                    throw new RequestError(String(body.message ?? "业务处理失败"), {
                        status: response.status,
                        code: body.code as string | number,
                        raw: response,
                    });
                }
            }
            return response;
        },
        async (error: AxiosError<ApiErrorResponse>) => {
            const config = (error.config || {}) as RetryConfig;
            const status = error.response?.status;
            // ===== 1) 先处理 401 无感刷新 =====
            if (
                status === 401 &&
                config &&
                !isRefreshEndpoint(config.url) &&
                !isCredentialRejected401(config.url)
            ) {
                // 每个请求最多触发一次401重放，防止死循环
                if (config._retry401) {
                    const parsed = parseAxiosError(error);
                    // 可选：这里广播登出事件
                    // window.dispatchEvent(new CustomEvent("auth:logout"));
                    return Promise.reject(parsed);
                }
                config._retry401 = true;
                try {
                    if (!isRefreshing) {
                        isRefreshing = true;
                        refreshPromise = doRefresh()
                            .then(() => {
                                flushQueue();
                            })
                            .catch((refreshErr) => {
                                flushQueue(refreshErr);
                                throw refreshErr;
                            })
                            .finally(() => {
                                isRefreshing = false;
                                refreshPromise = null;
                            });
                        await refreshPromise
                    } else {
                        await new Promise<void>((resolve, reject) => {
                            waitQueue.push({resolve, reject});
                        });
                    }
                    return instance.request(config);
                } catch (refreshErr) {
                    clearAuth();
                    window.dispatchEvent(new CustomEvent("auth:logout"));
                    return Promise.reject(new RequestError("登录已过期，请重新登录", { status: 401, raw: refreshErr }));
                }
            }

            const maxRetry = config.retry ?? 2;
            config.__retryCount = config.__retryCount ?? 0;
            if (config.__retryCount < maxRetry && shouldRetry(error, config)) {
                config.__retryCount += 1;
                // 指数退避 + 抖动
                const base = config.retryDelay ?? 300;
                const delay = base * Math.pow(2, config.__retryCount - 1) + Math.floor(Math.random() * 100);
                await sleep(delay);
                return instance.request(config);
            }

            return Promise.reject(parseAxiosError(error));
        }
    );

    return instance;
}


function unwrap<T>(response: { data: unknown; status: number }): T {
    const body = response.data as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
        throw new RequestError("无效响应", {status: response.status, raw: response});
    }
    if ("code" in body) {
        const ok = body.code === 0 || body.code === "0";
        if (!ok) {
            throw new RequestError(String(body.message ?? "业务处理失败"), {
                status: response.status,
                code: body.code as string | number,
                raw: response,
            });
        }
        return body.data as T;
    }
    return body as T;
}

const instance = createHttpClient();

export const http = {
    async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const res = await instance.get(url, config);
        return unwrap<T>(res);
    },

    async post<T, B = unknown>(url: string, data?: B, config?: AxiosRequestConfig): Promise<T> {
        const res = await instance.post(url, data, config);
        return unwrap<T>(res);
    },

    async put<T, B = unknown>(url: string, data?: B, config?: AxiosRequestConfig): Promise<T> {
        const res = await instance.put(url, data, config);
        return unwrap<T>(res);
    },

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const res = await instance.delete(url, config);
        return unwrap<T>(res);
    },
};

export default http;