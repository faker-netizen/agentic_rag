import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { findUserById, findUserByUsername } from '../data/users.ts'
import { requireAccessToken } from '../middleware/auth'

type RefreshRow = {
    id: string
    userId: number
    tokenHash: string
    createdAt: string
    expiresAt: string
    revokedAt: string | null
}

const router = Router()

const ACCESS_TTL_SEC = 15 * 60
const REFRESH_TTL_SEC = 30 * 24 * 60 * 60

const TOKENS_FILE = path.resolve('src/data/tokens.json')

function sha256(s: string) {
    return crypto.createHash('sha256').update(s).digest('hex')
}

function signAccessToken(userId: number) {
    return jwt.sign(
        { sub: String(userId) },
        process.env.JWT_SECRET as string,
        { expiresIn: ACCESS_TTL_SEC }
    )
}

function newRefreshToken() {
    return crypto.randomBytes(48).toString('base64url')
}

function refreshCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production'
    return {
        httpOnly: true,
        secure: isProd,       // 本地开发没 https 就 false
        sameSite: 'lax' as const,
        path: '/api/auth/refresh',
        maxAge: REFRESH_TTL_SEC * 1000,
    }
}

async function readTokens(): Promise<RefreshRow[]> {
    try {
        const txt = await fs.readFile(TOKENS_FILE, 'utf-8')
        return JSON.parse(txt)
    } catch (e: any) {
        if (e.code === 'ENOENT') return []
        throw e
    }
}

async function writeTokensAtomic(rows: RefreshRow[]) {
    await fs.mkdir(path.dirname(TOKENS_FILE), { recursive: true })
    const tmp = `${TOKENS_FILE}.tmp`
    await fs.writeFile(tmp, JSON.stringify(rows, null, 2), 'utf-8')
    await fs.rename(tmp, TOKENS_FILE)
}

router.post('/login', async (req, res) => {
    const { username, password } = req.body || {}
    console.log({ username, password })
    if (!username || !password) return res.status(400).json({ message: 'username/password required' })
    console.log(findUserByUsername)
    const user = await findUserByUsername(username)
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' })

    const accessToken = signAccessToken(user.id)

    const rt = newRefreshToken()
    const tokens = await readTokens()
    tokens.push({
        id: crypto.randomUUID(),
        userId: user.id,
        tokenHash: sha256(rt),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000).toISOString(),
        revokedAt: null,
    })
    await writeTokensAtomic(tokens)

    res.cookie('refreshToken', rt, refreshCookieOptions())

    return res.json({
        accessToken,
        tokenType: 'Bearer',
        expiresIn: ACCESS_TTL_SEC,
        user: {
            id: user.id,
            username: user.username,
            roles: user.roles,
            permissions: user.permissions,
        },
    })
})

router.post('/refresh', async (req, res) => {
    const rt = req.cookies?.refreshToken as string | undefined
    if (!rt) return res.status(401).json({ message: 'No refresh token' })

    const now = Date.now()
    const tokens = await readTokens()
    const i = tokens.findIndex(t =>
        t.tokenHash === sha256(rt) &&
        !t.revokedAt &&
        new Date(t.expiresAt).getTime() > now
    )
    if (i === -1) return res.status(401).json({ message: 'Invalid refresh token' })

    const row = tokens[i]

    // 旋转：旧的撤销
    tokens[i] = { ...row, revokedAt: new Date().toISOString() }

    const newRt = newRefreshToken()
    tokens.push({
        id: crypto.randomUUID(),
        userId: row.userId,
        tokenHash: sha256(newRt),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000).toISOString(),
        revokedAt: null,
    })

    await writeTokensAtomic(tokens)

    res.cookie('refreshToken', newRt, refreshCookieOptions())

    const accessToken = signAccessToken(row.userId)
    return res.json({ accessToken, tokenType: 'Bearer', expiresIn: ACCESS_TTL_SEC })
})

router.post('/logout', async (req, res) => {
    const rt = req.cookies?.refreshToken as string | undefined

    if (rt) {
        const tokens = await readTokens()
        const i = tokens.findIndex(t => t.tokenHash === sha256(rt) && !t.revokedAt)
        if (i !== -1) {
            tokens[i] = { ...tokens[i], revokedAt: new Date().toISOString() }
            await writeTokensAtomic(tokens)
        }
    }

    res.cookie('refreshToken', '', { ...refreshCookieOptions(), maxAge: 0 })
    return res.json({ ok: true })
})

router.get('/me', requireAccessToken, async (req, res) => {
    const userId = req.userId!
    const user = await findUserById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    return res.json({
        id: user.id,
        username: user.username,
        roles: user.roles,
        permissions: user.permissions,
    })
})

export default router
