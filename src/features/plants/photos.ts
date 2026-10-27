import { queryOptions } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

const BUCKET = 'plant-photos'
const MAX_SIDE = 1600
const QUALITY = 0.85
/** Signed URLs live an hour; refetch a bit before they expire. */
const URL_TTL_S = 3600

/** Scales a picked photo down to MAX_SIDE on the long edge and re-encodes it as JPEG. */
export async function resizePhoto(file: File): Promise<Blob> {
  // createImageBitmap applies the EXIF orientation, so portrait iPhone photos stay upright.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Couldn’t read the photo'))),
      'image/jpeg',
      QUALITY,
    ),
  )
}

/** Uploads to <user_id>/<uuid>.jpg and returns the storage path. */
export async function uploadPhoto(userId: string, photo: Blob) {
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, photo, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}

/** Best effort: a leftover file only costs storage. */
export async function removePhotos(paths: string[]) {
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths)
}

export const photoUrlQuery = (path: string) =>
  queryOptions({
    queryKey: ['photo-url', path],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, URL_TTL_S)
      if (error) throw error
      return data.signedUrl
    },
    staleTime: (URL_TTL_S - 300) * 1000,
    gcTime: (URL_TTL_S - 300) * 1000,
  })
