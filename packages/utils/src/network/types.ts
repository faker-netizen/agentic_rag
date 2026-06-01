/**
 * HTTP请求方法的联合类型，包含常见的HTTP方法
 */
export type HttpMethod =
    | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    | 'HEAD' | 'OPTIONS';

/**
 * 查询参数值的类型，可以是字符串、数字、布尔值、null或undefined
 */
export type QueryValue = string | number | boolean | null | undefined;
/**
 * 查询参数对象的类型，键为字符串，值为QueryValue或QueryValue数组
 */
export type Query = Record<string, QueryValue | QueryValue[]>;

/**
 * 重试选项的配置类型
 * 包含重试次数、重试延迟和重试条件等配置
 */
export type RetryOptions = {
    retries?: number;          // 默认 0
    retryDelayMs?: number;     // 默认 200
    retryOn?: (args: {
        attempt: number;
        error?: unknown;
        response?: Response;
    }) => boolean;
};

export type HttpClientOptions = {
    baseURL?: string;
    headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
    fetcher?: typeof fetch; // 方便注入 mock / node fetch
    timeoutMs?: number;     // 默认超时
    retry?: RetryOptions;
};

export type RequestOptions = Omit<RequestInit, 'body' | 'method'> & {
    query?: Query;
    timeoutMs?: number;
    retry?: RetryOptions;
};

export type JsonRequestOptions = RequestOptions & {
    body?: unknown; // 自动 JSON.stringify
};

export type Interceptor<T> = (v: T) => T | Promise<T>;
