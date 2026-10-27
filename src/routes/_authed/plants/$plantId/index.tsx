import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { CameraIcon, ChevronLeftIcon, DropIcon, HomeIcon, PencilIcon } from '@/components/icons'
import { plantQuery, type Plant } from '@/features/plants/api'
import {
  ageLabel,
  drainageOptions,
  nearOptions,
  potTypeOptions,
  REPOT_UNKNOWN,
  soilLabel,
} from '@/features/plants/options'
import { PlantPhoto } from '@/features/plants/PlantPhoto'
import { lightLabels, windowLabel } from '@/features/rooms/options'

export const Route = createFileRoute('/_authed/plants/$plantId/')({
  loader: async ({ context, params }) => {
    const plant = await context.queryClient.ensureQueryData(plantQuery(params.plantId))
    if (!plant) throw notFound()
  },
  component: PlantScreen,
  notFoundComponent: PlantNotFound,
})

const days = (n: number) => (n === 1 ? 'day' : `${n} days`)
const label = <T extends string>(options: { value: T; label: string }[], value: T) =>
  options.find((o) => o.value === value)?.label ?? value
const monthYear = (date: string) =>
  new Date(date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

function PlantScreen() {
  const { plantId } = Route.useParams()
  const { data: plant } = useSuspenseQuery(plantQuery(plantId))
  if (!plant) return <PlantNotFound />

  const round =
    'flex size-11 items-center justify-center rounded-pill border border-border bg-surface text-primary'

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4.5 px-4 pt-[max(var(--spacing-7),env(safe-area-inset-top))] pb-10">
      <nav className="flex items-center justify-between">
        <Link
          to="/rooms/$roomId"
          params={{ roomId: plant.room_id }}
          aria-label={`Back to ${plant.room.name}`}
          className={round}
        >
          <ChevronLeftIcon width={20} height={20} />
        </Link>
        <Link
          to="/plants/$plantId/edit"
          params={{ plantId }}
          aria-label="Edit plant"
          className={round}
        >
          <PencilIcon width={20} height={20} />
        </Link>
      </nav>

      <h1 className="px-1 text-display text-primary">{plant.nickname}</h1>

      <div className="relative">
        <PlantPhoto
          path={plant.cover_photo}
          alt={`Cover photo of ${plant.nickname}`}
          iconSize={96}
          className="h-75 w-full rounded-lg"
        />
        <Link
          to="/rooms/$roomId"
          params={{ roomId: plant.room_id }}
          className="absolute right-3 bottom-3 flex min-h-9 items-center gap-1.5 rounded-pill bg-surface/90 px-3 text-field-label text-primary"
        >
          <HomeIcon width={16} height={16} />
          {plant.room.name}
        </Link>
      </div>

      <Schedule plant={plant} />
      <BasedOn plant={plant} />
    </main>
  )
}

function Schedule({ plant }: { plant: Plant }) {
  const s = plant.schedule
  return (
    <section className="flex flex-col rounded-lg bg-surface px-5 pt-5 pb-2">
      <h2 className="mb-1 text-section text-primary">Schedule</h2>
      {s ? (
        <>
          <Row
            icon={<DropIcon />}
            tone="bg-water text-on-primary"
            title={`Water every ${days(s.water_days_warm)}`}
            sub={[`Every ${days(s.water_days_cold)} in winter`, s.tip].filter(Boolean).join(' · ')}
          />
          <Row
            icon={<CameraIcon />}
            tone="bg-primary-soft text-primary"
            title={`Progress update every ${days(s.progress_days)}`}
          />
        </>
      ) : (
        <p className="pb-3 text-body text-ink-subtle">No schedule yet. Set one in Edit.</p>
      )}
    </section>
  )
}

function Row({
  icon,
  tone,
  title,
  sub,
}: {
  icon: ReactNode
  tone: string
  title: string
  sub?: string
}) {
  return (
    <div className="flex min-h-17 items-center gap-3.5 border-b border-divider py-2 last:border-b-0">
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-pill ${tone}`}>
        {icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-label text-ink">{title}</span>
        {sub && <span className="text-caption text-ink-subtle">{sub}</span>}
      </span>
    </div>
  )
}

function BasedOn({ plant }: { plant: Plant }) {
  const r = plant.room
  const groups: { title: string; items: [string, string][] }[] = [
    {
      title: 'Light',
      items: [
        [lightLabels[r.light].label, 'Room light'],
        [r.window_dir === 'none' ? 'None' : windowLabel(r.window_dir), 'Window'],
        [plant.grow_light_hours ? `${plant.grow_light_hours} h a day` : 'None', 'Grow light'],
      ],
    },
    {
      title: 'Pot',
      items: [
        [label(potTypeOptions, plant.pot_type), 'Pot type'],
        [plant.pot_diameter_cm ? `${plant.pot_diameter_cm} cm` : '—', 'Pot size'],
        [label(drainageOptions, plant.drainage), 'Drainage'],
        [soilLabel(plant.soil), 'Soil'],
        [plant.repotted_on ? monthYear(plant.repotted_on) : REPOT_UNKNOWN.label, 'Last repotted'],
      ],
    },
    {
      title: 'Plant',
      items: [
        [plant.height_cm ? `${plant.height_cm} cm` : '—', 'Height'],
        [plant.born_on ? ageLabel(plant.born_on) : '—', 'Age'],
        [label(nearOptions, plant.near), 'Near'],
      ],
    },
    {
      title: 'Room',
      items: [
        [`${r.humidity_min}–${r.humidity_max}%`, 'Humidity'],
        [`${r.winter_min}–${r.winter_max} °C`, 'Winter temp'],
        [`${r.summer_min}–${r.summer_max} °C`, 'Summer temp'],
        [r.drafts ? 'Yes' : 'No', 'Drafts'],
      ],
    },
  ]

  return (
    <section className="flex flex-col gap-1.5 rounded-lg bg-surface p-5">
      <h2 className="text-section text-primary">Schedule is based on</h2>
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col gap-2.5 pt-2.5 pb-1.5">
          <h3 className="text-label text-ink">{g.title}</h3>
          <dl className="grid grid-cols-2 gap-x-2.5 gap-y-3">
            {g.items.map(([value, name]) => (
              <div key={name} className="flex min-w-0 flex-col">
                <dt className="order-2 text-caption font-medium text-ink-subtle">{name}</dt>
                <dd className="text-field-label text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      <Link
        to="/plants/$plantId/edit"
        params={{ plantId: plant.id }}
        className="mt-3 flex min-h-12 items-center justify-center rounded-pill bg-primary text-body font-bold text-on-primary"
      >
        Change settings
      </Link>
    </section>
  )
}

function PlantNotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-[max(var(--spacing-7),env(safe-area-inset-top))]">
      <h1 className="text-title text-ink">Plant not found</h1>
      <p className="text-body text-ink-muted">It may have been deleted.</p>
      <Link to="/plants" className="text-label text-primary-text">
        Back to My Plants
      </Link>
    </main>
  )
}
