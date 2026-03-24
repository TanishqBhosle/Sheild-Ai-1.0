import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { fbStorage } from '../config/firebase'
import type { ContentType } from '../types'

const folderForType = (type: ContentType): 'images' | 'audio' | 'video' => {
  if (type === 'image') {
    return 'images'
  }
  if (type === 'audio') {
    return 'audio'
  }
  return 'video'
}

export const uploadMedia = async (
  uid: string,
  type: ContentType,
  file: File
): Promise<{ storagePath: string; gsUri: string }> => {
  const folder = folderForType(type)
  const name = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const path = `uploads/${folder}/${uid}/${name}`
  const r = ref(fbStorage, path)
  await uploadBytes(r, file, { contentType: file.type })
  await getDownloadURL(r)
  const bucket = fbStorage.app.options.storageBucket
  const gsUri = `gs://${bucket}/${path}`
  return { storagePath: path, gsUri }
}
