/**
 * 定义HTTP错误的类型，包括四种可能的错误种类
 */
export type HttpErrorKind = 'HTTP' | 'NETWORK' | 'TIMEOUT' | 'ABORT';

/**
 * HttpError类，继承自Error，用于表示HTTP请求过程中可能出现的各种错误
 */
export class HttpError extends Error {
    kind: HttpErrorKind;      // 错误类型
    url: string;             // 请求的URL
    method: string;          // HTTP请求方法
    status?: number;         // HTTP状态码（可选）
    response?: Response;     // 响应对象（可选）
    bodyText?: string;       // 响应体的文本内容（可选）

    /**
     * HttpError类的构造函数
     * @param init 包含错误初始化信息的对象
     */
    constructor(init: {
        kind: HttpErrorKind;       // 错误类型
        message: string;           // 错误信息
        url: string;               // 请求的URL
        method: string;            // HTTP请求方法
        status?: number;           // HTTP状态码（可选）
        response?: Response;       // 响应对象（可选）
        bodyText?: string;         // 响应体的文本内容（可选）
        cause?: unknown;           // 错误的原因（可选）
    }) {
        // 调用父类Error的构造函数，传入错误信息
        super(init.message);
        this.name = 'HttpError';    // 设置错误名称
        // 初始化各个属性
        this.kind = init.kind;
        this.url = init.url;
        this.method = init.method;
        this.status = init.status;
        this.response = init.response;
        this.bodyText = init.bodyText;
        this.cause = init.cause;
    }
}
