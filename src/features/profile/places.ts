import { queryOptions } from '@tanstack/react-query'

/** A city from the Open-Meteo geocoding API (no key needed). */
export type Place = {
  id: number
  name: string
  latitude: number
  longitude: number
  timezone?: string
  country?: string
  admin1?: string
}

export const MIN_PLACE_QUERY = 2

export const placeSearchQuery = (name: string) =>
  queryOptions({
    queryKey: ['places', name],
    queryFn: async ({ signal }) => {
      const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
      url.searchParams.set('name', name)
      url.searchParams.set('count', '6')
      url.searchParams.set('language', 'en')
      url.searchParams.set('format', 'json')
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error(`City search failed (${response.status})`)
      const body = (await response.json()) as { results?: Place[] }
      return body.results ?? []
    },
    staleTime: Infinity,
  })

/** What we store and show as the city: "Warsaw, Poland". */
export const placeLabel = (place: Place) => [place.name, place.country].filter(Boolean).join(', ')

/** Second line in the results list: "Mazovia, Poland". */
export const placeDetail = (place: Place) =>
  [place.admin1, place.country].filter(Boolean).join(', ')
