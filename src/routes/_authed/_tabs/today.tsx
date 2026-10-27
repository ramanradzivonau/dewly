import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'

import { DewlyLogo } from '@/components/DewlyLogo'
import { CheckIcon } from '@/components/icons'
import {
  isToday,
  lateBadge,
  tasksQuery,
  useUndo,
  useWater,
  type DueTask,
} from '@/features/care/api'
import { PlantPhoto } from '@/features/plants/PlantPhoto'

export const Route = createFileRoute('/_authed/_tabs/today')({
  loader: ({ context }) => context.queryClient.ensureQueryData(tasksQuery()),
  component: TodayScreen,
})

const greeting = () => {
  const h = new Date().getHours()
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const plantsWord = (n: number) => (n === 1 ? '1 plant' : `${n} plants`)

function TodayScreen() {
  const { data: tasks } = useSuspenseQuery(tasksQuery())
  // Progress tasks join Today with the progress form (phase 5).
  const water = tasks
    .filter((t) => t.type === 'water' && isToday(t))
    // Open tasks first, most overdue on top; done ones sink to the bottom.
    .sort(
      (a, b) =>
        Number(!!a.done_today_event_id) - Number(!!b.done_today_event_id) ||
        b.overdue_days - a.overdue_days,
    )
  const open = water.filter((t) => !t.done_today_event_id)
  const late = open.filter((t) => t.overdue_days > 0).length

  const summary =
    tasks.length === 0
      ? 'Add your plants and their watering shows up here.'
      : open.length === 0
        ? 'Nothing left to water today.'
        : `${plantsWord(open.length)} ${open.length === 1 ? 'needs' : 'need'} water today${late ? `, ${late} ${late === 1 ? 'is' : 'are'} late` : ''}.`

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5.5 px-4 pt-[max(var(--spacing-7),env(safe-area-inset-top))] pb-40">
      <header className="flex flex-col gap-1.5 px-1">
        <div className="mb-3.5">
          <DewlyLogo size="sm" />
        </div>
        <h1 className="text-display text-primary">{greeting()}</h1>
        <p className="text-body text-ink-muted">{summary}</p>
      </header>

      {open.length > 0 && (
        <div className="flex gap-2.5 overflow-x-auto px-1">
          <Chip tone="bg-primary-soft text-primary" dot="bg-primary-text">
            {open.length === 1 ? '1 task today' : `${open.length} tasks today`}
          </Chip>
          {late > 0 && (
            <Chip tone="bg-danger-soft text-danger-strong" dot="bg-danger">
              {late === 1 ? '1 is late' : `${late} are late`}
            </Chip>
          )}
        </div>
      )}

      {water.length > 0 ? (
        <section className="flex flex-col gap-1.5 rounded-lg bg-surface px-5 pt-5.5 pb-4.5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-section text-primary">Water</h2>
            <span className="rounded-pill bg-primary-soft px-3 py-1 text-caption font-bold text-primary">
              {plantsWord(water.length)}
            </span>
          </div>
          <ul className="flex flex-col">
            {water.map((task) => (
              <li key={task.plant_id}>
                <WaterRow task={task} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-center text-caption font-medium text-ink-subtle">
            Tap a plant for instructions
          </p>
        </section>
      ) : (
        tasks.length > 0 && (
          <p className="rounded-lg bg-surface p-5 text-body text-ink-subtle">
            All watered. Enjoy the day.
          </p>
        )
      )}
    </main>
  )
}

function Chip({ tone, dot, children }: { tone: string; dot: string; children: string }) {
  return (
    <span
      className={`flex shrink-0 items-center gap-2.5 rounded-md px-4 py-3.5 text-body font-extrabold ${tone}`}
    >
      <span className={`size-2.5 rounded-pill ${dot}`} aria-hidden />
      {children}
    </span>
  )
}

function WaterRow({ task }: { task: DueTask }) {
  const water = useWater()
  const undo = useUndo()
  const done = !!task.done_today_event_id
  // Show the tap right away; the list catches up when the request finishes.
  const checked = water.isPending ? true : undo.isPending ? false : done

  const toggle = () => {
    if (water.isPending || undo.isPending) return
    if (task.done_today_event_id) undo.mutate(task.done_today_event_id)
    else water.mutate({ plantId: task.plant_id })
  }

  return (
    <div className="flex items-center gap-3.5 py-2.5">
      <span className="relative shrink-0">
        <PlantPhoto path={task.cover_photo} alt="" className="size-15 rounded-pill" iconSize={26} />
        {!done && task.overdue_days > 0 && (
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-sm border-2 border-surface bg-danger-soft px-1.5 text-nav font-extrabold whitespace-nowrap text-danger-strong">
            {lateBadge(task.overdue_days)}
          </span>
        )}
      </span>
      <Link
        to="/water/$plantId"
        params={{ plantId: task.plant_id }}
        className="flex min-w-0 flex-1 flex-col gap-0.5"
      >
        <span
          className={`truncate text-body-strong ${checked ? 'text-ink-subtle line-through' : 'text-ink'}`}
        >
          {task.nickname}
        </span>
        <span className="truncate text-field-label font-medium text-ink-subtle">
          {task.room_name}
        </span>
      </Link>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={checked}
        aria-label={
          checked ? `${task.nickname} watered, tap to undo` : `Mark ${task.nickname} watered`
        }
        className={`flex size-11 shrink-0 items-center justify-center rounded-pill border-2 transition-colors ${
          checked
            ? 'border-primary bg-primary text-on-primary'
            : 'border-primary-text bg-surface text-border-strong'
        }`}
      >
        <CheckIcon width={20} height={20} />
      </button>
    </div>
  )
}
