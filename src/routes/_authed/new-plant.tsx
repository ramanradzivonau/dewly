import { zodResolver } from '@hookform/resolvers/zod'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { FormProvider, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { z } from 'zod'

import { FormError, FormScreen } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import { useCreatePlant } from '@/features/plants/api'
import {
  PhotoNameFields,
  PlantSpotFields,
  PotSoilFields,
  RoomField,
  ScheduleFields,
} from '@/features/plants/fields'
import { plantDefaults, plantSchema, type PlantFormValues } from '@/features/plants/options'
import { usePickedPhoto } from '@/features/plants/usePickedPhoto'
import { roomsQuery } from '@/features/rooms/api'

const steps: { title: string; fields: FieldPath<PlantFormValues>[] }[] = [
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

export const Route = createFileRoute('/_authed/new-plant')({
  validateSearch: z.object({
    step: z.number().int().min(1).max(steps.length).catch(1).default(1),
    roomId: z.string().optional().catch(undefined),
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(roomsQuery()),
  component: NewPlantScreen,
})

/** Add plant: four steps in one form. Species identification joins as step 1 in phase 6. */
function NewPlantScreen() {
  const { step, roomId } = Route.useSearch()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const { data: rooms } = useSuspenseQuery(roomsQuery())
  const create = useCreatePlant(user.id)
  const photo = usePickedPhoto()
  const [startedAt] = useState(step)

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

  const onSubmit = form.handleSubmit((values) =>
    create.mutate(
      { values, photo: photo.blob },
      {
        onSuccess: ({ id }) =>
          navigate({ to: '/plants/$plantId', params: { plantId: id }, replace: true }),
      },
    ),
  )

  const onContinue = async (e: FormEvent) => {
    e.preventDefault()
    if (last) return onSubmit()
    if (await form.trigger(current.fields)) {
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
    'A photo and a name you’ll recognise in Today.',
    'Not sure? Pick the closest option, you can change it later.',
    room ? `Light and climate come from ${room.name}.` : 'Light and climate come from the room.',
    'Set by hand for now. You can change it any time.',
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
          <Button type="submit" loading={create.isPending}>
            {last ? `Add ${nickname || 'plant'}` : 'Continue'}
          </Button>
        }
      >
        {step === 1 && (
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
        {step === 2 && <PotSoilFields />}
        {step === 3 && <PlantSpotFields />}
        {step === 4 && <ScheduleFields />}
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
