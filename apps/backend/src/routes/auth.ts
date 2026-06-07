import express from "express";
import {authConfig} from "../config/auth.js";
import {
    verifyPassword,
    registerUser,
    issueTokenPair,
    rotateRefreshToken,
    revokeRefreshToken,
} from "../services/authService.js";

const router = express.Router();

router.post("/login", async (req, res) => {
    try {
        const {email, password} = req.body ?? {};

        console.log(email,password)
        if (!email || !password) {
            return res.status(400).json({error: "email/password 不能为空"});
        }

        const user = await verifyPassword(String(email), String(password));
        if (!user) {
            return res.status(401).json({error: "账号或密码错误"});
        }

        const {accessToken, refreshToken, refreshExpiresAt} = await issueTokenPair(user);

        res.cookie(authConfig.refreshCookieName, refreshToken, {
            httpOnly: true,
            secure: authConfig.cookieSecure,
            sameSite: authConfig.cookieSameSite,
            expires: refreshExpiresAt,
            path: "/api/auth",
        });

        return res.json({
            success: true,
            accessToken,
            user: {id: user.id, email: user.email},
        });
    } catch (error) {
        console.error("login failed:", error);
        return res.status(500).json({error: "登录失败"});
    }
});

router.post("/refresh", async (req, res) => {
    try {
        const raw = req.cookies?.[authConfig.refreshCookieName];
        if (!raw) {
            return res.status(401).json({error: "缺少 refresh token"});
        }

        const rotated = await rotateRefreshToken(String(raw));
        if (!rotated) {
            return res.status(401).json({error: "refresh token 无效或已过期"});
        }

        res.cookie(authConfig.refreshCookieName, rotated.refreshToken, {
            httpOnly: true,
            secure: authConfig.cookieSecure,
            sameSite: authConfig.cookieSameSite,
            expires: rotated.refreshExpiresAt,
            path: "/api/auth",
        });

        return res.json({
            success: true,
            accessToken: rotated.accessToken,
            user: {id: rotated.user.id, email: rotated.user.email},
        });
    } catch (error) {
        console.error("refresh failed:", error);
        return res.status(500).json({error: "刷新失败"});
    }
});

router.post("/logout", async (req, res) => {
    try {
        const raw = req.cookies?.[authConfig.refreshCookieName];
        if (raw) {
            await revokeRefreshToken(String(raw));
        }

        res.clearCookie(authConfig.refreshCookieName, {
            path: "/api/auth",
            httpOnly: true,
            secure: authConfig.cookieSecure,
            sameSite: authConfig.cookieSameSite,
        });

        return res.json({success: true});
    } catch (error) {
        console.error("logout failed:", error);
        return res.status(500).json({error: "登出失败"});
    }
});

router.post("/register", async (req, res) => {
    try {
        const {email, password} = req.body ?? {};
        if (!email || !password) {
            return res.status(400).json({error: "email/password 不能为空"});
        }

        const created = await registerUser(String(email), String(password));
        if (!created.ok) {
            if (created.reason === "duplicate") {
                return res.status(409).json({error: "该邮箱已被注册"});
            }
            return res.status(400).json({
                error: "邮箱或密码不合法（密码至少 8 位，最长 128 位）",
            });
        }

        const {accessToken, refreshToken, refreshExpiresAt} = await issueTokenPair(created.user);
        res.cookie(authConfig.refreshCookieName, refreshToken, {
            httpOnly: true,
            secure: authConfig.cookieSecure,
            sameSite: authConfig.cookieSameSite,
            expires: refreshExpiresAt,
            path: "/api/auth",
        });

        return res.status(201).json({
            success: true,
            accessToken,
            user: {id: created.user.id, email: created.user.email},
        });
    } catch (err) {
        console.error("register failed:", err);
        return res.status(500).json({error: "注册失败"});
    }
});

export default router;

