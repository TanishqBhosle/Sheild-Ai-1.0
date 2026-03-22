import type { Request, Response, NextFunction } from 'express'
import type { UserRole } from '../types'

export const requireRole =
  (...allowedRoles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role

    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        statusCode: 403,
      })
      return
    }
    next()
  }
