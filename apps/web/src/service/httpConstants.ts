/** HTTP status codes used by the web client */
export const HTTP_TOO_MANY_REQUESTS = 429;
export const HTTP_BAD_GATEWAY = 502;
export const HTTP_SERVICE_UNAVAILABLE = 503;
export const HTTP_GATEWAY_TIMEOUT = 504;

export const RETRYABLE_STATUS_CODES = new Set([
    HTTP_TOO_MANY_REQUESTS,
    HTTP_BAD_GATEWAY,
    HTTP_SERVICE_UNAVAILABLE,
    HTTP_GATEWAY_TIMEOUT,
]);

export const DEFAULT_RETRY_DELAY_MS = 300;
