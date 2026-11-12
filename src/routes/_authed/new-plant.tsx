import { zodResolver } from '@hookform/resolvers/zod'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { FormProvider, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { z } from 'zod'

import { FormCard, FormError, FormScreen } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import { ChoiceGroup } from '@/components/ui/ChoiceGroup'
import { useCreatePlant } from '@/features/plants/api'
import {
  FertilizerFields,
  PhotoNameFields,
  PlantSpotFields,
  PotSoilFields,
  RoomField,
  ScheduleFields,
} from '@/features/plants/fields'
import { plantDefaults, plantSchema, type PlantFormValues } from '@/features/plants/options'
import { usePickedPhoto } from '@/features/plants/usePickedPhoto'
import { fertilizersQuery } from '@/features/fertilizers/api'
import { roomsQuery } from '@/features/rooms/api'
import type { SpeciesPick } from '@/features/species/api'
import { IdentifyStep } from '@/features/species/IdentifyStep'
import {
  applyRecommendation,
  useDraftRecommendation,
  type Recommendation,
} from '@/features/recommend/api'
import { SuggestionCard } from '@/features/recommend/SuggestionCard'

const steps: { title: string; fields: FieldPath<PlantFormValues>[] }[] = [
  { title: 'What plant is it?', fields: [] },
  { title: 'Name & room', fields: ['nickname', 'room_id'] },
  {
    title: 'Pot & soil',
    fields: ['pot_type', 'pot_diameter_cm', 'drainage', 'soil', 'soil_custom', 'repotted_on'],
  },
  { title: 'Plant & spot', fields: ['height_cm', 'born_on', 'near', 'grow_light_hours'] },
  {
    title: 'Care schedule',
    fields: ['water_days_warm', 'water_days_cold', 'progress_days', 'tip'],
  },
]

type LastWatered = 'today' | 'few_days' | 'week' | 'unknown'

const lastWateredOptions: { value: LastWatered; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'few_days', label: '3–5 days ago' },
  { value: 'week', label: 'A week ago' },
  { value: 'unknown', label: 'Not sure' },
]

/** Logged as a past watering, so the first task lands on the right day. */
const lastWateredDays: Record<LastWatered, number | null> = {
  today: 0,
  few_days: 4,
  week: 7,
  unknown: null,
}

export const Route = createFileRoute('/_authed/new-plant')({
  validateSearch: z.object({
    step: z.number().int().min(1).max(steps.length).catch(1).default(1),
    roomId: z.string().optional().catch(undefined),
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(roomsQuery()),
      context.queryClient.ensureQueryData(fertilizersQuery()),
    ]),
  component: NewPlantScreen,
})

