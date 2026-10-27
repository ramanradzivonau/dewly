import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { useCreateRoom } from '@/features/rooms/api'
import { roomDefaults } from '@/features/rooms/options'
import { RoomForm } from '@/features/rooms/RoomForm'

export const Route = createFileRoute('/_authed/rooms/new')({
  component: NewRoomScreen,
})

function NewRoomScreen() {
  const navigate = useNavigate()
  const create = useCreateRoom()

  return (
    <RoomForm
      back={{ to: '/plants', label: 'Close', icon: 'close' }}
      title="New room"
      subtitle="Light and climate help tune watering for every plant here."
      submitLabel="Create room"
      defaultValues={roomDefaults}
      saving={create.isPending}
      error={create.error ? 'Couldn’t create the room. Try again.' : null}
      onSubmit={(values) =>
        create.mutate(values, {
          onSuccess: ({ id }) =>
            navigate({ to: '/rooms/$roomId', params: { roomId: id }, replace: true }),
        })
      }
    />
  )
}
