import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import {
  CameraIcon,
  ChevronLeftIcon,
  DropIcon,
  FlaskIcon,
  HomeIcon,
  PencilIcon,
  SparkleIcon,
} from '@/components/icons'
import { formatDose } from '@/features/fertilizers/api'
import { plantQuery, type Plant } from '@/features/plants/api'
import {
  ageLabel,
  drainageOptions,
  monthsLabel,
  type FertMode,
  nearOptions,
  potTypeOptions,
  REPOT_UNKNOWN,
  soilLabel,
} from '@/features/plants/options'
import { PlantPhoto } from '@/features/plants/PlantPhoto'
import { careInfoSchema, useRecommend } from '@/features/recommend/api'
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
const ordinal = (n: number) => (n === 1 ? '' : `${n}${n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} `)
const fertEvery = (mode: FertMode, n: number) =>
  mode === 'every_n_waterings'
    ? `every ${ordinal(n)}watering`
    : `every ${n === 1 ? 'week' : `${n} weeks`}`
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
    <main className="mx-auto flex max-w-md flex-col gap-4.5 px-4 pt-screen pb-10">
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

      <header className="flex flex-col gap-0.5 px-1">
        <h1 className="text-display text-primary">{plant.nickname}</h1>
        {plant.species && (
          <p className="text-label font-medium text-ink-subtle">
            <i>{plant.species.scientific_name}</i>
            {plant.species.common_name ? ` · ${plant.species.common_name}` : null}
          </p>
        )}
      </header>

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

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/plants/$plantId/progress"
          params={{ plantId }}
          className="flex min-h-12 items-center justify-center gap-2 rounded-pill bg-primary text-label font-bold text-on-primary"
        >
          <CameraIcon width={20} height={20} />
          Update progress
        </Link>
        <Link
          to="/plants/$plantId/history"
          params={{ plantId }}
          className="flex min-h-12 items-center justify-center rounded-pill bg-track text-label font-bold text-primary"
        >
          History
        </Link>
      </div>

      <Schedule plant={plant} />
      <CareInfo plant={plant} />
      <BasedOn plant={plant} />
    </main>
  )
}

function Schedule({ plant }: { plant: Plant }) {
  const s = plant.schedule
  return (
    <section className="flex flex-col rounded-lg bg-surface px-5 pt-5 pb-2">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-section text-primary">Schedule</h2>
        {s && (
          <span
            className={`rounded-sm px-2.5 py-1 text-caption font-extrabold ${
              s.source === 'ai' ? 'bg-primary-soft text-primary' : 'bg-track text-ink-muted'
            }`}
          >
            {s.source === 'ai' ? 'AI recommendation' : 'Custom'}
          </span>
        )}
      </div>
      {s ? (
        <>
          <Row
            icon={<DropIcon />}
            tone="bg-water text-on-primary"
            title={`Water every ${days(s.water_days_warm)}`}
            sub={[`Every ${days(s.water_days_cold)} in winter`, s.tip].filter(Boolean).join(' · ')}
          />
          {s.fertilizer && s.fert_mode && s.fert_n && (
            <Row
              icon={<FlaskIcon />}
              tone="bg-fert-soft text-fert"
              title={`${s.fertilizer.name}: ${fertEvery(s.fert_mode, s.fert_n)}`}
              sub={`${monthsLabel(s.fert_months)} · ${formatDose(s.fert_dose ?? s.fertilizer.dose, s.fertilizer.type)}`}
            />
          )}
          <Row
            icon={<CameraIcon />}
            tone="bg-primary-soft text-primary"
            title={`Progress update every ${days(s.progress_days)}`}
          />
        </>
      ) : (
        <p className="pb-3 text-body text-ink-subtle">No schedule yet. Set one in Edit.</p>
      )}
      <AiActions plant={plant} />
    </section>
  )
}

