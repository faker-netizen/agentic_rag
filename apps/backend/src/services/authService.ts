/**
 * 导入所需的模块和配置
 */
import jwt, {Secret, SignOptions} from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import pool from "../config/database.js";
import {authConfig} from "../config/auth.js";

/**
 * 定义认证用户类型
 */
export type AuthUser = { id: number; email: string };

/**
 * 定义数据库用户行类型
 */
type UserRow = { id: number; email: string; password_hash: string };

/**
 * 使用SHA256算法计算输入字符串的哈希值
 * @param input 要哈希的输入字符串
 * @returns 返回SHA256哈希值的十六进制字符串
 */
function sha256Hex(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * 生成指定长度的随机令牌
 * @param bytes 随机字节数，默认为32
 * @returns 返回base64url编码的随机字符串
 */
function randomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString("base64url");
}

/**
 * 生成随机的JWT ID (jti)
 * @returns 返回UUID格式的随机字符串
 */
function randomJti(): string {
    // 兼容 MySQL 存储（36 chars）
    return crypto.randomUUID();
}

/**
 * 将时间字符串转换为毫秒数
 * @param ttl 时间字符串，支持 "15m" / "30d" / "3600" (秒) 等格式
 * @returns 返回毫秒数
 */
function ttlToMs(ttl: string): number {
    // 支持 "15m" / "30d" / "3600" (秒)
    const m = ttl.trim().match(/^(\d+)\s*([smhd])?$/i);
    if (!m) throw new Error(`Invalid ttl: ${ttl}`);
    const n = Number(m[1]);
    const unit = (m[2] || "s").toLowerCase();
    const mult =
        unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
    return n * mult;
}

/**
 * 为用户生成访问令牌
 * @param user 认证用户信息
 * @returns 返回JWT格式的访问令牌
 */
export function signAccessToken(user: AuthUser): string {
    return jwt.sign(
        {tokenType: "access", email: user.email},
        authConfig.accessTokenSecret as Secret,
        {subject: String(user.id), expiresIn: authConfig.accessTokenTtl,} as SignOptions
    );
}

/**
 * 为用户生成刷新令牌
 * @param user 认证用户信息
 * @param jti 令牌ID
 * @returns 返回JWT格式的刷新令牌
 */
export function signRefreshJwt(user: AuthUser, jti: string): string {
    return jwt.sign(
        {tokenType: "refresh", jti, email: user.email},
        authConfig.refreshTokenSecret,
        {subject: String(user.id), expiresIn: authConfig.refreshTokenTtl} as SignOptions
    );
}

/**
 * 验证用户密码
 * @param email 用户邮箱
 * @param password 用户密码
 * @returns 返回用户信息或null（验证失败时）
 */
export async function verifyPassword(email: string, password: string): Promise<AuthUser | null> {
    const [rows] = await pool.query("SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1", [
        email,
    ]);
    const users = rows as UserRow[];
    const user = users[0];
    if (!user) return null;

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return null;

    return {id: user.id, email: user.email};
}

/**
 * 为用户生成令牌对（访问令牌和刷新令牌）
 * @param user 认证用户信息
 * @returns 返回包含访问令牌、刷新令牌和过期时间的对象
 */
export async function issueTokenPair(user: AuthUser): Promise<{
    accessToken: string;
    refreshToken: string;
    refreshExpiresAt: Date;
}> {
    // refresh token 采用：随机串 + JWT（双层，便于撤销/轮换与可扩展）
    // 这里用 “随机串” 作为 cookie 内容，DB 存 hash；JWT 用于 future-proof（目前不放 cookie）
    const jti = randomJti();
    const raw = randomToken(48);
    const tokenHash = sha256Hex(raw);

    const refreshMs = ttlToMs(authConfig.refreshTokenTtl);
    const refreshExpiresAt = new Date(Date.now() + refreshMs);

    await pool.query(
        "INSERT INTO refresh_tokens (user_id, token_hash, jti, expires_at) VALUES (?, ?, ?, ?)",
        [user.id, tokenHash, jti, refreshExpiresAt]
    );

    const accessToken = signAccessToken(user);
    // 注意：当前实现 refresh cookie 存 raw（随机串），不存 JWT；如需要可改为 signRefreshJwt(user,jti)
    return {accessToken, refreshToken: raw, refreshExpiresAt};
}

export async function rotateRefreshToken(rawRefreshToken: string): Promise<{
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    refreshExpiresAt: Date;
} | null> {
    const tokenHash = sha256Hex(rawRefreshToken);
    const [rows] = await pool.query(
        `
            SELECT rt.id, rt.user_id, rt.revoked_at, rt.expires_at, u.email
            FROM refresh_tokens rt
                     JOIN users u ON u.id = rt.user_id
            WHERE rt.token_hash = ?
            LIMIT 1
        `,
        [tokenHash]
    );
    const rts = rows as Array<{
        id: number;
        user_id: number;
        revoked_at: Date | null;
        expires_at: Date;
        email: string;
    }>;
    const rt = rts[0];
    if (!rt) return null;
    if (rt.revoked_at) return null;
    if (new Date(rt.expires_at).getTime() <= Date.now()) return null;

    const user: AuthUser = {id: rt.user_id, email: rt.email};

    // 轮换：撤销旧 token，并签发新 token（并记录 replaced_by）
    const next = await issueTokenPair(user);
    const nextHash = sha256Hex(next.refreshToken);

    await pool.query(
        "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP, replaced_by_token_hash = ? WHERE id = ?",
        [nextHash, rt.id]
    );

    return {
        user,
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        refreshExpiresAt: next.refreshExpiresAt
    };
}

export async function revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = sha256Hex(rawRefreshToken);
    await pool.query(
        "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND revoked_at IS NULL",
        [tokenHash]
    );
}

