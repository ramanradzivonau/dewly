import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { useState, type ComponentType, type SVGProps } from 'react'

import { FormError } from '@/components/FormScreen'
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DropIcon,
  DryIcon,
  WetIcon,
} from '@/components/icons'
import { Button } from '@/components/ui/Button'
import {
  overdueLabel,
  tasksQuery,
  usePostpone,
  useWater,
  type SoilState,
} from '@/features/care/api'
import { PlantPhoto } from '@/features/plants/PlantPhoto'

export const Route = createFileRoute('/_authed/water/$plantId')({
  loader: async ({ context, params }) => {
    const tasks = await context.queryClient.ensureQueryData(tasksQuery())
    if (!tasks.some((t) => t.plant_id === params.plantId && t.type === 'water')) throw notFound()
  },
  component: WaterTaskScreen,
})

type Soil = 'wet' | SoilState

const soilOptions: {
  value: Soil
  label: string
  caption: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}[] = [
  { value: 'wet', label: 'Wet', caption: 'Still damp', Icon: WetIcon },
  { value: 'dry_top', label: 'Dry on top', caption: 'Ready to water', Icon: DropIcon },
  { value: 'very_dry', label: 'Very dry', caption: 'Dry all the way', Icon: DryIcon },
]

/** Watering task: instructions, how the soil feels, and Done or Postpone. */
function WaterTaskScreen() {
  const { plantId } = Route.useParams()
  const navigate = useNavigate()
  const { data: tasks } = useSuspenseQuery(tasksQuery())
  const task = tasks.find((t) => t.plant_id === plantId && t.type === 'water')
  const [soil, setSoil] = useState<Soil>('dry_top')
  const [days, setDays] = useState<1 | 2>(1)
  const water = useWater()
  const postpone = usePostpone()
  if (!task) return null

  const backToToday = () => navigate({ to: '/today' })
  const failed = water.error || postpone.error
  const notDue = task.due_on > task.today && !task.done_today_event_id

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-[max(var(--spacing-7),env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))]">
      <Link
        to="/today"
        className="-ml-1 flex min-h-11 items-center gap-1 self-start text-label font-semibold text-primary-text"
      >
        <ChevronLeftIcon width={20} height={20} />
        Today
      </Link>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-title text-ink">Water</h1>
        {task.done_today_event_id ? (
          <Badge tone="bg-primary-soft text-primary">Done today</Badge>
        ) : task.overdue_days > 0 ? (
          <Badge tone="bg-danger-soft text-danger">{overdueLabel(task.overdue_days)}</Badge>
        ) : notDue ? (
          <Badge tone="bg-track text-ink-muted">Not due yet</Badge>
        ) : null}
      </div>

      <Link
        to="/plants/$plantId"
        params={{ plantId }}
        className="flex items-center gap-3.5 rounded-md border border-border bg-surface px-3.5 py-3"
      >
        <PlantPhoto path={task.cover_photo} alt="" className="size-15 rounded-pill" iconSize={28} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-body-strong font-extrabold text-ink">{task.nickname}</span>
          <span className="truncate text-field-label font-medium text-ink-subtle">
            {task.room_name}
          </span>
        </span>
        <span className="flex items-center gap-0.5 text-field-label text-primary-text">
          Plant
          <ChevronRightIcon width={18} height={18} />
        </span>
      </Link>

      <div className="flex gap-3 rounded-md border border-border bg-surface p-4">
        <DropIcon width={22} height={22} className="mt-px shrink-0 text-primary-text" />
        <div className="flex flex-col gap-0.5">
          <span className="text-body font-bold text-ink">
            {task.tip || 'Water when the top few cm are dry'}
          </span>
          <span className="text-field-label font-medium text-ink-subtle">
            Pour until excess water drains from the bottom, then empty the saucer.
          </span>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-section text-ink">How does the soil feel?</h2>
          <p className="text-field-label font-medium text-ink-subtle">
            Touch the top 3 cm with your finger
          </p>
        </div>
        <div role="radiogroup" aria-label="Soil" className="grid grid-cols-3 gap-2">
          {soilOptions.map(({ value, label, caption, Icon }) => {
            const selected = soil === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSoil(value)}
                className={`flex flex-col items-center gap-1.5 rounded-md border-2 px-1.5 pt-4 pb-3.5 text-ink ${
                  selected ? 'border-primary bg-primary-soft' : 'border-border bg-surface'
                }`}
              >
                <Icon
                  width={30}
                  height={30}
                  className={value === 'very_dry' ? 'text-danger' : 'text-primary-text'}
                />
                <span className="text-body font-extrabold">{label}</span>
                <span className="text-caption font-medium text-ink-subtle">{caption}</span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="mt-auto flex flex-col gap-3">
        <FormError message={failed ? 'Couldn’t save. Try again.' : null} />
        {soil === 'wet' ? (
          <>
            <span className="text-field-label text-ink-muted">Remind me again in</span>
            <div
              role="radiogroup"
              aria-label="Postpone by"
              className="grid grid-cols-2 gap-1 rounded-md bg-track p-1"
            >
              {([1, 2] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={days === d}
                  onClick={() => setDays(d)}
                  className={`min-h-11 rounded-sm text-body font-bold text-ink ${days === d ? 'bg-surface' : ''}`}
                >
                  {d === 1 ? '1 day' : '2 days'}
                </button>
              ))}
            </div>
            <Button
              className="mt-3.5"
              loading={postpone.isPending}
              onClick={() => postpone.mutate({ plantId, days }, { onSuccess: backToToday })}
            >
              Postpone watering
            </Button>
          </>
        ) : (
          <>
            {soil === 'very_dry' && (
              <p className="text-center text-field-label font-medium text-ink-muted">
                Thanks! If it keeps drying out, we’ll water a bit sooner.
              </p>
            )}
            <Button
              loading={water.isPending}
              onClick={() => water.mutate({ plantId, soil }, { onSuccess: backToToday })}
            >
              <CheckIcon width={20} height={20} />
              Mark as watered
            </Button>
          </>
        )}
      </div>
    </main>
  )
}

function Badge({ tone, children }: { tone: string; children: string }) {
  return <span className={`rounded-sm px-2.5 py-1 text-caption font-bold ${tone}`}>{children}</span>
}
