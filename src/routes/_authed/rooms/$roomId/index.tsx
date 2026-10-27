import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@/components/icons'
import { PlantPhoto } from '@/features/plants/PlantPhoto'
import { roomQuery } from '@/features/rooms/api'
import { lightLabels, windowLabel } from '@/features/rooms/options'
import { plantCount } from '@/features/rooms/format'

export const Route = createFileRoute('/_authed/rooms/$roomId/')({
  loader: async ({ context, params }) => {
    const room = await context.queryClient.ensureQueryData(roomQuery(params.roomId))
    if (!room) throw notFound()
  },
  component: RoomScreen,
  notFoundComponent: RoomNotFound,
})

function RoomScreen() {
  const { roomId } = Route.useParams()
  const { data: room } = useSuspenseQuery(roomQuery(roomId))
  if (!room) return <RoomNotFound />

  const windowText =
    room.window_dir === 'none' ? 'no window' : `${windowLabel(room.window_dir)} window`
  const facts = [
    `${lightLabels[room.light].label} · ${windowText}`,
    `Winter ${room.winter_min}–${room.winter_max} °C`,
    `Summer ${room.summer_min}–${room.summer_max} °C`,
    `Humidity ${room.humidity_min}–${room.humidity_max}%`,
    room.drafts ? 'Drafts' : 'No drafts',
  ]

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-[max(var(--spacing-7),env(safe-area-inset-top))] pb-10">
      <nav className="flex items-center justify-between">
        <Link
          to="/plants"
          className="-ml-1 flex min-h-11 items-center gap-1 text-label font-semibold text-primary-text"
        >
          <ChevronLeftIcon width={20} height={20} />
          My Plants
        </Link>
        <Link
          to="/rooms/$roomId/edit"
          params={{ roomId }}
          className="flex min-h-11 items-center px-1 text-label font-bold text-primary-text"
        >
          Edit
        </Link>
      </nav>

      <header className="flex flex-col gap-1">
        <h1 className="text-title text-ink">{room.name}</h1>
        <p className="text-field-label font-medium text-ink-subtle">
          {plantCount(room.plants.length)}
        </p>
      </header>

      <ul className="flex flex-wrap gap-2" aria-label="Room conditions">
        {facts.map((fact) => (
          <li
            key={fact}
            className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-caption text-ink"
          >
            {fact}
          </li>
        ))}
      </ul>

      {room.plants.length > 0 ? (
        <ul className="flex flex-col rounded-lg border border-border bg-surface px-4 py-1">
          {room.plants.map((plant) => (
            <li key={plant.id} className="border-b border-divider last:border-b-0">
              <Link
                to="/plants/$plantId"
                params={{ plantId: plant.id }}
                className="flex items-center gap-3 py-3"
              >
                <PlantPhoto path={plant.cover_photo} alt="" className="size-13 rounded-md" />
                <span className="flex-1 text-body-strong text-ink">{plant.nickname}</span>
                <ChevronRightIcon width={18} height={18} className="text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-border bg-surface p-5 text-body text-ink-subtle">
          No plants here yet.
        </p>
      )}

      <Link
        to="/new-plant"
        search={{ roomId }}
        className="flex min-h-14 items-center justify-center gap-2 rounded-pill bg-primary px-6 text-body-strong text-on-primary active:bg-primary-hover"
      >
        <PlusIcon width={20} height={20} />
        Add plant to {room.name}
      </Link>
    </main>
  )
}

function RoomNotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-[max(var(--spacing-7),env(safe-area-inset-top))]">
      <h1 className="text-title text-ink">Room not found</h1>
      <p className="text-body text-ink-muted">It may have been deleted.</p>
      <Link to="/plants" className="text-label text-primary-text">
        Back to My Plants
      </Link>
    </main>
  )
}
