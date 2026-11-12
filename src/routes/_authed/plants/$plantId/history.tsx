import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { z } from 'zod'

import { ChevronLeftIcon, ClockIcon, DropIcon, FlaskIcon, PlusIcon } from '@/components/icons'
import { careEventsQuery, type CareEvent } from '@/features/care/api'
import { plantQuery } from '@/features/plants/api'
import { PlantPhoto } from '@/features/plants/PlantPhoto'
import {
  healthLabels,
  healthTone,
  isProblem,
  progressQuery,
  tagLabel,
} from '@/features/progress/api'

export const Route = createFileRoute('/_authed/plants/$plantId/history')({
  validateSearch: z.object({
    tab: z.enum(['care', 'progress']).catch('care').default('care'),
  }),
  loader: async ({ context, params }) => {
    const [plant] = await Promise.all([
      context.queryClient.ensureQueryData(plantQuery(params.plantId)),
      context.queryClient.ensureQueryData(careEventsQuery(params.plantId)),
      context.queryClient.ensureQueryData(progressQuery(params.plantId)),
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

/** History: the care log, or the feed of progress updates. */
function HistoryScreen() {
  const { plantId } = Route.useParams()
  const { tab } = Route.useSearch()
  const { data: plant } = useSuspenseQuery(plantQuery(plantId))
  if (!plant) return null

  const tabClass = (on: boolean) =>
    `flex min-h-11 items-center rounded-pill px-6 text-label ${
      on ? 'bg-primary font-bold text-on-primary' : 'font-semibold text-ink-muted'
    }`

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4.5 px-4 pt-screen pb-28">
      <Link
        to="/plants/$plantId"
        params={{ plantId }}
        aria-label={`Back to ${plant.nickname}`}
        className="flex size-11 items-center justify-center self-start rounded-pill border border-border bg-surface text-primary"
      >
        <ChevronLeftIcon width={20} height={20} />
      </Link>

      <header className="flex flex-col gap-1 px-1">
        <h1 className="text-title text-primary">History</h1>
        <p className="text-body text-ink-muted">
          {plant.nickname} · {plant.room.name}
        </p>
      </header>

      <div
        role="tablist"
        aria-label="History"
        className="flex self-center rounded-pill bg-track p-1"
      >
        <Link
          to="/plants/$plantId/history"
          params={{ plantId }}
          search={{ tab: 'care' }}
          replace
          role="tab"
          aria-selected={tab === 'care'}
          className={tabClass(tab === 'care')}
        >
          Care
        </Link>
        <Link
          to="/plants/$plantId/history"
          params={{ plantId }}
          search={{ tab: 'progress' }}
          replace
          role="tab"
          aria-selected={tab === 'progress'}
          className={tabClass(tab === 'progress')}
        >
          Progress
        </Link>
      </div>

      {tab === 'progress' ? <ProgressFeed plantId={plantId} /> : <CareLog plantId={plantId} />}
    </main>
  )
}

/** Care log: a summary, then waterings, feedings and postponements by month. */
function CareLog({ plantId }: { plantId: string }) {
  const { data: events } = useSuspenseQuery(careEventsQuery(plantId))

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
    <>
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
    </>
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

/** Progress updates, newest first, with growth against the previous update. */
function ProgressFeed({ plantId }: { plantId: string }) {
  const { data: entries } = useSuspenseQuery(progressQuery(plantId))

  return (
    <>
      {entries.length === 0 ? (
        <p className="rounded-lg bg-surface p-5 text-body text-ink-subtle">
          No updates yet. Add a photo and how the plant is doing.
        </p>
      ) : (
        entries.map((entry, i) => {
          // The next older update with a height, for "+4".
          const before = entries.slice(i + 1).find((e) => e.height_cm != null)
          const growth =
            entry.height_cm != null && before?.height_cm != null
              ? entry.height_cm - before.height_cm
              : null
          return (
            <article key={entry.id} className="flex flex-col overflow-hidden rounded-lg bg-surface">
              <div className="relative">
                <PlantPhoto
                  path={entry.photo_path}
                  alt={entry.photo_path ? `Photo from ${dayMonth.format(new Date(entry.at))}` : ''}
                  iconSize={56}
                  className={entry.photo_path ? 'aspect-[16/10] w-full' : 'h-24 w-full'}
                />
                <span className="absolute top-3 left-3 rounded-sm bg-surface px-2.5 py-1 text-caption font-extrabold text-primary">
                  {dayMonth.format(new Date(entry.at))}
                </span>
              </div>
              <div className="flex flex-col gap-2.5 px-4.5 pt-4 pb-4.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-sm px-2.5 py-1 text-caption font-extrabold ${healthTone[entry.health]}`}
                  >
                    {healthLabels[entry.health]}
                  </span>
                  {entry.height_cm != null && (
                    <span className="text-body font-extrabold text-ink">
                      {entry.height_cm} cm{' '}
                      {growth ? (
                        <span className="text-caption font-bold text-primary-text">
                          {growth > 0 ? `+${growth}` : growth}
                        </span>
                      ) : null}
                    </span>
                  )}
                </div>
                {entry.tags.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {entry.tags.map((t) => (
                      <li
                        key={t}
                        className={`rounded-sm px-2.5 py-1 text-nav font-bold ${
                          isProblem(t)
                            ? 'bg-danger-soft text-danger-strong'
                            : 'bg-primary-soft text-primary'
                        }`}
                      >
                        {tagLabel(t)}
                      </li>
                    ))}
                  </ul>
                )}
                {entry.note && (
                  <p className="text-field-label font-medium text-ink-muted">{entry.note}</p>
                )}
              </div>
            </article>
          )
        })
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 mx-auto flex max-w-md justify-end px-5 pb-[max(36px,env(safe-area-inset-bottom))]">
        <Link
          to="/plants/$plantId/progress"
          params={{ plantId }}
          aria-label="Add progress update"
          className="pointer-events-auto flex size-15 items-center justify-center rounded-pill bg-primary text-on-primary shadow-float"
        >
          <PlusIcon width={26} height={26} />
        </Link>
      </div>
    </>
  )
}
