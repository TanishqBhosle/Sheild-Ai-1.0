import type { Query } from 'firebase-admin/firestore'
import { db, FieldValue } from '../config/firebase'
import type { ContentDoc, ContentStatus, ContentType } from '../types'
import { LIMITS } from '../config/constants'

const COLLECTION = 'content'

export interface ContentFilters {
  type?: ContentType
  status?: ContentStatus
  from?: Date
  to?: Date
  page?: number
  limit?: number
  submittedBy?: string
}

export const contentRepo = {
  async create(
    data: Omit<ContentDoc, 'submittedAt' | 'isDeleted'>
  ): Promise<void> {
    const docRef = db.collection(COLLECTION).doc(data.contentId)
    await docRef.set({
      ...data,
      submittedAt: FieldValue.serverTimestamp(),
      isDeleted: false,
    })
  },

  async findById(contentId: string): Promise<ContentDoc | null> {
    const snap = await db.collection(COLLECTION).doc(contentId).get()
    if (!snap.exists) {
      return null
    }
    const d = snap.data() as ContentDoc
    return d.isDeleted ? null : d
  },

  async findAll(
    filters: ContentFilters
  ): Promise<{ items: ContentDoc[]; total: number }> {
    let query: Query = db
      .collection(COLLECTION)
      .where('isDeleted', '==', false) as Query

    if (filters.type) {
      query = query.where('type', '==', filters.type)
    }
    if (filters.status) {
      query = query.where('status', '==', filters.status)
    }
    if (filters.submittedBy) {
      query = query.where('submittedBy', '==', filters.submittedBy)
    }
    if (filters.from) {
      query = query.where('submittedAt', '>=', filters.from)
    }
    if (filters.to) {
      query = query.where('submittedAt', '<=', filters.to)
    }

    query = query.orderBy('submittedAt', 'desc')

    const countSnap = await query.count().get()
    const total = countSnap.data().count

    const page = Math.max(1, filters.page ?? 1)
    const limit = Math.min(
      LIMITS.MAX_PAGE_SIZE,
      filters.limit ?? LIMITS.DEFAULT_PAGE_SIZE
    )

    const snap = await query
      .offset((page - 1) * limit)
      .limit(limit)
      .get()
    const items = snap.docs.map((d) => d.data() as ContentDoc)
    return { items, total }
  },

  async updateStatus(contentId: string, status: ContentStatus): Promise<void> {
    await db.collection(COLLECTION).doc(contentId).update({ status })
  },

  async softDelete(contentId: string, deletedBy: string): Promise<void> {
    await db.collection(COLLECTION).doc(contentId).update({
      isDeleted: true,
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy,
    })
  },
}
