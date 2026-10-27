import { useId } from 'react'

type NumberSliderProps = {
  label: string
  unit: string
  value: number | null
  onChange: (value: number | null) => void
  min: number
  max: number
  error?: string
}

/** Big number field with a slider under it (pot diameter, height). Empty means "not set". */
export function NumberSlider({ label, unit, value, onChange, min, max, error }: NumberSliderProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={id} className="text-body font-bold text-ink">
        {label}
      </label>
      <div className="flex items-center justify-center gap-2.5">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={value ?? ''}
          placeholder="—"
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-h-14 w-28 rounded-md bg-primary-soft text-center text-section text-primary outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-primary aria-invalid:ring-2 aria-invalid:ring-danger"
        />
        <span className="text-body-strong text-primary">{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value ?? min}
        onChange={(e) => onChange(Number(e.target.value) || null)}
        aria-label={`${label} in ${unit}`}
        className="w-full accent-primary"
      />
      {error && (
        <p id={errorId} className="text-center text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
