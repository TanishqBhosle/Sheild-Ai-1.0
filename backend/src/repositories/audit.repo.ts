import { db, FieldValue } from '../config/firebase'
import { logger } from '../utils/logger'
import type { AuditLog } from '../types'

const COLLECTION = 'audit_logs'

export interface WriteLogInput {
  actorId: string
  action: string
  targetId: string
  targetType: AuditLog['targetType']
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  ipAddress?: string
}

export const auditRepo = {
  async writeLog(input: WriteLogInput): Promise<void> {
    const logId = `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    try {
      await db.collection(COLLECTION).doc(logId).set({
        logId,
        actorId: input.actorId,
        action: input.action,
        targetId: input.targetId,
        targetType: input.targetType,
        previousValue: input.previousValue ?? null,
        newValue: input.newValue ?? null,
        timestamp: FieldValue.serverTimestamp(),
        ipAddress: input.ipAddress ?? null,
      })
    } catch (error) {
      logger.error('auditRepo.writeLog failed', {
        error: error instanceof Error ? error.message : String(error),
        action: input.action,
        targetId: input.targetId,
      })
      throw error
    }
  },
}
