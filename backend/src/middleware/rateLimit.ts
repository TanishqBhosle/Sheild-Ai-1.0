import type { Request, Response, NextFunction } from 'express'
import { rateLimitRepo } from '../repositories/rateLimit.repo'

const WINDOW_MS = 60 * 1000
const MAX_REQ = 100

export const rateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const identifier = req.ip || 'unknown'
  const windowId = Math.floor(Date.now() / WINDOW_MS)

  try {
    const result = await rateLimitRepo.checkAndIncrement(
      identifier,
      windowId,
      MAX_REQ,
      WINDOW_MS
    )

    res.setHeader('X-RateLimit-Limit', MAX_REQ)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQ - result.count))

    if (result.limited) {
      res.status(429).json({
        error: 'RATE_LIMITED',
        message: 'Too many requests. Try again in 1 minute.',
        statusCode: 429,
      })
      return
    }
    next()
  } catch {
    next()
  }
}
