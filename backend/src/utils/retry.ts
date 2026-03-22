import { logger } from './logger'

export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
  context = 'operation'
): Promise<T> => {
  let lastError: Error = new Error('Unknown error')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const errObj = error as { status?: number; code?: string }
      const isRetryable =
        errObj?.status === 429 ||
        errObj?.status === 503 ||
        errObj?.code === 'UNAVAILABLE'

      if (!isRetryable || attempt === maxAttempts) {
        logger.error(`${context} failed after ${attempt} attempts`, {
          error: lastError.message,
        })
        throw lastError
      }

      const delayMs = baseDelayMs * Math.pow(2, attempt - 1)
      logger.warn(`${context} attempt ${attempt} failed, retrying in ${delayMs}ms`)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastError
}
