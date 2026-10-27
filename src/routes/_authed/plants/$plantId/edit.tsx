import { zodResolver } from '@hookform/resolvers/zod'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { FormCard, FormError, FormScreen } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import {
  plantQuery,
  toFormValues,
  useDeletePlant,
  useUpdatePlant,
  type Plant,
} from '@/features/plants/api'
import {
  PhotoNameFields,
  PlantSpotFields,
  PotSoilFields,
  RoomField,
  ScheduleFields,
} from '@/features/plants/fields'
import { plantSchema, type PlantFormValues } from '@/features/plants/options'
import { usePickedPhoto } from '@/features/plants/usePickedPhoto'
import { roomsQuery } from '@/features/rooms/api'

export const Route = createFileRoute('/_authed/plants/$plantId/edit')({
  loader: async ({ context, params }) => {
    const [plant] = await Promise.all([
      context.queryClient.ensureQueryData(plantQuery(params.plantId)),
      context.queryClient.ensureQueryData(roomsQuery()),
    ])
    if (!plant) throw notFound()
  },
  component: EditPlantScreen,
})

function EditPlantScreen() {
  const { plantId } = Route.useParams()
  const { data: plant } = useSuspenseQuery(plantQuery(plantId))
  if (!plant) return null
  return <EditPlantForm plant={plant} />
}

/** Every plant setting on one page, grouped like the Add plant steps. */
function EditPlantForm({ plant }: { plant: Plant }) {
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const { data: rooms } = useSuspenseQuery(roomsQuery())
  const update = useUpdatePlant(user.id, plant)
  const photo = usePickedPhoto()
  const form = useForm<PlantFormValues>({
    resolver: zodResolver(plantSchema),
    defaultValues: toFormValues(plant),
  })

  const onSubmit = form.handleSubmit((values) =>
    update.mutate(
      { values, photo: photo.blob },
      {
        onSuccess: () =>
          navigate({ to: '/plants/$plantId', params: { plantId: plant.id }, replace: true }),
      },
    ),
  )

  return (
    <FormProvider {...form}>
      <FormScreen
        back={{
          to: '/plants/$plantId',
          params: { plantId: plant.id },
          label: `Back to ${plant.nickname}`,
        }}
        title="Edit plant"
        subtitle="Change anything you got wrong or that has changed since."
        onSubmit={onSubmit}
        bottomBar={
          <Button type="submit" loading={update.isPending}>
            Save changes
          </Button>
        }
      >
        <PhotoNameFields
          coverPath={plant.cover_photo}
          preview={photo.preview}
          onPhoto={photo.pick}
          photoError={photo.error}
        />
        <RoomField rooms={rooms} newRoom={false} />
        <PotSoilFields />
        <PlantSpotFields />
        <ScheduleFields />
        <FormError message={update.error ? 'Couldn’t save the plant. Try again.' : null} />
        <DeletePlant plant={plant} />
      </FormScreen>
    </FormProvider>
  )
}

function DeletePlant({ plant }: { plant: Plant }) {
  const navigate = useNavigate()
  const remove = useDeletePlant(plant)
  const [confirming, setConfirming] = useState(false)

  const onDelete = () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    remove.mutate(undefined, {
      onSuccess: () =>
        navigate({ to: '/rooms/$roomId', params: { roomId: plant.room_id }, replace: true }),
    })
  }

  return (
    <FormCard>
      <FormError message={remove.error ? 'Couldn’t delete the plant. Try again.' : null} />
      <Button variant="danger" onClick={onDelete} loading={remove.isPending}>
        {confirming ? 'Tap again to delete' : 'Delete plant'}
      </Button>
    </FormCard>
  )
}
