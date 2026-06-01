/**
 * HTTP客户端工具类，提供基于fetch的HTTP请求功能，支持拦截器、重试、超时等特性
 */
import type {
    HttpClientOptions,    // HTTP客户端配置选项
    HttpMethod,          // HTTP方法类型
    Interceptor,         // 拦截器类型
    JsonRequestOptions,   // JSON请求选项
    RequestOptions,      // 通用请求选项
    RetryOptions,        // 重试选项
    Query,               // 查询参数类型
} from './types';
import { HttpError } from './error';  // 自定义HTTP错误类

/**
 * 判断URL是否为绝对路径
 * @param url 要检查的URL
 * @returns 如果是绝对路径返回true，否则返回false
 */
function isAbsoluteUrl(url: string) {
    return /^https?:\/\//i.test(url);
}

/**
 * 拼接基础URL和路径
 * @param baseURL 基础URL
 * @param path 请求路径
 * @returns 拼接后的完整URL
 */
function joinUrl(baseURL: string, path: string) {
    if (!baseURL) return path;
    if (isAbsoluteUrl(path)) return path;
    return baseURL.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

/**
 * 构建查询字符串
 * @param query 查询参数对象
 * @returns 格式化后的查询字符串
 */
function buildQuery(query?: Query) {
    if (!query) return '';
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
        if (Array.isArray(v)) {
            v.forEach(item => {
                if (item === undefined || item === null) return;
                usp.append(k, String(item));
            });
        } else {
            if (v === undefined || v === null) continue;
            usp.set(k, String(v));
        }
    }
    const s = usp.toString();
    return s ? `?${s}` : '';
}

/**
 * 延迟函数
 * @param ms 延迟的毫秒数
 * @returns 返回一个Promise，在指定时间后resolve
 */
function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

/**
 * 解析请求头，支持函数形式的动态头
 * @param h 请求头配置，可以是静态对象或返回Promise的函数
 * @returns 返回解析后的请求头
 */
async function resolveHeaders(h?: HttpClientOptions['headers']): Promise<HeadersInit | undefined> {
    if (!h) return undefined;
    return typeof h === 'function' ? await h() : h;
}

/**
 * 合并多个请求头
 * @param a 第一个请求头
 * @param b 第二个请求头
 * @returns 返回合并后的新请求头
 */
function mergeHeaders(a?: HeadersInit, b?: HeadersInit) {
    const h = new Headers(a || undefined);
    if (b) new Headers(b).forEach((v, k) => h.set(k, v));
    return h;
}

/**
 * 合并重试配置
 * @param globalRetry 全局重试配置
 * @param localRetry 局部重试配置
 * @returns 返回合并后的重试配置
 */
function mergeRetry(globalRetry?: RetryOptions, localRetry?: RetryOptions): RetryOptions | undefined {
    if (!globalRetry && !localRetry) return undefined;
    return { ...(globalRetry || {}), ...(localRetry || {}) };
}

/**
 * 创建HTTP客户端实例
 * @param options HTTP客户端配置选项
 * @returns 返回HTTP客户端实例
 */
