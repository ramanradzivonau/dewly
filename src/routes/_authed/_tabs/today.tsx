import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'

import { DewlyLogo } from '@/components/DewlyLogo'
import { CheckIcon } from '@/components/icons'
import {
  isToday,
  lateBadge,
  tasksQuery,
  useFertilize,
  useUndo,
  useWater,
  type DueTask,
} from '@/features/care/api'
import { formatDose, shortDose } from '@/features/fertilizers/api'
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

/** Open tasks first, most overdue on top; done ones sink to the bottom. */
const byUrgency = (a: DueTask, b: DueTask) =>
  Number(!!a.done_today_event_id) - Number(!!b.done_today_event_id) ||
  b.overdue_days - a.overdue_days

function TodayScreen() {
  const { data: tasks } = useSuspenseQuery(tasksQuery())
  // Progress tasks join Today with the progress form (phase 5).
  const today = tasks.filter(isToday).sort(byUrgency)
  const water = today.filter((t) => t.type === 'water')
  const fertilize = today.filter((t) => t.type === 'fertilize')
  const open = [...water, ...fertilize].filter((t) => !t.done_today_event_id)
  const late = open.filter((t) => t.overdue_days > 0).length
  const fed = open.filter((t) => t.type === 'fertilize' || t.with_fertilizer).length
  const thirsty = water.filter((t) => !t.done_today_event_id).length

  const summary =
    tasks.length === 0
      ? 'Add your plants and their watering shows up here.'
      : open.length === 0
        ? 'All done for today.'
        : thirsty > 0
          ? `${plantsWord(thirsty)} ${thirsty === 1 ? 'needs' : 'need'} water today${late ? `, ${late} ${late === 1 ? 'is' : 'are'} late` : ''}.`
          : `${plantsWord(open.length)} ${open.length === 1 ? 'needs' : 'need'} fertilizer today.`

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
        <div className="-mx-4 scrollbar-none flex gap-2.5 overflow-x-auto px-5">
          <Chip tone="bg-primary-soft text-primary" dot="bg-primary-text">
            {open.length === 1 ? '1 task today' : `${open.length} tasks today`}
          </Chip>
          {late > 0 && (
            <Chip tone="bg-danger-soft text-danger-strong" dot="bg-danger">
              {late === 1 ? '1 is late' : `${late} are late`}
            </Chip>
          )}
          {fed > 0 && (
            <Chip tone="bg-fert-soft text-fert" dot="bg-fert">
              {`${fed} with fertilizer`}
            </Chip>
          )}
        </div>
      )}

      {water.length > 0 && (
        <TaskGroup title="Water" tasks={water} hint="Tap a plant for instructions" />
      )}
      {fertilize.length > 0 && (
        <TaskGroup title="Fertilize" tasks={fertilize} hint="Granules and sticks, by the dose" />
      )}
      {today.length === 0 && tasks.length > 0 && (
        <p className="rounded-lg bg-surface p-5 text-body text-ink-subtle">
          All watered. Enjoy the day.
        </p>
      )}
    </main>
  )
}

function TaskGroup({ title, tasks, hint }: { title: string; tasks: DueTask[]; hint: string }) {
  return (
    <section className="flex flex-col gap-1.5 rounded-lg bg-surface px-5 pt-5.5 pb-4.5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-section text-primary">{title}</h2>
        <span className="rounded-pill bg-primary-soft px-3 py-1 text-caption font-bold text-primary">
          {plantsWord(tasks.length)}
        </span>
      </div>
      <ul className="flex flex-col">
        {tasks.map((task) => (
          <li key={task.plant_id}>
            <TaskRow task={task} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-center text-caption font-medium text-ink-subtle">{hint}</p>
    </section>
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

function TaskRow({ task }: { task: DueTask }) {
  const water = useWater()
  const fertilize = useFertilize()
  const undo = useUndo()
  const isWater = task.type === 'water'
  const doing = water.isPending || fertilize.isPending
  const done = !!task.done_today_event_id
  // Show the tap right away; the list catches up when the request finishes.
  const checked = doing ? true : undo.isPending ? false : done
  const verb = isWater ? 'watered' : 'fertilized'

  const toggle = () => {
    if (doing || undo.isPending) return
    if (task.done_today_event_id) undo.mutate(task.done_today_event_id)
    else if (isWater) water.mutate({ plantId: task.plant_id, withFertilizer: task.with_fertilizer })
    else fertilize.mutate(task.plant_id)
  }

  const dose =
    task.fert_dose != null && task.fertilizer_type
      ? isWater
        ? shortDose(task.fert_dose, task.fertilizer_type)
        : formatDose(task.fert_dose, task.fertilizer_type)
      : null

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
        {...(isWater
          ? { to: '/water/$plantId', params: { plantId: task.plant_id } }
          : { to: '/plants/$plantId', params: { plantId: task.plant_id } })}
        className="flex min-w-0 flex-1 flex-col gap-0.5"
      >
        <span
          className={`truncate text-body-strong ${checked ? 'text-ink-subtle line-through' : 'text-ink'}`}
        >
          {task.nickname}
        </span>
        <span className="truncate text-field-label font-medium text-ink-subtle">
          {isWater ? task.room_name : [task.fertilizer_name, dose].filter(Boolean).join(' · ')}
        </span>
        {isWater && task.with_fertilizer && (
          <span className="mt-0.5 self-start rounded-sm bg-fert-soft px-2 py-0.5 text-nav font-bold text-fert">
            + fertilizer{dose ? ` ${dose}` : ''}
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={checked}
        aria-label={
          checked ? `${task.nickname} ${verb}, tap to undo` : `Mark ${task.nickname} ${verb}`
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
