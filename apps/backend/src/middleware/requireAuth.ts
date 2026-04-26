import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authConfig } from "../config/auth.js";

type AccessPayload = {
  tokenType: "access";
  email?: string;
  iat: number;
  exp: number;
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ error: "缺少 Authorization Bearer token" });
  }
  const token = auth.slice("bearer ".length).trim();

  try {
    const decoded = jwt.verify(token, authConfig.accessTokenSecret) as AccessPayload & {
      sub?: string;
    };
    if (decoded.tokenType !== "access") {
      return res.status(401).json({ error: "token 类型不正确" });
    }
    const userId = decoded.sub ? Number(decoded.sub) : NaN;
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ error: "token 无效" });
    }

    req.user = { id: userId, email: decoded.email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: "token 无效或已过期" });
  }
}

