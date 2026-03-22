import type * as admin from 'firebase-admin'
import { db, FieldValue } from '../config/firebase'
import type { PolicyDoc, PolicyThresholds, PolicyAutomation } from '../types'
import { DEFAULT_THRESHOLDS } from '../config/constants'

const DOC_PATH = 'policies/default'

export const policiesRepo = {
  async getDefault(): Promise<PolicyDoc | null> {
    const snap = await db.doc(DOC_PATH).get()
    if (!snap.exists) {
      return null
    }
    return snap.data() as PolicyDoc
  },

  async getDefaultOrFallback(): Promise<{
    thresholds: PolicyThresholds
    automation: PolicyAutomation
    updatedBy: string
    updatedAt: admin.firestore.Timestamp | null
  }> {
    const doc = await policiesRepo.getDefault()
    if (!doc) {
      return {
        thresholds: { ...DEFAULT_THRESHOLDS },
        automation: {
          autoBlockCritical: true,
          humanReviewMediumPlus: true,
          learningMode: false,
        },
        updatedBy: 'system',
        updatedAt: null,
      }
    }
    return {
      thresholds: doc.thresholds,
      automation: doc.automation,
      updatedBy: doc.updatedBy,
      updatedAt: doc.updatedAt,
    }
  },

  async setPolicies(
    thresholds: PolicyThresholds,
    automation: PolicyAutomation,
    updatedBy: string
  ): Promise<void> {
    await db.doc(DOC_PATH).set({
      thresholds,
      automation,
      updatedBy,
      updatedAt: FieldValue.serverTimestamp(),
    })
  },
}
