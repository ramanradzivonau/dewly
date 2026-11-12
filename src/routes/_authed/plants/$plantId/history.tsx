import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { ChevronLeftIcon, ClockIcon, DropIcon, FlaskIcon } from '@/components/icons'
import { careEventsQuery, type CareEvent } from '@/features/care/api'
import { plantQuery } from '@/features/plants/api'

export const Route = createFileRoute('/_authed/plants/$plantId/history')({
  loader: async ({ context, params }) => {
    const [plant] = await Promise.all([
      context.queryClient.ensureQueryData(plantQuery(params.plantId)),
      context.queryClient.ensureQueryData(careEventsQuery(params.plantId)),
    ])
    if (!plant) throw notFound()
  },
  component: HistoryScreen,
})

const SUMMARY_DAYS = 60
const DAY_MS = 86_400_000

const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const monthOnly = new Intl.DateTimeFormat('en-GB', { month: 'long' })

const isFeeding = (e: CareEvent) =>
  e.type === 'fertilize' || (e.type === 'water' && e.with_fertilizer)

/** Average days between waterings in the last two months; null with fewer than two. */
function averageInterval(events: CareEvent[]) {
  const since = Date.now() - SUMMARY_DAYS * DAY_MS
  const times = events
    .filter((e) => e.type === 'water' && new Date(e.at).getTime() >= since)
    .map((e) => new Date(e.at).getTime())
  if (times.length < 2) return null
  return Math.round((Math.max(...times) - Math.min(...times)) / DAY_MS / (times.length - 1))
}

/** Care log: a summary, then waterings, feedings and postponements by month. */
function HistoryScreen() {
  const { plantId } = Route.useParams()
  const { data: plant } = useSuspenseQuery(plantQuery(plantId))
  const { data: events } = useSuspenseQuery(careEventsQuery(plantId))
  if (!plant) return null

  // Progress entries get their own tab in phase 5.
  const care = events.filter((e) => e.type !== 'progress')
  const interval = averageInterval(care)
  const feedings = care.filter(isFeeding)
  const firstFeeding = feedings.at(-1)

  const months = new Map<string, CareEvent[]>()
  for (const e of care) {
    const key = monthName.format(new Date(e.at))
    months.set(key, [...(months.get(key) ?? []), e])
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4.5 px-4 pt-screen pb-10">
      <Link
        to="/plants/$plantId"
        params={{ plantId }}
        aria-label={`Back to ${plant.nickname}`}
        className="flex size-11 items-center justify-center self-start rounded-pill border border-border bg-surface text-primary"
      >
        <ChevronLeftIcon width={20} height={20} />
      </Link>

      <header className="flex flex-col gap-1 px-1">
        <h1 className="text-title text-primary">Care history</h1>
        <p className="text-body text-ink-muted">
          {plant.nickname} · {plant.room.name}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5">
        <Stat
          label="Watered every"
          value={interval ? `~${interval} ${interval === 1 ? 'day' : 'days'}` : '—'}
          note={interval ? 'over the last 2 months' : 'needs two waterings'}
          tone="text-primary"
        />
        <Stat
          label="Fertilized"
          value={feedings.length === 1 ? 'once' : `${feedings.length} times`}
          note={firstFeeding ? `since ${monthOnly.format(new Date(firstFeeding.at))}` : 'not yet'}
          tone="text-fert"
        />
      </div>

      {care.length === 0 ? (
        <p className="rounded-lg bg-surface p-5 text-body text-ink-subtle">
          Nothing logged yet. Waterings from Today show up here.
        </p>
      ) : (
        [...months].map(([month, list]) => (
          <section key={month} className="flex flex-col rounded-lg bg-surface px-4.5 pt-5 pb-2">
            <h2 className="mb-1.5 text-section text-primary">{month}</h2>
            <ul>
              {list.map((e) => (
                <li key={e.id} className="border-b border-divider last:border-b-0">
                  <EventRow event={e} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  )
}

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: string
  note: string
  tone: string
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-surface px-4 py-3.5">
      <span className="text-nav font-extrabold tracking-[0.5px] text-ink-subtle uppercase">
        {label}
      </span>
      <span className={`text-section ${tone}`}>{value}</span>
      <span className="text-nav font-medium text-ink-subtle">{note}</span>
    </div>
  )
}

const soilLabel = { dry_top: 'Dry on top', very_dry: 'Very dry' } as const

function EventRow({ event: e }: { event: CareEvent }) {
  const row: { icon: ReactNode; tone: string; title: string; sub: string } =
    e.type === 'water'
      ? {
          icon: <DropIcon width={20} height={20} />,
          tone: 'bg-water text-on-primary',
          title: 'Watered',
          sub: e.soil_state ? soilLabel[e.soil_state] : '',
        }
      : e.type === 'fertilize'
        ? {
            icon: <FlaskIcon width={20} height={20} />,
            tone: 'bg-fert-soft text-fert',
            title: 'Fertilized',
            sub: '',
          }
        : {
            icon: <ClockIcon width={20} height={20} />,
            tone: 'bg-primary-soft text-primary',
            title: 'Postponed',
            sub: `Soil still wet · +${e.postpone_days === 1 ? '1 day' : `${e.postpone_days} days`}`,
          }

  return (
    <div className="flex min-h-16 items-center gap-3.5 py-2">
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-pill ${row.tone}`}
      >
        {row.icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-label font-bold text-ink">{row.title}</span>
        {(row.sub || e.with_fertilizer) && (
          <span className="flex flex-wrap items-center gap-1.5">
            {row.sub && <span className="text-caption font-medium text-ink-subtle">{row.sub}</span>}
            {e.with_fertilizer && (
              <span className="rounded-sm bg-fert-soft px-2 py-0.5 text-nav font-bold text-fert">
                + fertilizer
              </span>
            )}
          </span>
        )}
      </span>
      <span className="text-caption font-bold text-ink-subtle">
        {dayMonth.format(new Date(e.at))}
      </span>
    </div>
  )
}
