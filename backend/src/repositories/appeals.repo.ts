import type * as admin from 'firebase-admin'
import type { Query } from 'firebase-admin/firestore'
import { db } from '../config/firebase'
import type { AppealDoc, AppealStatus } from '../types'

const COLLECTION = 'appeals'

export interface AppealListFilters {
  status?: AppealStatus
  page?: number
  limit?: number
}

export const appealsRepo = {
  async create(
    doc: Omit<AppealDoc, 'submittedAt'> & {
      submittedAt: admin.firestore.FieldValue
    }
  ): Promise<void> {
    await db.collection(COLLECTION).doc(doc.appealId).set(doc)
  },

  async findById(appealId: string): Promise<AppealDoc | null> {
    const snap = await db.collection(COLLECTION).doc(appealId).get()
    if (!snap.exists) {
      return null
    }
    return snap.data() as AppealDoc
  },

  async findByContentIdForUser(
    contentId: string,
    userId: string
  ): Promise<AppealDoc | null> {
    const snap = await db
      .collection(COLLECTION)
      .where('contentId', '==', contentId)
      .where('userId', '==', userId)
      .limit(1)
      .get()
    if (snap.empty) {
      return null
    }
    return snap.docs[0].data() as AppealDoc
  },

  async list(filters: AppealListFilters): Promise<{
    items: AppealDoc[]
    total: number
  }> {
    let q: Query = db.collection(COLLECTION) as Query
    if (filters.status) {
      q = q.where('status', '==', filters.status)
    }
    q = q.orderBy('submittedAt', 'desc')
    const countSnap = await q.count().get()
    const total = countSnap.data().count
    const page = Math.max(1, filters.page ?? 1)
    const limit = Math.min(100, filters.limit ?? 20)
    const snap = await q
      .offset((page - 1) * limit)
      .limit(limit)
      .get()
    return { items: snap.docs.map((d) => d.data() as AppealDoc), total }
  },

  async update(
    appealId: string,
    patch: Record<string, unknown>
  ): Promise<void> {
    await db.collection(COLLECTION).doc(appealId).update(patch)
  },
}
