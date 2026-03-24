import { db } from '../config/firebase'
import type { ContentDoc, ModerationResult } from '../types'

const CONTENT = 'content'
const RESULTS = 'moderation_results'
const APPEALS = 'appeals'

export const analyticsRepo = {
  async getContentInRange(since: Date): Promise<ContentDoc[]> {
    const snap = await db
      .collection(CONTENT)
      .where('isDeleted', '==', false)
      .where('submittedAt', '>=', since)
      .orderBy('submittedAt', 'asc')
      .limit(2000)
      .get()
    return snap.docs.map((d) => d.data() as ContentDoc)
  },

  async getModerationResultsInRange(since: Date): Promise<ModerationResult[]> {
    const snap = await db
      .collection(RESULTS)
      .where('createdAt', '>=', since)
      .limit(2000)
      .get()
    return snap.docs.map((d) => d.data() as ModerationResult)
  },

  async getAppealCountInRange(since: Date): Promise<number> {
    const snap = await db
      .collection(APPEALS)
      .where('submittedAt', '>=', since)
      .count()
      .get()
    return snap.data().count
  },

  async getAppealOutcomesCount(): Promise<{ total: number; overturned: number }> {
    const totalSnap = await db
      .collection(APPEALS)
      .where('status', 'in', ['overturned', 'upheld'])
      .count()
      .get()
    
    const overturnedSnap = await db
      .collection(APPEALS)
      .where('status', '==', 'overturned')
      .count()
      .get()

    return {
      total: totalSnap.data().count,
      overturned: overturnedSnap.data().count,
    }
  },

  async getCache(key: string): Promise<any | null> {
    const snap = await db.doc(`cache/${key}`).get()
    if (!snap.exists) return null
    return snap.data()
  },

  async setCache(key: string, data: any): Promise<void> {
    await db.doc(`cache/${key}`).set(data)
  }
}
