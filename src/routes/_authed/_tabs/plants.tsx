import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'

import { LeafIcon } from '@/components/icons'
import { Screen } from '@/components/Screen'
import { roomsQuery, type RoomWithPlants } from '@/features/rooms/api'
import { plantCount } from '@/features/rooms/format'

export const Route = createFileRoute('/_authed/_tabs/plants')({
  loader: ({ context }) => context.queryClient.ensureQueryData(roomsQuery()),
  component: PlantsScreen,
})

const PREVIEWS = 3

function PlantsScreen() {
  const { data: rooms } = useSuspenseQuery(roomsQuery())
  const plants = rooms.reduce((sum, r) => sum + r.plants.length, 0)
  const subtitle =
    rooms.length === 0
      ? 'Start with a room: its light and climate shape the care.'
      : `${plantCount(plants)} in ${rooms.length === 1 ? '1 room' : `${rooms.length} rooms`}`

  return (
    <Screen title="My Plants" subtitle={subtitle}>
      <ul className="flex flex-col gap-3">
        {rooms.map((room) => (
          <li key={room.id}>
            <RoomCard room={room} />
          </li>
        ))}
      </ul>
      <Link
        to="/rooms/new"
        className="flex min-h-16 items-center justify-center rounded-lg border-2 border-dashed border-border-strong text-label font-bold text-primary-text"
      >
        + Add room
      </Link>
    </Screen>
  )
}

function RoomCard({ room }: { room: RoomWithPlants }) {
  const shown = room.plants.slice(0, PREVIEWS)
  const more = room.plants.length - shown.length

  return (
    <Link
      to="/rooms/$roomId"
      params={{ roomId: room.id }}
      className="flex items-center gap-3.5 rounded-lg border border-border bg-surface p-4"
    >
      <span className="flex flex-1 flex-col gap-1">
        <span className="text-body-strong font-extrabold text-ink">{room.name}</span>
        <span className="text-caption text-ink-subtle">{plantCount(room.plants.length)}</span>
      </span>
      <span className="flex pl-2.5" aria-hidden>
        {shown.map((plant) => (
          <span
            key={plant.id}
            className="-ml-2.5 flex size-11 items-center justify-center rounded-sm border-2 border-surface bg-leaf-tile text-primary-text"
          >
            <LeafIcon width={20} height={20} />
          </span>
        ))}
        {more > 0 && (
          <span className="-ml-2.5 flex size-11 items-center justify-center rounded-sm border-2 border-surface bg-track text-caption font-bold text-ink-muted">
            +{more}
          </span>
        )}
      </span>
    </Link>
  )
}
