import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { FormCard, FormError } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import { ChoiceGroup } from '@/components/ui/ChoiceGroup'
import {
  roomQuery,
  roomsQuery,
  toFormValues,
  useDeleteRoom,
  useUpdateRoom,
  type RoomWithPlants,
} from '@/features/rooms/api'
import { plantCount } from '@/features/rooms/format'
import { RoomForm } from '@/features/rooms/RoomForm'

export const Route = createFileRoute('/_authed/rooms/$roomId/edit')({
  loader: async ({ context, params }) => {
    const room = await context.queryClient.ensureQueryData(roomQuery(params.roomId))
    if (!room) throw notFound()
  },
  component: EditRoomScreen,
})

function EditRoomScreen() {
  const { roomId } = Route.useParams()
  const navigate = useNavigate()
  const { data: room } = useSuspenseQuery(roomQuery(roomId))
  const update = useUpdateRoom(roomId)
  if (!room) return null

  const count = room.plants.length

  return (
    <RoomForm
      back={{ to: '/rooms/$roomId', params: { roomId }, label: `Back to ${room.name}` }}
      title="Edit room"
      subtitle={
        count > 0
          ? `Changes apply to its ${plantCount(count)}.`
          : 'Light and climate help tune watering for every plant here.'
      }
      submitLabel="Save changes"
      defaultValues={toFormValues(room)}
      saving={update.isPending}
      error={update.error ? 'Couldn’t save the room. Try again.' : null}
      onSubmit={(values) =>
        update.mutate(values, {
          onSuccess: () => navigate({ to: '/rooms/$roomId', params: { roomId }, replace: true }),
        })
      }
    >
      <DeleteRoom room={room} />
    </RoomForm>
  )
}

/** Delete with a second tap to confirm; plants first move to a room the user picks. */
function DeleteRoom({ room }: { room: RoomWithPlants }) {
  const navigate = useNavigate()
  const remove = useDeleteRoom(room.id)
  const count = room.plants.length
  const others = useQuery({ ...roomsQuery(), enabled: count > 0 }).data?.filter(
    (r) => r.id !== room.id,
  )
  const [moveTo, setMoveTo] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const target = moveTo ?? others?.[0]?.id ?? null
  const blocked = count > 0 && !target

  const onDelete = () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    remove.mutate(count > 0 ? target : null, {
      onSuccess: () => navigate({ to: '/plants', replace: true }),
    })
  }

  return (
    <FormCard>
      {count > 0 && others && others.length > 0 && (
        <>
          <h2 className="text-label text-primary">Move its {plantCount(count)} to</h2>
          <ChoiceGroup
            label="Move plants to"
            options={others.map((r) => ({ value: r.id, label: r.name }))}
            value={target ?? ''}
            onChange={setMoveTo}
          />
        </>
      )}
      {blocked && others && (
        <p className="text-caption text-ink-subtle">
          Its {plantCount(count)} need another room first. Create one, then come back.
        </p>
      )}
      <FormError message={remove.error ? 'Couldn’t delete the room. Try again.' : null} />
      <Button
        variant="danger"
        onClick={onDelete}
        disabled={blocked || (count > 0 && !others)}
        loading={remove.isPending}
      >
        {confirming ? 'Tap again to delete' : 'Delete room'}
      </Button>
    </FormCard>
  )
}
