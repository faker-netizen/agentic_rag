import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in environment`);
  return v;
}

const isProduction = process.env.NODE_ENV === "production";

/**
 * Access JWT 过期时间。
 * - 非 production：固定 10s，便于本地验证无感刷新（不受 ACCESS_TOKEN_TTL 覆盖）。
 * - production：读 ACCESS_TOKEN_TTL，默认 15m。
 */
const accessTokenTtl = isProduction
  ? process.env.ACCESS_TOKEN_TTL || "15m"
  : "15m";

export const authConfig = {
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || requireEnv("JWT_SECRET"),
  refreshTokenSecret:
    process.env.REFRESH_TOKEN_SECRET ||
    process.env.ACCESS_TOKEN_SECRET ||
    requireEnv("JWT_SECRET"),
  accessTokenTtl,
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || "30d",
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "refresh_token",
  cookieSecure: process.env.NODE_ENV === "production",
  cookieSameSite: (process.env.COOKIE_SAMESITE as "lax" | "strict" | "none") || "lax",
};

