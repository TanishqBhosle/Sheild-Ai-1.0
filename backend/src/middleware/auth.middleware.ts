import type { Request, Response, NextFunction } from 'express'
import { auth } from '../config/firebase'
import type { UserRole } from '../types'
import { usersRepo } from '../repositories/users.repo'

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Missing Authorization: Bearer <token> header',
        statusCode: 401,
      })
      return
    }

    const token = header.slice(7)
    const decoded = await auth.verifyIdToken(token, true)

    const roleClaim = decoded['role']
    const role: UserRole =
      roleClaim === 'moderator' || roleClaim === 'admin' || roleClaim === 'user'
        ? roleClaim
        : 'user'

    // Custom claims can lag behind (e.g., immediately after role updates).
    // If the token says `user`, fall back to the stored Firestore role.
    let effectiveRole = role
    if (role === 'user') {
      const userDoc = await usersRepo.findByUid(decoded.uid)
      if (userDoc?.role === 'moderator' || userDoc?.role === 'admin') {
        effectiveRole = userDoc.role
      }
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? '',
      role: effectiveRole,
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
