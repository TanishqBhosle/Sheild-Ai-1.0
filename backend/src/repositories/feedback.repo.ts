import { db, FieldValue } from '../config/firebase'

const COLLECTION = 'feedback'

export interface FeedbackData {
  feedbackId: string
  contentId: string
  moderatorId: string
  correctLabel: string
  notes: string
}

export const feedbackRepo = {
  async create(data: FeedbackData): Promise<void> {
    await db.collection(COLLECTION).doc(data.feedbackId).set({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    })
  }
}
