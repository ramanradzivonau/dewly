import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { PlantPhoto } from '@/features/plants/PlantPhoto'

import type { DueTask } from './api'
import {
  addDays,
  monthEnd,
  monthGrid,
  monthTitle,
  occurrences,
  relativeDay,
  shiftMonth,
  shortDate,
  type Occurrence,
} from './dates'

const LIST_DAYS = 14
const tasksWord = (n: number) => (n === 1 ? '1 task' : `${n} tasks`)

/** The next two weeks, one card per day that has tasks. */
export function UpcomingList({ tasks }: { tasks: DueTask[] }) {
  const today = tasks[0]?.today
  if (!today) return <Empty />
  const byDate = occurrences(tasks, addDays(today, 1), addDays(today, LIST_DAYS))
  const days = [...byDate.keys()].sort()
  if (days.length === 0) return <Empty />

  return (
    <>
      {days.map((date) => (
        <DayCard key={date} date={date} today={today} items={byDate.get(date)!} />
      ))}
    </>
  )
}

/** Month grid with task dots; tapping a day lists its tasks under the calendar. */
export function UpcomingCalendar({ tasks }: { tasks: DueTask[] }) {
  const today = tasks[0]?.today ?? new Date().toISOString().slice(0, 10)
  const [month, setMonth] = useState(() => shiftMonth(today, 0))
  const [selected, setSelected] = useState(() => addDays(today, 1))
  const byDate = occurrences(tasks, month, monthEnd(month))
  const items = byDate.get(selected) ?? []

  return (
    <>
      <section className="flex flex-col gap-3 rounded-lg bg-surface px-3.5 pt-5 pb-4">
        <div className="flex items-center justify-between px-1.5">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="flex size-11 items-center justify-center rounded-pill bg-bg text-primary"
          >
            <ChevronLeftIcon width={18} height={18} />
          </button>
          <h2 className="text-section text-primary" aria-live="polite">
            {monthTitle.format(new Date(`${month}T00:00:00Z`))}
          </h2>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="flex size-11 items-center justify-center rounded-pill bg-bg text-primary"
          >
            <ChevronRightIcon width={18} height={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <span key={d} className="py-1 text-center text-nav font-bold text-ink-subtle">
              {d}
            </span>
          ))}
          {monthGrid(month).map((date, i) =>
            date ? (
              <DayCell
                key={date}
                date={date}
                today={today}
                items={byDate.get(date) ?? []}
                selected={date === selected}
                onSelect={() => setSelected(date)}
              />
            ) : (
              <span key={`lead-${i}`} />
            ),
          )}
        </div>

        <ul className="flex flex-wrap justify-center gap-4 pt-1" aria-label="Legend">
          <Legend dot="bg-water">Water</Legend>
          <Legend dot="bg-fert-dot">Fertilizer</Legend>
          <Legend dot="bg-primary-text">Progress</Legend>
          <Legend dot="bg-danger">Late</Legend>
        </ul>
      </section>

      {items.length > 0 ? (
        <DayCard date={selected} today={today} items={items} />
      ) : (
        <p className="rounded-lg bg-surface p-5 text-body text-ink-subtle">
          Nothing on {shortDate(selected)}.
        </p>
      )}
    </>
  )
}

const dotOf = (o: Occurrence) =>
  o.late
    ? 'bg-danger'
    : o.task.type === 'water'
      ? 'bg-water'
      : o.task.type === 'fertilize'
        ? 'bg-fert-dot'
        : 'bg-primary-text'

function DayCell({
  date,
  today,
  items,
  selected,
  onSelect,
}: {
  date: string
  today: string
  items: Occurrence[]
  selected: boolean
  onSelect: () => void
}) {
  const isToday = date === today
  const past = date < today
  const late = items.some((o) => o.late)
  // A fed watering gets a second, fertilizer-colored dot.
  const dots = items
    .flatMap((o) => (o.withFertilizer ? [dotOf(o), 'bg-fert-dot'] : [dotOf(o)]))
    .slice(0, 4)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${shortDate(date)}${items.length ? `, ${tasksWord(items.length)}` : ''}${late ? ', late' : ''}`}
      className={`flex h-13 flex-col items-center justify-center gap-1 rounded-sm border-2 ${
        selected ? 'border-primary' : 'border-transparent'
      } ${late ? 'bg-danger-soft' : ''}`}
    >
      <span
        className={`flex h-5.5 w-7 items-center justify-center rounded-pill text-field-label ${
          isToday
            ? 'bg-primary font-extrabold text-on-primary'
            : late
              ? 'text-danger-strong'
              : past
                ? 'font-medium text-ink-subtle'
                : 'text-ink'
        } ${selected && !isToday ? 'font-extrabold' : ''}`}
      >
        {Number(date.slice(8))}
      </span>
      <span className="flex h-1.5 gap-0.75" aria-hidden>
        {dots.map((dot, i) => (
          <span key={i} className={`size-1.5 rounded-pill ${dot}`} />
        ))}
      </span>
    </button>
  )
}

function Legend({ dot, children }: { dot: string; children: string }) {
  return (
    <li className="flex items-center gap-1.5 text-nav font-semibold text-ink-muted">
      <span className={`size-2 rounded-pill ${dot}`} aria-hidden />
      {children}
    </li>
  )
}

function DayCard({ date, today, items }: { date: string; today: string; items: Occurrence[] }) {
  return (
    <section className="flex flex-col gap-1 rounded-lg bg-surface px-5 pt-5.5 pb-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-section text-primary">{relativeDay(date, today)}</h2>
          <span className="text-caption text-ink-subtle">{shortDate(date)}</span>
        </div>
        <span className="rounded-pill bg-primary-soft px-3 py-1 text-caption font-bold text-primary">
          {tasksWord(items.length)}
        </span>
      </div>
      <ul>
        {items.map((o) => (
          <li key={`${o.task.plant_id}-${o.task.type}`}>
            <Row occurrence={o} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Row({ occurrence: o }: { occurrence: Occurrence }) {
  const tags: { label: string; tone: string }[] = [
    o.task.type === 'water'
      ? { label: 'Water', tone: 'bg-water text-on-primary' }
      : o.task.type === 'fertilize'
        ? { label: 'Fertilize', tone: 'bg-fert-soft text-fert' }
        : { label: 'Progress', tone: 'bg-primary-soft text-primary' },
  ]
  if (o.withFertilizer) tags.push({ label: '+ fertilizer', tone: 'bg-fert-soft text-fert' })
  if (o.late) tags.push({ label: 'Late', tone: 'bg-danger-soft text-danger-strong' })

  return (
    <Link
      to="/plants/$plantId"
      params={{ plantId: o.task.plant_id }}
      className="flex items-center gap-3.5 py-2.5"
    >
      <PlantPhoto path={o.task.cover_photo} alt="" className="size-15 rounded-pill" iconSize={26} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-body-strong text-ink">{o.task.nickname}</span>
        <span className="truncate text-field-label font-medium text-ink-subtle">
          {o.task.room_name}
        </span>
        <span className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t.label} className={`rounded-sm px-2.5 py-1 text-nav font-bold ${t.tone}`}>
              {t.label}
            </span>
          ))}
        </span>
      </span>
    </Link>
  )
}

function Empty() {
  return (
    <p className="rounded-lg bg-surface p-5 text-body text-ink-subtle">
      Nothing planned for the next two weeks.
    </p>
  )
}
