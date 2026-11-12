import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'

import { FormCard, FormError, FormScreen } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import { ChoiceGroup } from '@/components/ui/ChoiceGroup'
import { TextField } from '@/components/ui/TextField'

import {
  doseUnits,
  fertilizerSchema,
  fertilizerTypeOptions,
  type FertilizerFormValues,
} from './api'

type FertilizerFormProps = {
  title: string
  defaultValues: Partial<FertilizerFormValues>
  onSubmit: (values: FertilizerFormValues) => void
  saving: boolean
  error: string | null
  /** Used by and Delete on the edit screen. */
  children?: ReactNode
}

export function FertilizerForm({
  title,
  defaultValues,
  onSubmit,
  saving,
  error,
  children,
}: FertilizerFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FertilizerFormValues>({ resolver: zodResolver(fertilizerSchema), defaultValues })
  const type = useWatch({ control, name: 'type' })

  return (
    <FormScreen
      back={{ to: '/profile', label: 'Back to Profile' }}
      title={title}
      subtitle="The dose shows up in watering tasks marked “with fertilizer”."
      onSubmit={handleSubmit(onSubmit)}
      bottomBar={
        <Button type="submit" loading={saving}>
          Save
        </Button>
      }
    >
      <FormCard>
        <TextField
          label="Name"
          autoComplete="off"
          placeholder="e.g. Pokon Green"
          error={errors.name?.message}
          {...register('name')}
        />
      </FormCard>

      <FormCard>
        <h2 className="text-label text-primary">Type</h2>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <ChoiceGroup
              label="Fertilizer type"
              options={fertilizerTypeOptions}
              value={field.value}
              onChange={field.onChange}
              columns="grid-cols-3"
            />
          )}
        />
        <p className="text-caption font-medium text-ink-subtle">
          {type === 'liquid'
            ? 'Liquid: added to the watering, no separate task.'
            : 'Granules and sticks get their own “Fertilize” task.'}
        </p>
      </FormCard>

      <FormCard>
        <label htmlFor="dose" className="text-label text-primary">
          Dose
        </label>
        <div className="flex items-center gap-2.5">
          <input
            id="dose"
            type="number"
            inputMode="numeric"
            step={1}
            min={1}
            max={1000}
            aria-invalid={errors.dose ? true : undefined}
            className="min-h-14 w-24 rounded-md bg-primary-soft text-center text-section text-primary outline-none focus:ring-2 focus:ring-primary aria-invalid:ring-2 aria-invalid:ring-danger"
            {...register('dose', { valueAsNumber: true })}
          />
          <span className="text-label font-semibold text-ink-muted">{doseUnits[type]}</span>
        </div>
        {errors.dose && <p className="text-caption text-danger">{errors.dose.message}</p>}
      </FormCard>

      <FormError message={error} />
      {children}
    </FormScreen>
  )
}
