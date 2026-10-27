import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { Controller, useForm, type FieldError, type UseFormRegister } from 'react-hook-form'

import { FormCard, FormError, FormScreen } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import { ChoiceGroup, Switch } from '@/components/ui/ChoiceGroup'
import { TextField } from '@/components/ui/TextField'

import {
  lightLabels,
  lights,
  roomNameSuggestions,
  roomSchema,
  windowDirs,
  windowLabel,
  type RoomFormValues,
} from './options'

type RoomFormProps = {
  title: string
  subtitle: string
  submitLabel: string
  defaultValues: RoomFormValues
  back: Parameters<typeof FormScreen>[0]['back']
  onSubmit: (values: RoomFormValues) => void
  saving: boolean
  error: string | null
  /** Extra sections under the form, e.g. Delete room on Edit. */
  children?: ReactNode
}

const lightOptions = lights.map((value) => ({ value, ...lightLabels[value] }))
const windowOptions = windowDirs.map((value) => ({ value, label: windowLabel(value) }))

/** New room and Edit room: name, light, window, climate ranges, drafts. */
export function RoomForm({
  title,
  subtitle,
  submitLabel,
  defaultValues,
  back,
  onSubmit,
  saving,
  error,
  children,
}: RoomFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RoomFormValues>({ resolver: zodResolver(roomSchema), defaultValues })

  return (
    <FormScreen
      back={back}
      title={title}
      subtitle={subtitle}
      onSubmit={handleSubmit(onSubmit)}
      bottomBar={
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      }
    >
      <FormCard>
        <TextField
          label="Name"
          autoComplete="off"
          placeholder="e.g. Living room"
          error={errors.name?.message}
          {...register('name')}
        />
        <div className="flex flex-wrap gap-1.5" aria-label="Suggested names" role="group">
          {roomNameSuggestions.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setValue('name', name, { shouldValidate: true })}
              className="min-h-9 rounded-pill border border-border bg-surface px-3 text-caption font-bold text-primary"
            >
              {name}
            </button>
          ))}
        </div>
      </FormCard>

      <FormCard>
        <h2 className="text-label text-primary">Light</h2>
        <Controller
          control={control}
          name="light"
          render={({ field }) => (
            <ChoiceGroup
              label="Light"
              options={lightOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <h3 className="mt-1.5 text-field-label font-extrabold text-ink">Window faces</h3>
        <Controller
          control={control}
          name="window_dir"
          render={({ field }) => (
            <ChoiceGroup
              label="Window direction"
              options={windowOptions}
              value={field.value}
              onChange={field.onChange}
              columns="grid-cols-5"
              size="compact"
            />
          )}
        />
      </FormCard>

      <FormCard>
        <h2 className="text-label text-primary">Climate</h2>
        <RangeRow
          name="winter"
          label="Winter temp"
          unit="°C"
          register={register}
          error={errors.winter}
        />
        <RangeRow
          name="summer"
          label="Summer temp"
          unit="°C"
          register={register}
          error={errors.summer}
        />
        <RangeRow
          name="humidity"
          label="Humidity"
          unit="%"
          register={register}
          error={errors.humidity}
        />
        <div className="border-t border-divider pt-1.5">
          <Controller
            control={control}
            name="drafts"
            render={({ field }) => (
              <Switch label="Drafts" checked={field.value} onChange={field.onChange} />
            )}
          />
        </div>
      </FormCard>

      <FormError message={error} />

      {children}
    </FormScreen>
  )
}

type RangeError = { min?: FieldError; max?: FieldError; message?: string } | undefined

function RangeRow({
  name,
  label,
  unit,
  register,
  error,
}: {
  name: 'winter' | 'summer' | 'humidity'
  label: string
  unit: string
  register: UseFormRegister<RoomFormValues>
  error: RangeError
}) {
  const message = error?.min?.message ?? error?.max?.message ?? error?.message
  const errorId = `${name}-error`
  const input =
    'min-h-11 w-15 rounded-sm bg-bg text-center text-input font-bold text-ink outline-none focus:ring-2 focus:ring-primary aria-invalid:ring-2 aria-invalid:ring-danger'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-body font-semibold text-ink">{label}</span>
        <span className="flex items-center gap-1.5">
          <input
            type="number"
            // Temperatures can go below zero; the numeric keypad has no minus key.
            inputMode={name === 'humidity' ? 'numeric' : undefined}
            aria-label={`${label} minimum`}
            aria-invalid={error?.min || error?.message ? true : undefined}
            aria-describedby={message ? errorId : undefined}
            className={input}
            {...register(`${name}.min`, { valueAsNumber: true })}
          />
          <span className="text-ink-subtle" aria-hidden>
            –
          </span>
          <input
            type="number"
            inputMode={name === 'humidity' ? 'numeric' : undefined}
            aria-label={`${label} maximum`}
            aria-invalid={error?.max ? true : undefined}
            aria-describedby={message ? errorId : undefined}
            className={input}
            {...register(`${name}.max`, { valueAsNumber: true })}
          />
          <span className="w-6 text-field-label font-medium text-ink-subtle">{unit}</span>
        </span>
      </div>
      {message && (
        <p id={errorId} className="text-right text-caption text-danger">
          {message}
        </p>
      )}
    </div>
  )
}