/** Why the AI chose these numbers, and the button to ask again. A custom schedule offers to go back. */
function AiActions({ plant }: { plant: Plant }) {
  const recommend = useRecommend(plant.id)
  const custom = plant.schedule?.source !== 'ai'
  const explanation = plant.schedule?.source === 'ai' ? plant.schedule.explanation : null

  return (
    <div className="flex flex-col gap-2.5 border-t border-divider pt-3.5 pb-3">
      {explanation && (
        <p className="flex gap-2 text-field-label font-medium text-ink-muted">
          <SparkleIcon width={18} height={18} className="mt-0.5 shrink-0 text-primary" />
          {explanation}
        </p>
      )}
      {plant.schedule?.tuning_note && (
        <p className="text-caption font-medium text-ink-subtle">{plant.schedule.tuning_note}</p>
      )}
      {custom && (
        <p className="text-caption font-medium text-ink-subtle">
          You set this schedule by hand, so recalculation leaves it alone.
        </p>
      )}
      {recommend.isError && (
        <p role="alert" className="text-caption text-danger">
          Couldn’t get a recommendation. Try again later.
        </p>
      )}
      <button
        type="button"
        disabled={recommend.isPending}
        onClick={() => recommend.mutate(custom)}
        className="flex min-h-12 items-center justify-center gap-2 rounded-pill border-[1.5px] border-primary text-body font-bold text-primary disabled:opacity-60"
      >
        <SparkleIcon width={18} height={18} />
        {recommend.isPending
          ? recommend.failureCount > 0
            ? 'Gemini is busy, trying again…'
            : 'Asking…'
          : custom
            ? 'Use AI recommendation'
            : 'Recalculate'}
      </button>
    </div>
  )
}

const toxicityText = { toxic: 'Toxic', non_toxic: 'Safe', unknown: 'Unknown' } as const
const growthText = { slow: 'Slow', medium: 'Medium', fast: 'Fast' } as const

/** Species care info and pet toxicity from Gemini, marked as AI-generated. */
function CareInfo({ plant }: { plant: Plant }) {
  const parsed = careInfoSchema.safeParse(plant.species?.care_info)
  if (!parsed.success) return null
  const info = parsed.data
  const toxic = info.toxicity.cats === 'toxic' || info.toxicity.dogs === 'toxic'
  const rows: [string, string][] = [
    ['Light', info.light],
    ['Watering', info.watering],
    ['Soil', info.soil],
    ['Humidity', info.humidity],
    ['Temperature', info.temperature],
    [
      'Growth',
      `${growthText[info.growth_rate]} · pot ${info.pot_diameter_cm.min}–${info.pot_diameter_cm.max} cm`,
    ],
  ]

  return (
    <section className="flex flex-col gap-3 rounded-lg bg-surface p-5">
      <h2 className="text-section text-primary">Care info</h2>
      <p
        className={`flex flex-col gap-0.5 rounded-md px-4 py-3 text-field-label ${
          toxic ? 'bg-danger-soft text-danger-strong' : 'bg-primary-soft text-primary'
        }`}
      >
        <span className="font-extrabold">
          Cats: {toxicityText[info.toxicity.cats]} · Dogs: {toxicityText[info.toxicity.dogs]}
        </span>
        {info.toxicity.note && <span className="font-medium">{info.toxicity.note}</span>}
      </p>
      <dl className="flex flex-col gap-2.5">
        {rows.map(([name, value]) => (
          <div key={name} className="flex flex-col gap-0.5">
            <dt className="text-caption font-extrabold text-ink">{name}</dt>
            <dd className="text-field-label font-medium text-ink-muted">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-nav font-medium text-ink-subtle">AI-generated, verify if unsure.</p>
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
    <main className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-screen">
      <h1 className="text-title text-ink">Plant not found</h1>
      <p className="text-body text-ink-muted">It may have been deleted.</p>
      <Link to="/plants" className="text-label text-primary-text">
        Back to My Plants
      </Link>
    </main>
  )
}
