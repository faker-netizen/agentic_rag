import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in environment`);
  return v;
}

export const authConfig = {
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || requireEnv("JWT_SECRET"),
  refreshTokenSecret:
    process.env.REFRESH_TOKEN_SECRET ||
    process.env.ACCESS_TOKEN_SECRET ||
    requireEnv("JWT_SECRET"),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || "30d",
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "refresh_token",
  cookieSecure: process.env.NODE_ENV === "production",
  cookieSameSite: (process.env.COOKIE_SAMESITE as "lax" | "strict" | "none") || "lax",
};

