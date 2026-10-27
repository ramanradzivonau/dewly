import { useEffect, useState } from 'react'

import { resizePhoto } from './photos'

/** A photo picked in a form: resized right away, with a local preview until it's saved. */
export function usePickedPhoto() {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  const pick = async (file: File) => {
    setError(null)
    try {
      const resized = await resizePhoto(file)
      setBlob(resized)
      setPreview(URL.createObjectURL(resized))
    } catch {
      setError('Couldn’t read this photo. Try another one.')
    }
  }

  return { blob, preview, error, pick }
}
