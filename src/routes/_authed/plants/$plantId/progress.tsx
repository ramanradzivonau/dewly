import { zodResolver } from '@hookform/resolvers/zod'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { useRef } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'

import { FormCard, FormError, FormScreen } from '@/components/FormScreen'
import { CameraIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { NumberSlider } from '@/components/ui/NumberSlider'
import { plantQuery } from '@/features/plants/api'
import { usePickedPhoto } from '@/features/plants/usePickedPhoto'
import {
  goodTags,
  healthLabels,
  healthTone,
  healths,
  needsHelp,
  problemTags,
  progressQuery,
  progressSchema,
  useSaveProgress,
  type ProgressFormValues,
} from '@/features/progress/api'
import { HealthIcon } from '@/features/progress/HealthIcon'

export const Route = createFileRoute('/_authed/plants/$plantId/progress')({
  loader: async ({ context, params }) => {
    const [plant] = await Promise.all([
      context.queryClient.ensureQueryData(plantQuery(params.plantId)),
      context.queryClient.ensureQueryData(progressQuery(params.plantId)),
    ])
    if (!plant) throw notFound()
  },
  component: ProgressScreen,
})

const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

/** Update progress: health, a photo that becomes the cover, height, tags and a note. */
function ProgressScreen() {
  const { plantId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const { data: plant } = useSuspenseQuery(plantQuery(plantId))
  const { data: entries } = useSuspenseQuery(progressQuery(plantId))
  const save = useSaveProgress(user.id, plantId)
  const photo = usePickedPhoto()
  const fileInput = useRef<HTMLInputElement>(null)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProgressFormValues>({
    resolver: zodResolver(progressSchema),
    defaultValues: { height_cm: plant?.height_cm ?? null, tags: [], note: '' },
  })
  const [health, height] = useWatch({ control, name: ['health', 'height_cm'] })
  if (!plant) return null

  const last = entries[0]
  const wasHeight = last?.height_cm ?? plant.height_cm
  const growth =
    height && wasHeight
      ? height === wasHeight
        ? 'Same as last time'
        : `${height > wasHeight ? '+' : ''}${height - wasHeight} cm since last time`
      : null

  return (
    <FormScreen
      back={{ to: '/plants/$plantId', params: { plantId }, label: 'Close', icon: 'close' }}
      title="Progress update"
      subtitle={
        last
          ? `How is ${plant.nickname} doing? Last update was on ${dayMonth.format(new Date(last.at))}, ${healthLabels[last.health]}.`
          : `How is ${plant.nickname} doing?`
      }
      onSubmit={handleSubmit((values) =>
        save.mutate(
          { values, photo: photo.blob },
          {
            onSuccess: () =>
              navigate({
                to: '/plants/$plantId/history',
                params: { plantId },
                search: { tab: 'progress' },
                replace: true,
              }),
          },
        ),
      )}
      bottomBar={
        <Button type="submit" loading={save.isPending}>
          Save progress
        </Button>
      }
    >
      <FormCard>
        <h2 className="text-body-strong font-extrabold text-primary">
          How healthy is {plant.nickname}?
        </h2>
        <Controller
          control={control}
          name="health"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Health" className="grid grid-cols-4 gap-2">
              {healths.map((h) => {
                const on = field.value === h
                return (
                  <button
                    key={h}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => field.onChange(h)}
                    className="flex flex-col items-center gap-2 text-ink"
                  >
                    <span
                      className={`flex size-16 items-center justify-center rounded-md ${on ? healthTone[h] : 'bg-bg text-primary'}`}
                    >
                      <HealthIcon health={h} />
                    </span>
                    <span className={`text-caption ${on ? 'font-extrabold' : 'font-semibold'}`}>
                      {healthLabels[h]}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        />
        {errors.health && <p className="text-caption text-danger">{errors.health.message}</p>}
      </FormCard>

      <FormCard>
        <div className="flex flex-col gap-1">
          <h2 className="text-body-strong font-extrabold text-primary">Photo</h2>
          <p className="text-field-label font-medium text-ink-subtle">
            It becomes {plant.nickname}’s new cover photo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex min-h-28 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-md border-2 border-dashed border-border-strong bg-bg-raised text-body font-bold text-primary"
        >
          {photo.preview ? (
            <img src={photo.preview} alt="New photo" className="max-h-72 w-full object-cover" />
          ) : (
            <>
              <CameraIcon width={28} height={28} />
              Take or choose a photo
            </>
          )}
        </button>
        {/* iOS offers the camera or the photo library for image inputs. */}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) photo.pick(file)
            e.target.value = ''
          }}
        />
        {photo.error && <p className="text-caption text-danger">{photo.error}</p>}
      </FormCard>

      <FormCard>
        <Controller
          control={control}
          name="height_cm"
          render={({ field, fieldState }) => (
            <NumberSlider
              label="Height"
              unit="cm"
              min={0}
              max={200}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <p className="text-center text-caption font-bold text-primary-text">
          {growth ?? (wasHeight ? `Optional · was ${wasHeight} cm` : 'Optional')}
        </p>
      </FormCard>

      <FormCard>
        <div className="flex flex-col gap-1">
          <h2 className="text-body-strong font-extrabold text-primary">Worth noticing</h2>
          <p className="text-field-label font-medium text-ink-subtle">
            Pick any that apply (optional)
          </p>
        </div>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => {
            const toggle = (t: string) =>
              field.onChange(
                field.value.includes(t) ? field.value.filter((x) => x !== t) : [...field.value, t],
              )
            return (
              <>
                <TagGroup
                  title="Good signs"
                  tags={goodTags}
                  selected={field.value}
                  onToggle={toggle}
                  on="bg-primary text-on-primary"
                  off="bg-bg text-primary"
                  titleTone="text-primary-text"
                />
                {needsHelp(health) && (
                  <TagGroup
                    title="What’s wrong?"
                    tags={problemTags}
                    selected={field.value}
                    onToggle={toggle}
                    on="bg-danger text-on-primary"
                    off="bg-bg text-danger-strong"
                    titleTone="text-danger"
                  />
                )}
              </>
            )
          }}
        />
      </FormCard>

      <FormCard>
        <label htmlFor="note" className="text-body-strong font-extrabold text-primary">
          Note <span className="text-caption font-medium text-ink-subtle">optional</span>
        </label>
        <textarea
          id="note"
          rows={3}
          placeholder="Rotated the pot, new leaf unfurling"
          aria-invalid={errors.note ? true : undefined}
          className="resize-none rounded-md bg-bg px-4 py-3.5 text-input text-ink outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-primary aria-invalid:ring-2 aria-invalid:ring-danger"
          {...register('note')}
        />
        {errors.note && <p className="text-caption text-danger">{errors.note.message}</p>}
      </FormCard>

      <FormError message={save.error ? 'Couldn’t save the update. Try again.' : null} />
    </FormScreen>
  )
}

function TagGroup({
  title,
  tags,
  selected,
  onToggle,
  on,
  off,
  titleTone,
}: {
  title: string
  tags: Record<string, string>
  selected: string[]
  onToggle: (tag: string) => void
  on: string
  off: string
  titleTone: string
}) {
  return (
    <div role="group" aria-label={title} className="flex flex-col gap-2">
      <span className={`text-nav font-extrabold tracking-[0.6px] uppercase ${titleTone}`}>
        {title}
      </span>
      <div className="flex flex-wrap gap-2">
        {Object.entries(tags).map(([tag, label]) => {
          const isOn = selected.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={isOn}
              onClick={() => onToggle(tag)}
              className={`min-h-10 rounded-pill px-3.5 text-field-label ${isOn ? on : off}`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
