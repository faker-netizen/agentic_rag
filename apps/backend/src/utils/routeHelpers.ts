import type express from "express";

/** 从已鉴权请求读取 userId（不写响应） */
export function getUserId(req: express.Request): number | null {
    const uid = req.user?.id;
    if (uid == null || !Number.isFinite(uid)) return null;
    return uid;
}

/** 未登录时写 401 并返回 null */
export function requireUserId(req: express.Request, res: express.Response): number | null {
    const uid = getUserId(req);
    if (uid == null) {
        res.status(401).json({error: "未登录"});
        return null;
    }
    return uid;
}

/** 解析 body / query 中的正整数 id */
export function parsePositiveInt(raw: unknown): number | null {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
}

/** 解析路由 params 中的正整数 id */
export function parseRouteParamId(raw: string | string[] | undefined): number | null {
    const s = Array.isArray(raw) ? raw[0] : raw;
    if (s == null || typeof s !== "string") return null;
    return parsePositiveInt(s);
}
