import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { useCreateRoom } from '@/features/rooms/api'
import { roomDefaults } from '@/features/rooms/options'
import { RoomForm } from '@/features/rooms/RoomForm'

export const Route = createFileRoute('/_authed/rooms/new')({
  // `next=new-plant`: opened from Add plant, so go back there with the new room picked.
  validateSearch: z.object({ next: z.literal('new-plant').optional().catch(undefined) }),
  component: NewRoomScreen,
})

function NewRoomScreen() {
  const { next } = Route.useSearch()
  const navigate = useNavigate()
  const create = useCreateRoom()

  return (
    <RoomForm
      back={
        next
          ? { to: '/new-plant', label: 'Back to Add plant', icon: 'close' }
          : { to: '/plants', label: 'Close', icon: 'close' }
      }
      title="New room"
      subtitle="Light and climate help tune watering for every plant here."
      submitLabel="Create room"
      defaultValues={roomDefaults}
      saving={create.isPending}
      error={create.error ? 'Couldn’t create the room. Try again.' : null}
      onSubmit={(values) =>
        create.mutate(values, {
          onSuccess: ({ id }) =>
            next
              ? navigate({ to: '/new-plant', search: { roomId: id }, replace: true })
              : navigate({ to: '/rooms/$roomId', params: { roomId: id }, replace: true }),
        })
      }
    />
  )
}