export function createHttpClient(options: HttpClientOptions = {}) {
    // 使用自定义的fetch函数或默认的fetch
    const fetcher = options.fetcher ?? fetch;

    // 请求和响应拦截器数组
    const requestInterceptors: Interceptor<Request>[] = [];
    const responseInterceptors: Interceptor<Response>[] = [];

    /**
     * 使用请求拦截器
     * @param interceptor 请求拦截器函数
     * @returns 返回一个移除该拦截器的函数
     */
    function useRequest(interceptor: Interceptor<Request>) {
        requestInterceptors.push(interceptor);
        return () => {
            const idx = requestInterceptors.indexOf(interceptor);
            if (idx >= 0) requestInterceptors.splice(idx, 1);
        };
    }

    /**
     * 使用响应拦截器
     * @param interceptor 响应拦截器函数
     * @returns 返回一个移除该拦截器的函数
     */
    function useResponse(interceptor: Interceptor<Response>) {
        responseInterceptors.push(interceptor);
        return () => {
            const idx = responseInterceptors.indexOf(interceptor);
            if (idx >= 0) responseInterceptors.splice(idx, 1);
        };
    }

    /**
     * 核心请求方法
     * @param method HTTP方法
     * @param url 请求URL
     * @param init 请求配置
     * @returns 返回响应对象
     */
    async function coreRequest(method: HttpMethod, url: string, init: RequestInit & { query?: Query; timeoutMs?: number; retry?: RetryOptions } = {}) {
        // 构建完整URL，包括查询参数
        const fullUrl = joinUrl(options.baseURL || '', url) + buildQuery(init.query);

        // 解析和合并请求头
        const globalHeaders = await resolveHeaders(options.headers);
        const headers = mergeHeaders(globalHeaders, init.headers);

        // 处理超时和重试配置
        const timeoutMs = init.timeoutMs ?? options.timeoutMs;
        const retry = mergeRetry(options.retry, init.retry) || {};

        // 重试配置参数
        const retries = retry.retries ?? 0;
        const retryDelayMs = retry.retryDelayMs ?? 200;
        const retryOn = retry.retryOn ?? (({ error, response }) => {
            // 默认：网络错误 或 5xx 才重试（不重试 4xx）
            if (error) return true;
            if (response) return response.status >= 500;
            return false;
        });

        let attempt = 0;
        while (true) {
            attempt++;

            // 每次 attempt 都创建独立 AbortController：timeout/外部 signal 合并
            const ac = new AbortController();
            const signals: AbortSignal[] = [ac.signal];
            if (init.signal) signals.push(init.signal);

            // 合并 signal（简单实现：任意一个 abort 就 abort）
            const onAbort = () => ac.abort();
            init.signal?.addEventListener('abort', onAbort, { once: true });

            let timer: any;
            if (typeof timeoutMs === 'number' && timeoutMs > 0) {
                timer = setTimeout(() => ac.abort(), timeoutMs);
            }

            try {
                let req = new Request(fullUrl, {
                    ...init,
                    method,
                    headers,
                    signal: ac.signal,
                });

                for (const itc of requestInterceptors) req = await itc(req);

                let res = await fetcher(req);

                for (const itc of responseInterceptors) res = await itc(res);

                if (!res.ok) {
                    // 4xx/5xx：fetch 不会 reject，这里统一转成异常
                    const bodyText = await res.clone().text().catch(() => undefined);
                    const err = new HttpError({
                        kind: 'HTTP',
                        message: `HTTP ${res.status} ${res.statusText}`,
                        url: fullUrl,
                        method,
                        status: res.status,
                        response: res,
                        bodyText,
                    });

                    if (attempt <= retries + 1 && retryOn({ attempt, response: res })) {
                        await sleep(retryDelayMs);
                        continue;
                    }
                    throw err;
                }

                return res;
            } catch (e: any) {
                const aborted = ac.signal.aborted || (e?.name === 'AbortError');

                // 区分超时/手动取消：如果外部 signal aborted，则认为 ABORT；否则 TIMEOUT
                if (aborted) {
                    const kind = init.signal?.aborted ? 'ABORT' : 'TIMEOUT';
                    const err = new HttpError({
                        kind,
                        message: kind === 'TIMEOUT' ? `Timeout after ${timeoutMs}ms` : 'Request aborted',
                        url: fullUrl,
                        method,
                        cause: e,
                    });

                    if (kind !== 'ABORT' && attempt <= retries + 1 && retryOn({ attempt, error: err })) {
                        await sleep(retryDelayMs);
                        continue;
                    }
                    throw err;
                }

                // 其它：网络错误 / CORS 等导致 fetch reject
                const err = new HttpError({
                    kind: 'NETWORK',
                    message: e?.message || 'Network error',
                    url: fullUrl,
                    method,
                    cause: e,
                });

                if (attempt <= retries + 1 && retryOn({ attempt, error: err })) {
                    await sleep(retryDelayMs);
                    continue;
                }
                throw err;
            } finally {
                init.signal?.removeEventListener('abort', onAbort);
                if (timer) clearTimeout(timer);
            }
        }
    }

    async function json<T>(method: HttpMethod, url: string, opts: JsonRequestOptions = {}): Promise<T> {
        const headers = mergeHeaders(opts.headers, { 'content-type': 'application/json' });
        const res = await coreRequest(method, url, {
            ...opts,
            headers,
            body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        });
        return res.json() as Promise<T>;
    }

    return {
        useRequest,
        useResponse,

        request: (url: string, opts?: RequestOptions) => coreRequest('GET', url, opts as any), // 默认 GET
        get: (url: string, opts?: RequestOptions) => coreRequest('GET', url, opts as any),
        del: (url: string, opts?: RequestOptions) => coreRequest('DELETE', url, opts as any),

        post: (url: string, opts?: JsonRequestOptions) => json('POST', url, opts),
        put: (url: string, opts?: JsonRequestOptions) => json('PUT', url, opts),
        patch: (url: string, opts?: JsonRequestOptions) => json('PATCH', url, opts),

        getJSON: <T>(url: string, opts?: RequestOptions) => json<T>('GET', url, opts as any),
    };
}
