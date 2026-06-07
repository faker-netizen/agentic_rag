import axios, {
    AxiosError,
    type AxiosInstance,
    type InternalAxiosRequestConfig,
} from "axios";
import {clearAuth, getAccessToken, setAccessToken} from "@/service/token.ts";
import {
    DEFAULT_RETRY_DELAY_MS,
    RETRYABLE_STATUS_CODES,
} from "@/service/httpConstants.ts";
import {
    parseAxiosError,
    RequestError,
    type ApiErrorResponse,
    type RetryConfig,
} from "@/service/httpClientUtils.ts";
import {apiBaseUrl} from "@/service/apiBase.ts";

const IDEMPOTENT_METHODS = new Set(["get", "head", "options"]);

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

function shouldRetry(error: AxiosError, config: RetryConfig): boolean {
    const method = (config.method || "get").toLowerCase();
    if (!IDEMPOTENT_METHODS.has(method)) return false;
    if (error.code === "ECONNABORTED") return true;
    if (!error.response) return true;
    if (RETRYABLE_STATUS_CODES.has(error.response.status)) return true;
    return false;
}

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;
const waitQueue: Array<{resolve: () => void; reject: (err: unknown) => void}> = [];

const flushQueue = (err?: unknown) => {
    while (waitQueue.length) {
        const task = waitQueue.shift()!;
        if (err) task.reject(err);
        else task.resolve();
    }
};

const isRefreshEndpoint = (url?: string) => Boolean(url?.includes("/api/auth/refresh"));

const isCredentialRejected401 = (url?: string) =>
    Boolean(url?.includes("/api/auth/login") || url?.includes("/api/auth/register"));

const doRefresh = async () => {
    const res = await axios.post(
        `${apiBaseUrl()}/api/auth/refresh`,
        {},
        {withCredentials: true, timeout: 10000}
    );
    const newAccessToken = res.data?.accessToken;
    if (!newAccessToken) {
        throw new Error("refresh succeeded but accessToken missing");
    }
    setAccessToken(newAccessToken);
};

async function handle401Refresh(
    instance: AxiosInstance,
    error: AxiosError<ApiErrorResponse>,
    config: RetryConfig
): Promise<unknown> {
    if (config._retry401) {
        return Promise.reject(parseAxiosError(error));
    }
    config._retry401 = true;
    try {
        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = doRefresh()
                .then(() => flushQueue())
                .catch((refreshErr) => {
                    flushQueue(refreshErr);
                    throw refreshErr;
                })
                .finally(() => {
                    isRefreshing = false;
                    refreshPromise = null;
                });
            await refreshPromise;
        } else {
            await new Promise<void>((resolve, reject) => {
                waitQueue.push({resolve, reject});
            });
        }
        return instance.request(config);
    } catch (refreshErr) {
        clearAuth();
        window.dispatchEvent(new CustomEvent("auth:logout"));
        return Promise.reject(
            new RequestError("登录已过期，请重新登录", {status: 401, raw: refreshErr})
        );
    }
}

async function handleRetry(
    instance: AxiosInstance,
    error: AxiosError<ApiErrorResponse>,
    config: RetryConfig
): Promise<unknown> {
    const maxRetry = config.retry ?? 2;
    config.__retryCount = config.__retryCount ?? 0;
    if (config.__retryCount < maxRetry && shouldRetry(error, config)) {
        config.__retryCount += 1;
        const base = config.retryDelay ?? DEFAULT_RETRY_DELAY_MS;
        const delay = base * Math.pow(2, config.__retryCount - 1) + Math.floor(Math.random() * 100);
        await sleep(delay);
        return instance.request(config);
    }
    return Promise.reject(parseAxiosError(error));
}

export function attachRequestInterceptor(instance: AxiosInstance): void {
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
}

export function attachResponseInterceptor(instance: AxiosInstance): void {
    instance.interceptors.response.use(
        (response) => {
            const body = response.data as Record<string, unknown> | null;
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
            if (
                status === 401 &&
                config &&
                !isRefreshEndpoint(config.url) &&
                !isCredentialRejected401(config.url)
            ) {
                return handle401Refresh(instance, error, config);
            }
            return handleRetry(instance, error, config);
        }
    );
}
