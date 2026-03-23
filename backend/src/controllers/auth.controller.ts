import type { Request, Response } from 'express'
import { auth, db } from '../config/firebase'
import { usersRepo } from '../repositories/users.repo'
import { auditRepo } from '../repositories/audit.repo'
import { AppError } from '../utils/errors'
import { logger } from '../utils/logger'
import type { UserRole } from '../types'

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }
    const doc = await usersRepo.findByUid(req.user.uid)
    if (!doc) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'User profile not found',
        statusCode: 404,
      })
      return
    }
    const { email, displayName, photoURL, role, createdAt, isActive, casesReviewed, uid } =
      doc
    res.json({
      uid,
      email,
      displayName,
      photoURL,
      role,
      createdAt,
      isActive,
      casesReviewed,
    })
  } catch (error) {
    logger.error('getMe failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
        statusCode: error.statusCode,
      })
      return
    }
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}

export const setRoleHttp = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }
    const { targetUid, role } = req.body as {
      targetUid: string
      role: UserRole
    }

    const validRoles: UserRole[] = ['user', 'moderator', 'admin']
    if (!targetUid || !validRoles.includes(role)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'targetUid and valid role required',
        statusCode: 400,
      })
      return
    }

    const callerRole = req.user.role
    if (callerRole !== 'admin') {
      // Non-admins cannot grant roles unless it's the bootstrap case
      const adminSnap = await db
        .collection('users')
        .where('role', '==', 'admin')
        .limit(1)
        .get()
      if (!adminSnap.empty) {
        // Admins exist: only admins can grant roles
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Not authorized. Only admins can modify user roles.',
          statusCode: 403,
        })
        return
      }
      // Bootstrap case: only allow user to grant admin to THEMSELVES
      if (targetUid !== req.user.uid) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Bootstrap only allows self-grant of admin role.',
          statusCode: 403,
        })
        return
      }
      logger.warn('BOOTSTRAP: First user granted admin role', { uid: req.user.uid, targetUid })
    }

    await auth.setCustomUserClaims(targetUid, { role })
    await usersRepo.updateRole(targetUid, role)

    await auditRepo.writeLog({
      actorId: req.user.uid,
      action: 'SET_USER_ROLE',
      targetId: targetUid,
      targetType: 'user',
      newValue: { role },
    })

    res.json({ success: true, uid: targetUid, role })
  } catch (error) {
    logger.error('setRoleHttp failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
        statusCode: error.statusCode,
      })
      return
    }
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  }
}
