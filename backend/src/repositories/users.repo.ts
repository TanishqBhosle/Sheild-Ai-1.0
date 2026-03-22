import { db, FieldValue } from '../config/firebase'
import type { UserDoc } from '../types'

const COLLECTION = 'users'

export const usersRepo = {
  async findByUid(uid: string): Promise<UserDoc | null> {
    const snap = await db.collection(COLLECTION).doc(uid).get()
    if (!snap.exists) {
      return null
    }
    return snap.data() as UserDoc
  },

  async listTeam(limit = 500): Promise<UserDoc[]> {
    const snap = await db.collection(COLLECTION).orderBy('createdAt', 'desc').limit(limit).get()
    return snap.docs.map((d) => d.data() as UserDoc)
  },

  async updateRole(uid: string, role: UserDoc['role']): Promise<void> {
    await db.collection(COLLECTION).doc(uid).update({ role })
  },

  async incrementCasesReviewed(uid: string): Promise<void> {
    await db.collection(COLLECTION).doc(uid).update({
      casesReviewed: FieldValue.increment(1),
    })
  },
}
