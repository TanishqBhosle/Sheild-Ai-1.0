import type { Request, Response, NextFunction } from 'express'
import { auth } from '../config/firebase'
import { UnauthorizedError } from '../utils/errors'
import type { UserRole } from '../types'

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header')
    }

    const token = header.slice(7)
    const decoded = await auth.verifyIdToken(token, true)

    const roleClaim = decoded['role']
    if (!roleClaim) {
      throw new UnauthorizedError('Missing role claim')
    }
    const role: UserRole =
      roleClaim === 'moderator' || roleClaim === 'admin' || roleClaim === 'user'
        ? roleClaim
        : 'user'

    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? '',
      role,
    }

    next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid token'
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: message.includes('auth/')
        ? 'Invalid or expired token'
        : message,
      statusCode: 401,
    })
  }
}
