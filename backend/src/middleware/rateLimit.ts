import type { Request, Response, NextFunction } from 'express'
import { db, FieldValue } from '../config/firebase'

const WINDOW_MS = 60 * 1000
const MAX_REQ = 100

export const rateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user?.uid) {
    next()
    return
  }

  const uid = req.user.uid
  const windowId = Math.floor(Date.now() / WINDOW_MS)
  const docRef = db.collection('_rateLimit').doc(`${uid}_${windowId}`)

  try {
    const result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef)
      const count = doc.exists ? (doc.data()?.count as number) : 0
      if (count >= MAX_REQ) {
        return { limited: true as const, count }
      }
      tx.set(
        docRef,
        {
          count: FieldValue.increment(1),
          expiresAt: Date.now() + WINDOW_MS,
        },
        { merge: true }
      )
      return { limited: false as const, count: count + 1 }
    })

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
