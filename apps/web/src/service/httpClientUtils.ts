import {AxiosError, type InternalAxiosRequestConfig} from "axios";

/** 后端常见错误返回结构 */
export interface ApiErrorResponse {
    error?: string;
    message?: string;
    code?: string | number;
}

export type RetryConfig = InternalAxiosRequestConfig & {
    __retryCount?: number;
    retry?: number;
    retryDelay?: number;
    _retry401?: boolean;
};

/** 统一抛出的业务错误对象 */
export class RequestError extends Error {
    status?: number;
    code?: string | number;
    raw?: unknown;

    constructor(message: string, options?: {status?: number; code?: string | number; raw?: unknown}) {
        super(message);
        this.name = "RequestError";
        this.status = options?.status;
        this.code = options?.code;
        this.raw = options?.raw;
    }
}

/** 从 axios error 中提炼用户可读信息 */
export function parseAxiosError(error: AxiosError<ApiErrorResponse>): RequestError {
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

export function unwrap<T>(response: {data: unknown; status: number}): T {
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
