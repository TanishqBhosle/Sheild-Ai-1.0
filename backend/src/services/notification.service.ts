import { logger } from '../utils/logger'
import type { DecisionType } from '../types'

export interface NotifyUserParams {
  userId: string
  contentId: string
  decision: DecisionType | 'allowed' | 'flagged' | 'blocked'
  message?: string
}

/**
 * Records notification intent for Cloud Logging. Extend with FCM/email when configured.
 */
export const notifyUserEvent = (params: NotifyUserParams): void => {
  logger.info('notification:user_event', {
    userId: params.userId,
    contentId: params.contentId,
    decision: params.decision,
    message: params.message ?? '',
  })
}

export interface NotifyModeratorParams {
  contentId: string
  reason: string
}

export const notifyModeratorQueue = (params: NotifyModeratorParams): void => {
  logger.info('notification:moderator_queue', {
    contentId: params.contentId,
    reason: params.reason,
  })
}
