import { Link } from '@tanstack/react-router'
import { useId, useRef, type ChangeEvent } from 'react'
import { Controller, useFormContext, useWatch, type FieldPath } from 'react-hook-form'

import { FormCard } from '@/components/FormScreen'
import { ChoiceGroup, Switch } from '@/components/ui/ChoiceGroup'
import { NumberSlider } from '@/components/ui/NumberSlider'
import { TextField } from '@/components/ui/TextField'
import { doseUnits, type Fertilizer } from '@/features/fertilizers/api'
import type { Room } from '@/features/rooms/api'
import { lightLabels, windowLabel } from '@/features/rooms/options'

import {
  ageSpans,
  dateOf,
  drainageOptions,
  fertModeOptions,
  monthLabels,
  nearOptions,
  potTypeOptions,
  REPOT_UNKNOWN,
  repotSpans,
  soilOptions,
  spanOf,
  type PlantFormValues,
} from './options'
import { PlantPhoto } from './PlantPhoto'

const Title = ({ children }: { children: string }) => (
  <h2 className="text-label text-primary">{children}</h2>
)

/** Cover photo (pick or replace) and nickname. */
export function PhotoNameFields({
  coverPath,
  preview,
  onPhoto,
  photoError,
}: {
  coverPath: string | null
  preview: string | null
  onPhoto: (file: File) => void
  photoError?: string | null
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<PlantFormValues>()
  const input = useRef<HTMLInputElement>(null)
  const hasPhoto = !!(preview || coverPath)

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onPhoto(file)
    e.target.value = ''
  }

  return (
    <FormCard>
      <div className="flex items-center gap-3.5">
        <PlantPhoto
          path={coverPath}
          src={preview}
          alt=""
          iconSize={34}
          className="size-21 rounded-pill"
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-label text-primary">Cover photo</span>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="min-h-9 self-start rounded-pill border-[1.5px] border-primary bg-surface px-3.5 text-caption font-bold text-primary"
          >
            {hasPhoto ? 'Replace' : 'Add photo'}
          </button>
          {/* iOS offers the camera or the photo library for image inputs. */}
          <input
            ref={input}
            type="file"
            accept="image/*"
            onChange={onChange}
            className="hidden"
            aria-hidden
            tabIndex={-1}
          />
        </div>
      </div>
      {photoError && <p className="text-caption text-danger">{photoError}</p>}
      <TextField
        label="Nickname"
        autoComplete="off"
        placeholder="e.g. Big Monty"
        error={errors.nickname?.message}
        {...register('nickname')}
      />
    </FormCard>
  )
}

