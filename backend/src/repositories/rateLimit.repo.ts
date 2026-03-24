import { db, FieldValue } from '../config/firebase'

export interface RateLimitResult {
  limited: boolean
  count: number
}

export const rateLimitRepo = {
  async checkAndIncrement(
    uid: string,
    windowId: number,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const docRef = db.collection('_rateLimit').doc(`${uid}_${windowId}`)

    return await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef)
      const count = doc.exists ? (doc.data()?.count as number) : 0

      if (count >= limit) {
        return { limited: true, count }
      }

      tx.set(
        docRef,
        {
          count: FieldValue.increment(1),
          expiresAt: Date.now() + windowMs,
        },
        { merge: true }
      )

      return { limited: false, count: count + 1 }
    })
  }
}
