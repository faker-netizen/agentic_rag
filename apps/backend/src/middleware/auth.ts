import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export function requireAccessToken(req: Request, res: Response, next: NextFunction) {
    const h = req.headers.authorization || ''
    const [type, token] = h.split(' ')

    if (type !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'Missing access token' })
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { sub: string }
        req.userId = Number(payload.sub)
        return next()
    } catch {
        return res.status(401).json({ message: 'Invalid/expired access token' })
    }
}
