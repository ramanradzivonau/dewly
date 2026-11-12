import type { DueTask } from './api'

/** Dates are YYYY-MM-DD strings; arithmetic runs in UTC so DST never shifts a day. */
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`)
const toIso = (d: Date) => d.toISOString().slice(0, 10)

export const addDays = (iso: string, days: number) => {
  const d = toDate(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return toIso(d)
}

export const daysBetween = (from: string, to: string) =>
  Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000)

export type Occurrence = {
  date: string
  task: DueTask
  /** Before today: an overdue task still waiting. */
  late: boolean
  /** Only the next watering knows whether it carries fertilizer. */
  withFertilizer: boolean
}

/**
 * Tasks on each day from `from` to `to` (inclusive). due_tasks has only the next date per
 * plant; watering and progress repeat on their interval after it. Fertilize rows show once.
 * Overdue tasks sit on their due date, marked late.
 */
export function occurrences(tasks: DueTask[], from: string, to: string) {
  const byDate = new Map<string, Occurrence[]>()
  const add = (o: Occurrence) => byDate.set(o.date, [...(byDate.get(o.date) ?? []), o])

  for (const task of tasks) {
    // Done today: the next one is due_on (in the future), which the loop below covers.
    const step = task.type === 'fertilize' ? null : task.interval_days
    let date = task.due_on
    let first = true
    while (date <= to) {
      if (date >= from) {
        add({
          date,
          task,
          late: date < task.today,
          withFertilizer: first && task.with_fertilizer,
        })
      }
      if (!step) break
      // An overdue task repeats from today, not from its old due date.
      date = date < task.today ? addDays(task.today, step) : addDays(date, step)
      first = false
    }
  }
  return byDate
}

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' })
const dayMonth = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
export const monthTitle = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "Wed, 28 Oct". */
export const shortDate = (iso: string) =>
  `${weekday.format(toDate(iso))}, ${dayMonth.format(toDate(iso))}`

/** "Today", "Tomorrow", "In 4 days", "2 days ago". */
export const relativeDay = (iso: string, today: string) => {
  const n = daysBetween(today, iso)
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  return n > 0 ? `In ${n} days` : `${-n} days ago`
}

/** Monday-first grid for the month of `iso`: leading nulls, then every date. */
export function monthGrid(iso: string) {
  const first = toDate(`${iso.slice(0, 7)}-01`)
  const lead = (first.getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => toIso(new Date(first.getTime() + i * 86_400_000))),
  ]
}

/** First day of the month `delta` months from `iso`'s. */
export const shiftMonth = (iso: string, delta: number) => {
  const d = toDate(`${iso.slice(0, 7)}-01`)
  d.setUTCMonth(d.getUTCMonth() + delta)
  return toIso(d)
}

export const monthEnd = (iso: string) => addDays(shiftMonth(iso, 1), -1)
