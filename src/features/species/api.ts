import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'

import { supabase } from '@/lib/supabase'

/** A species candidate from identification or search, before it's saved. */
export type SpeciesPick = {
  source: 'plantnet' | 'inaturalist'
  scientific_name: string
  common_name: string | null
  image_url: string | null
  external_id: string | null
  /** Pl@ntNet confidence, 0–1. */
  score?: number
}

export type Species = { id: string; scientific_name: string; common_name: string | null }

const httpsUrl = z.url().refine((u) => u.startsWith('https://'))

const identifyResponse = z.object({
  candidates: z.array(
    z.object({
      scientific_name: z.string().min(1),
      common_name: z.string().nullable(),
      score: z.number(),
      image_url: httpsUrl.nullable(),
      external_id: z.string().nullable(),
    }),
  ),
})

/** Pl@ntNet through the `identify` Edge Function; best candidate first. */
export async function identifyByPhoto(photo: Blob): Promise<SpeciesPick[]> {
  const body = new FormData()
  body.append('image', photo, 'plant.jpg')
  const { data, error } = await supabase.functions.invoke('identify', { body })
  if (error) throw error
  return identifyResponse.parse(data).candidates.map((c) => ({ ...c, source: 'plantnet' as const }))
}

// iNaturalist needs no key, so the search runs straight from the client.
const INAT_URL = 'https://api.inaturalist.org/v1/taxa/autocomplete'
const PLANTAE_TAXON_ID = '47126'
export const MIN_SPECIES_QUERY = 3

const inatResponse = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      rank: z.string(),
      preferred_common_name: z.string().optional(),
      default_photo: z.object({ square_url: httpsUrl.nullable().optional() }).nullable().optional(),
    }),
  ),
})

export const speciesSearchQuery = (term: string) =>
  queryOptions({
    queryKey: ['species-search', term],
    queryFn: async ({ signal }): Promise<SpeciesPick[]> => {
      const url = new URL(INAT_URL)
      url.searchParams.set('q', term)
      url.searchParams.set('taxon_id', PLANTAE_TAXON_ID)
      url.searchParams.set('per_page', '8')
      url.searchParams.set('locale', 'en')
      const res = await fetch(url, { signal })
      if (!res.ok) throw new Error(`iNaturalist ${res.status}`)
      return inatResponse
        .parse(await res.json())
        .results.filter((r) =>
          ['species', 'hybrid', 'variety', 'subspecies', 'genus'].includes(r.rank),
        )
        .map((r) => ({
          source: 'inaturalist' as const,
          scientific_name: r.name,
          common_name: r.preferred_common_name ?? null,
          image_url: r.default_photo?.square_url ?? null,
          external_id: String(r.id),
        }))
    },
    staleTime: 10 * 60_000,
  })

/**
 * Returns the id of the user's row for this species, adding it first if it's new.
 * Not an upsert: ON CONFLICT DO UPDATE would need update rights on scientific_name.
 */
export async function saveSpecies(pick: SpeciesPick): Promise<string> {
  const existing = await supabase
    .from('species')
    .select('id')
    .eq('scientific_name', pick.scientific_name)
    .maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return existing.data.id

  const { data, error } = await supabase
    .from('species')
    .insert({
      source: pick.source,
      scientific_name: pick.scientific_name,
      common_name: pick.common_name,
      image_url: pick.image_url,
      external_id: pick.external_id,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** "Monstera deliciosa · Swiss cheese plant". */
export const speciesLine = (s: { scientific_name: string; common_name: string | null }) =>
  s.common_name ? `${s.scientific_name} · ${s.common_name}` : s.scientific_name