/** Room picker; light and climate come from the room. */
export function RoomField({ rooms, newRoom = true }: { rooms: Room[]; newRoom?: boolean }) {
  const {
    control,
    formState: { errors },
  } = useFormContext<PlantFormValues>()

  return (
    <FormCard>
      <Title>Room</Title>
      {rooms.length > 0 && (
        <Controller
          control={control}
          name="room_id"
          render={({ field }) => (
            <ChoiceGroup
              label="Room"
              columns="grid-cols-1"
              options={rooms.map((r) => ({
                value: r.id,
                label: r.name,
                hint: `${lightLabels[r.light].label} · ${r.window_dir === 'none' ? 'no window' : `${windowLabel(r.window_dir)} window`}`,
              }))}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      )}
      {errors.room_id && <p className="text-caption text-danger">{errors.room_id.message}</p>}
      {newRoom && (
        <Link
          to="/rooms/new"
          search={{ next: 'new-plant' }}
          className="flex min-h-12 items-center justify-center rounded-md border-2 border-dashed border-border-strong text-body font-bold text-primary"
        >
          + New room
        </Link>
      )}
    </FormCard>
  )
}

export function PotSoilFields() {
  const {
    control,
    register,
    watch,
    formState: { errors },
  } = useFormContext<PlantFormValues>()

  return (
    <>
      <FormCard>
        <Title>Pot</Title>
        <Controller
          control={control}
          name="pot_type"
          render={({ field }) => (
            <ChoiceGroup
              label="Pot"
              options={potTypeOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="pot_diameter_cm"
          render={({ field, fieldState }) => (
            <NumberSlider
              label="Diameter"
              unit="cm"
              min={0}
              max={60}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </FormCard>

      <FormCard>
        <Title>Drainage holes</Title>
        <Controller
          control={control}
          name="drainage"
          render={({ field }) => (
            <ChoiceGroup
              label="Drainage holes"
              options={drainageOptions}
              value={field.value}
              onChange={field.onChange}
              columns="grid-cols-3"
            />
          )}
        />
        {watch('drainage') === 'no' && (
          <p className="rounded-md bg-danger-soft px-4 py-3 text-caption text-danger-strong">
            Without holes water pools at the bottom. Water less, or move it to a pot with drainage.
          </p>
        )}
      </FormCard>

      <FormCard>
        <Title>Soil</Title>
        <Controller
          control={control}
          name="soil"
          render={({ field }) => (
            <ChoiceGroup
              label="Soil"
              options={soilOptions}
              value={field.value}
              onChange={field.onChange}
              columns="grid-cols-3"
            />
          )}
        />
        {watch('soil') === 'custom' && (
          <TextField
            label="Your soil"
            autoComplete="off"
            placeholder="e.g. Bark, perlite and coco coir"
            error={errors.soil_custom?.message}
            {...register('soil_custom')}
          />
        )}
      </FormCard>

      <FormCard>
        <Title>Last repotted</Title>
        <SpanField
          name="repotted_on"
          label="Last repotted"
          options={[...repotSpans, REPOT_UNKNOWN]}
          spans={repotSpans}
          fallback={REPOT_UNKNOWN.value}
        />
      </FormCard>
    </>
  )
}

export function PlantSpotFields() {
  const { control, register, watch, formState } = useFormContext<PlantFormValues>()
  const hoursId = useId()

  return (
    <>
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
      </FormCard>

      <FormCard>
        <Title>Approximate age</Title>
        <SpanField name="born_on" label="Approximate age" options={ageSpans} spans={ageSpans} />
      </FormCard>

      <FormCard>
        <Title>Near heat or cooling</Title>
        <Controller
          control={control}
          name="near"
          render={({ field }) => (
            <ChoiceGroup
              label="Near heat or cooling"
              options={nearOptions}
              value={field.value}
              onChange={field.onChange}
              columns="grid-cols-3"
            />
          )}
        />
      </FormCard>

      <FormCard>
        <Controller
          control={control}
          name="grow_light"
          render={({ field }) => (
            <Switch label="Grow light" checked={field.value} onChange={field.onChange} />
          )}
        />
        {watch('grow_light') && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label htmlFor={hoursId} className="text-body font-semibold text-ink">
                Hours a day
              </label>
              <input
                id={hoursId}
                type="number"
                inputMode="numeric"
                min={1}
                max={24}
                aria-invalid={formState.errors.grow_light_hours ? true : undefined}
                className="min-h-11 w-18 rounded-sm bg-bg text-center text-input font-bold text-ink outline-none focus:ring-2 focus:ring-primary aria-invalid:ring-2 aria-invalid:ring-danger"
                {...register('grow_light_hours', { valueAsNumber: true })}
              />
            </div>
            {formState.errors.grow_light_hours && (
              <p className="text-right text-caption text-danger">
                {formState.errors.grow_light_hours.message}
              </p>
            )}
          </div>
        )}
      </FormCard>
    </>
  )
}

/** Manual schedule until the AI recommendation (phase 6). */
export function ScheduleFields() {
  return (
    <FormCard>
      <Title>Care schedule</Title>
      <DaysRow name="water_days_warm" label="Water every" />
      <DaysRow name="water_days_cold" label="In winter, every" />
      <DaysRow name="progress_days" label="Progress update every" />
      <TipField />
    </FormCard>
  )
}

function TipField() {
  const {
    register,
    formState: { errors },
  } = useFormContext<PlantFormValues>()
  return (
    <TextField
      label="Watering tip"
      autoComplete="off"
      placeholder="e.g. When the top 3 cm are dry"
      error={errors.tip?.message}
      {...register('tip')}
    />
  )
}

function DaysRow({
  name,
  label,
}: {
  name: Extract<FieldPath<PlantFormValues>, `${string}_days${string}`>
  label: string
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<PlantFormValues>()
  const id = useId()
  const error = errors[name]?.message

  return (
    <div className="flex flex-col gap-1 border-b border-divider pb-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-body font-semibold text-ink">
          {label}
        </label>
        <span className="flex items-center gap-2">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={name === 'progress_days' ? 7 : 1}
            max={name === 'progress_days' ? 180 : 90}
            aria-invalid={error ? true : undefined}
            className="min-h-11 w-16 rounded-sm bg-bg text-center text-input font-bold text-ink outline-none focus:ring-2 focus:ring-primary aria-invalid:ring-2 aria-invalid:ring-danger"
            {...register(name, { valueAsNumber: true })}
          />
          <span className="text-field-label font-medium text-ink-subtle">days</span>
        </span>
      </div>
      {error && <p className="text-right text-caption text-danger">{error}</p>}
    </div>
  )
}

/** "6–12 months ago" style choice stored as an approximate date. */
function SpanField({
  name,
  label,
  options,
  spans,
  fallback = '',
}: {
  name: 'repotted_on' | 'born_on'
  label: string
  options: { value: string; label: string }[]
  spans: typeof repotSpans
  fallback?: string
}) {
  const { control } = useFormContext<PlantFormValues>()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <ChoiceGroup
          label={label}
          options={options}
          value={spanOf(spans, field.value) ?? fallback}
          onChange={(value) => field.onChange(dateOf(spans, value))}
        />
      )}
    />
  )
}

/** Feeding plan: which fertilizer, how often, in which months, and the dose. */
export function FertilizerFields({ fertilizers }: { fertilizers: Fertilizer[] }) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<PlantFormValues>()
  const [fertilizerId, mode] = useWatch({ control, name: ['fertilizer_id', 'fert_mode'] })
  const fertilizer = fertilizers.find((f) => f.id === fertilizerId)
  const nId = useId()
  const doseId = useId()
  const input =
    'min-h-11 w-16 rounded-sm bg-bg text-center text-input font-bold text-ink outline-none focus:ring-2 focus:ring-primary aria-invalid:ring-2 aria-invalid:ring-danger'

  return (
    <FormCard>
      <Title>Fertilizer</Title>
      {fertilizers.length === 0 ? (
        <p className="text-caption font-medium text-ink-subtle">
          Add your fertilizers in Profile, then pick one here.
        </p>
      ) : (
        <Controller
          control={control}
          name="fertilizer_id"
          render={({ field }) => (
            <ChoiceGroup
              label="Fertilizer"
              options={[
                ...fertilizers.map((f) => ({ value: f.id, label: f.name })),
                { value: '', label: 'None' },
              ]}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      )}

      {fertilizer && (
        <>
          <Controller
            control={control}
            name="fert_mode"
            render={({ field }) => (
              <ChoiceGroup
                label="How often"
                options={fertModeOptions}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={nId} className="text-body font-semibold text-ink">
              {mode === 'every_n_waterings' ? 'Every Nth watering, N =' : 'Every N weeks, N ='}
            </label>
            <input
              id={nId}
              type="number"
              inputMode="numeric"
              min={1}
              max={12}
              aria-invalid={errors.fert_n ? true : undefined}
              className={input}
              {...register('fert_n', { valueAsNumber: true })}
            />
          </div>
          {errors.fert_n && (
            <p className="text-right text-caption text-danger">{errors.fert_n.message}</p>
          )}

          <h3 className="mt-1 text-field-label font-extrabold text-ink">Active months</h3>
          <Controller
            control={control}
            name="fert_months"
            render={({ field }) => (
              <div role="group" aria-label="Active months" className="grid grid-cols-6 gap-1.5">
                {monthLabels.map((label, i) => {
                  const month = i + 1
                  const on = field.value.includes(month)
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        field.onChange(
                          on ? field.value.filter((m) => m !== month) : [...field.value, month],
                        )
                      }
                      className={`min-h-11 rounded-sm border-2 text-caption ${
                        on
                          ? 'border-primary bg-primary-soft text-ink'
                          : 'border-border text-ink-muted'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          />
          {errors.fert_months && (
            <p className="text-caption text-danger">{errors.fert_months.message}</p>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor={doseId} className="text-body font-semibold text-ink">
              Dose
            </label>
            <div className="flex items-center gap-2.5">
              <input
                id={doseId}
                type="number"
                inputMode="numeric"
                step={1}
                min={1}
                max={1000}
                placeholder={String(fertilizer.dose)}
                aria-invalid={errors.fert_dose ? true : undefined}
                className={`${input} w-20 placeholder:text-ink-subtle`}
                {...register('fert_dose', {
                  setValueAs: (v: string) => (v === '' || v == null ? null : Number(v)),
                })}
              />
              <span className="text-field-label font-medium text-ink-subtle">
                {doseUnits[fertilizer.type]}
              </span>
            </div>
            <p className="text-caption font-medium text-ink-subtle">
              Empty uses the fertilizer’s own dose.
            </p>
            {errors.fert_dose && (
              <p className="text-caption text-danger">{errors.fert_dose.message}</p>
            )}
          </div>
        </>
      )}
    </FormCard>
  )
}