/** Add plant: five steps in one form, starting with the species. */
function NewPlantScreen() {
  const { step, roomId } = Route.useSearch()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const { data: rooms } = useSuspenseQuery(roomsQuery())
  const { data: fertilizers } = useSuspenseQuery(fertilizersQuery())
  const create = useCreatePlant(user.id)
  const photo = usePickedPhoto()
  const [startedAt] = useState(step)
  const [lastWatered, setLastWatered] = useState<LastWatered>('unknown')
  const [species, setSpecies] = useState<SpeciesPick | null>(null)

  const form = useForm<PlantFormValues>({
    resolver: zodResolver(plantSchema),
    defaultValues: {
      ...plantDefaults,
      room_id: roomId ?? (rooms.length === 1 ? rooms[0]!.id : ''),
    },
  })

  // Form state lives in memory: after a reload mid-way, start over from step 1.
  useEffect(() => {
    if (startedAt > 1) navigate({ to: '/new-plant', search: { roomId }, replace: true })
  }, [startedAt, roomId, navigate])

  const [roomField, nicknameField] = useWatch({
    control: form.control,
    name: ['room_id', 'nickname'],
  })
  const room = rooms.find((r) => r.id === roomField)
  const nickname = nicknameField.trim()
  const last = step === steps.length
  const current = steps[step - 1]!

  const suggest = useDraftRecommendation()
  const [suggestion, setSuggestion] = useState<Recommendation | null>(null)
  // Between the plant being saved and its AI schedule being written; the button stays busy.
  const [finishing, setFinishing] = useState(false)

  /** Step 5 opens with the AI schedule filled in; the user can still change any number. */
  const askForSchedule = () =>
    suggest.mutate(
      { values: form.getValues(), species },
      {
        onSuccess: (r) => {
          setSuggestion(r)
          form.setValue('water_days_warm', r.water_days_warm)
          form.setValue('water_days_cold', r.water_days_cold)
          form.setValue('progress_days', r.progress_days)
          form.setValue('tip', r.tip)
          form.setValue('fert_mode', r.fertilizer.mode)
          form.setValue('fert_n', r.fertilizer.n)
          form.setValue('fert_months', r.fertilizer.months)
        },
      },
    )

  const onSubmit = form.handleSubmit((values) =>
    create.mutate(
      {
        values,
        photo: photo.blob,
        lastWateredDaysAgo: lastWateredDays[lastWatered],
        species,
      },
      {
        onSuccess: async ({ id }) => {
          setFinishing(true)
          // Untouched AI numbers are saved as the AI schedule, with its explanation.
          const v = form.getValues()
          if (
            suggestion &&
            v.water_days_warm === suggestion.water_days_warm &&
            v.water_days_cold === suggestion.water_days_cold &&
            v.progress_days === suggestion.progress_days
          ) {
            await applyRecommendation(id).catch(() => undefined)
          }
          await navigate({ to: '/plants/$plantId', params: { plantId: id }, replace: true })
        },
      },
    ),
  )

  const onContinue = async (e: FormEvent) => {
    e.preventDefault()
    if (last) return suggest.isPending ? undefined : onSubmit()
    if (await form.trigger(current.fields)) {
      if (step + 1 === steps.length) askForSchedule()
      navigate({ to: '/new-plant', search: { step: step + 1, roomId } })
    }
  }

  const back =
    step > 1
      ? { to: '/new-plant' as const, search: { step: step - 1, roomId }, label: 'Back' }
      : roomId
        ? {
            to: '/rooms/$roomId' as const,
            params: { roomId },
            label: 'Close',
            icon: 'close' as const,
          }
        : { to: '/plants' as const, label: 'Close', icon: 'close' as const }

  const subtitles = [
    'Identify it by photo or find it by name.',
    'A photo and a name you’ll recognise in Today.',
    'Not sure? Pick the closest option, you can change it later.',
    room ? `Light and climate come from ${room.name}.` : 'Light and climate come from the room.',
    'Suggested from the species, pot, spot and weather. Change anything you know better.',
  ]

  return (
    <FormProvider {...form}>
      <FormScreen
        back={back}
        step={`Step ${step} of ${steps.length}`}
        top={<Progress step={step} />}
        title={current.title}
        subtitle={subtitles[step - 1]}
        onSubmit={onContinue}
        bottomBar={
          <Button
            type="submit"
            loading={create.isPending || finishing}
            // Wait for the AI schedule; if it fails, the user can still add with their own numbers.
            disabled={last && suggest.isPending}
          >
            {last && suggest.isPending
              ? 'Getting a care schedule…'
              : last
                ? `Add ${nickname || 'plant'}`
                : 'Continue'}
          </Button>
        }
      >
        {step === 1 && (
          <IdentifyStep
            picked={species}
            onPhoto={photo.set}
            onPick={(pick) => {
              setSpecies(pick)
              // A name to start from; the next step lets the user change it.
              if (pick && !form.getValues('nickname').trim()) {
                form.setValue('nickname', pick.common_name ?? pick.scientific_name)
              }
            }}
          />
        )}
        {step === 2 && (
          <>
            <PhotoNameFields
              coverPath={null}
              preview={photo.preview}
              onPhoto={photo.pick}
              photoError={photo.error}
            />
            <RoomField rooms={rooms} />
          </>
        )}
        {step === 3 && <PotSoilFields />}
        {step === 4 && <PlantSpotFields />}
        {step === 5 && (
          <>
            <SuggestionCard
              state={
                suggest.isPending
                  ? suggest.failureCount > 0
                    ? 'retrying'
                    : 'loading'
                  : suggest.isError
                    ? 'error'
                    : suggestion
                      ? 'ready'
                      : 'idle'
              }
              suggestion={suggestion}
              onRetry={askForSchedule}
            />
            <ScheduleFields />
            <FertilizerFields fertilizers={fertilizers} />
            <FormCard>
              <h2 className="text-label text-primary">When did you last water it?</h2>
              <ChoiceGroup
                label="Last watered"
                options={lastWateredOptions}
                value={lastWatered}
                onChange={setLastWatered}
              />
            </FormCard>
          </>
        )}
        <FormError message={create.error ? 'Couldn’t add the plant. Try again.' : null} />
      </FormScreen>
    </FormProvider>
  )
}

function Progress({ step }: { step: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Add plant progress"
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={step}
      className="h-1.5 rounded-pill bg-border"
    >
      <div
        className="h-1.5 rounded-pill bg-primary transition-[width]"
        style={{ width: `${(step / steps.length) * 100}%` }}
      />
    </div>
  )
}
