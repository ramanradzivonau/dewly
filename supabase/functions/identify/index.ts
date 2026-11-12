// Identify a plant from a photo with Pl@ntNet. The API key stays here, never in the client.
// POST multipart/form-data with `image` (a JPEG, resized on the device); the caller must be
// signed in (the gateway verifies the JWT). Returns up to five candidates, best first.

import { cors, json } from '../_shared/http.ts'

const PLANTNET_URL = 'https://my-api.plantnet.org/v2/identify/all'
const MAX_BYTES = 5 * 1024 * 1024

type PlantNetResult = {
  score: number
  species: {
    scientificNameWithoutAuthor: string
    commonNames?: string[]
  }
  images?: { url?: { s?: string; m?: string } }[]
  gbif?: { id?: string | number }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const key = Deno.env.get('PLANTNET_API_KEY')
  if (!key) return json({ error: 'Identification is not set up' }, 500)

  let image: File
  try {
    const form = await req.formData()
    const value = form.get('image')
    if (!(value instanceof File)) return json({ error: 'Send the photo as "image"' }, 400)
    image = value
  } catch {
    return json({ error: 'Send the photo as multipart form data' }, 400)
  }
  if (image.size > MAX_BYTES) return json({ error: 'Photo is too large' }, 413)

  const body = new FormData()
  body.append('images', image, 'plant.jpg')
  body.append('organs', 'auto')

  const url = new URL(PLANTNET_URL)
  url.searchParams.set('api-key', key)
  url.searchParams.set('lang', 'en')
  url.searchParams.set('nb-results', '5')
  url.searchParams.set('include-related-images', 'true')

  const res = await fetch(url, { method: 'POST', body })
  // Pl@ntNet answers 404 when nothing in the photo looks like a plant it knows.
  if (res.status === 404) return json({ candidates: [] })
  if (!res.ok) {
    console.error('Pl@ntNet', res.status, await res.text())
    return json({ error: 'Identification failed' }, 502)
  }

  const data = (await res.json()) as { results?: PlantNetResult[] }
  const candidates = (data.results ?? []).map((r) => ({
    scientific_name: r.species.scientificNameWithoutAuthor,
    common_name: r.species.commonNames?.[0] ?? null,
    score: r.score,
    image_url: r.images?.[0]?.url?.m ?? r.images?.[0]?.url?.s ?? null,
    external_id: r.gbif?.id != null ? String(r.gbif.id) : null,
  }))

  return json({ candidates })
})
