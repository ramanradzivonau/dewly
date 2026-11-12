import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { z } from 'zod'

import { FormScreen, FormCard, FormError } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { useUpdateProfile } from '@/features/profile/api'
import {
  MIN_PLACE_QUERY,
  placeDetail,
  placeLabel,
  placeSearchQuery,
  type Place,
} from '@/features/profile/places'
import { tasksKey } from '@/features/care/keys'
import { aiSchedules, recalculate } from '@/features/recommend/api'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

export const Route = createFileRoute('/_authed/onboarding/city')({
  // from=profile: changing the city later, from Profile, rather than finishing sign-up.
  validateSearch: z.object({ from: z.literal('profile').optional().catch(undefined) }),
  component: CityScreen,
})

function CityScreen() {
  const { user } = Route.useRouteContext()
  const { from } = Route.useSearch()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Place | null>(null)
  const [pickError, setPickError] = useState<string | null>(null)

  const term = useDebouncedValue(query.trim(), 300)
  const search = useQuery({
    ...placeSearchQuery(term),
    enabled: !selected && term.length >= MIN_PLACE_QUERY,
  })
  const save = useUpdateProfile(user.id)

  const pick = (place: Place) => {
    setSelected(place)
    setQuery(placeLabel(place))
    setPickError(null)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!selected) {
      setPickError('Pick your city from the list.')
      return
    }
    save.mutate(
      {
        city: placeLabel(selected),
        lat: selected.latitude,
        lon: selected.longitude,
        timezone: selected.timezone ?? null,
      },
      {
        onSuccess: () => {
          if (from !== 'profile') return navigate({ to: '/today', replace: true })
          // New city, new weather and day length: refresh AI schedules in the background.
          void aiSchedules()
            .then(recalculate)
            .then(() => queryClient.invalidateQueries({ queryKey: tasksKey }))
            .catch(() => undefined)
          return navigate({ to: '/profile', replace: true })
        },
      },
    )
  }

  const results = search.data ?? []
  const showList = !selected && term.length >= MIN_PLACE_QUERY

  return (
    <FormScreen
      step={from === 'profile' ? undefined : 'Step 3 of 3'}
      back={from === 'profile' ? { to: '/profile', label: 'Back to Profile' } : undefined}
      title={from === 'profile' ? 'City' : 'Where do your plants live?'}
      subtitle="Outdoor temperature and daylight change how often plants need water. Only the city is stored."
      onSubmit={onSubmit}
      bottomBar={
        <Button type="submit" loading={save.isPending}>
          {from === 'profile' ? 'Save' : 'Continue'}
        </Button>
      }
    >
      <FormCard>
        <TextField
          label="City"
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Start typing, e.g. Warsaw"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(null)
          }}
          error={pickError ?? undefined}
        />

        {showList && (
          <div aria-live="polite">
            {search.isPending && <p className="py-3 text-caption text-ink-subtle">Searching…</p>}
            {search.isError && (
              <p className="py-3 text-caption text-danger">
                Couldn’t search right now. Check your connection.
              </p>
            )}
            {search.isSuccess && results.length === 0 && (
              <p className="py-3 text-caption text-ink-subtle">
                No cities found. Check the spelling.
              </p>
            )}
            {results.length > 0 && (
              <ul aria-label="Matching cities">
                {results.map((place) => (
                  <li key={place.id} className="border-b border-divider last:border-b-0">
                    <button
                      type="button"
                      onClick={() => pick(place)}
                      className="flex min-h-14 w-full flex-col justify-center gap-0.5 text-left"
                    >
                      <span className="text-input font-bold text-ink">{place.name}</span>
                      <span className="text-caption text-ink-subtle">{placeDetail(place)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </FormCard>

      <FormError message={save.error ? 'Couldn’t save your city. Try again.' : null} />
    </FormScreen>
  )
}
