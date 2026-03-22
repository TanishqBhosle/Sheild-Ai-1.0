import { storage } from '../config/firebase'
import { AppError } from '../utils/errors'

const DEFAULT_SIGNED_URL_TTL_MS = 60 * 60 * 1000

/**
 * Parse gs://bucket/path/to/object into bucket and object path.
 */
export const parseGsUri = (
  gsUri: string
): { bucket: string; filePath: string } => {
  const m = gsUri.match(/^gs:\/\/([^/]+)\/(.+)$/)
  if (!m) {
    throw new AppError('Invalid storage reference', 400, 'INVALID_STORAGE_REF')
  }
  return { bucket: m[1], filePath: m[2] }
}

export const getSignedReadUrl = async (
  gsUri: string,
  expiresMs: number = DEFAULT_SIGNED_URL_TTL_MS
): Promise<string> => {
  const { bucket, filePath } = parseGsUri(gsUri)
  const file = storage.bucket(bucket).file(filePath)
  const [exists] = await file.exists()
  if (!exists) {
    throw new AppError('Object not found', 404, 'NOT_FOUND')
  }
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresMs,
  })
  return url
}

export const buildUploadPath = (
  type: 'images' | 'audio' | 'video',
  uid: string,
  fileName: string
): string => {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `uploads/${type}/${uid}/${safe}`
}
