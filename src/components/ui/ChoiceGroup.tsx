import type { ReactNode } from 'react'

export type Choice<T extends string> = { value: T; label: string; hint?: string }

type ChoiceGroupProps<T extends string> = {
  label: string
  options: readonly Choice<T>[]
  value: T
  onChange: (value: T) => void
  /** Grid columns; `grid-cols-*` class. */
  columns?: string
  /** `tile` is a two-line option, `compact` a single short label (window directions). */
  size?: 'tile' | 'compact'
}

/** Single-choice options drawn as tiles: primary ring and soft fill when selected. */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 'grid-cols-2',
  size = 'tile',
}: ChoiceGroupProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-2 ${columns}`}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex flex-col justify-center gap-0.5 border-2 text-ink ${
              size === 'tile'
                ? 'min-h-16 rounded-md px-3 py-2 text-left'
                : 'min-h-11 rounded-sm text-center'
            } ${selected ? 'border-primary bg-primary-soft' : 'border-border bg-surface'}`}
          >
            <span className={size === 'tile' ? 'text-field-label font-extrabold' : 'text-caption'}>
              {option.label}
            </span>
            {option.hint && <span className="text-caption text-ink-subtle">{option.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** iOS-style on/off switch with a visible label. */
export function Switch({
  label,
  checked,
  onChange,
}: {
  label: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3">
      <span className="text-body font-semibold text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-13 shrink-0 rounded-pill transition-colors ${checked ? 'bg-primary' : 'bg-border-strong'}`}
      >
        <span
          className={`absolute top-1 size-6 rounded-pill bg-surface transition-[left] ${checked ? 'left-6' : 'left-1'}`}
        />
      </button>
    </label>
  )
}
