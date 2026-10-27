import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react'

import { EyeIcon, EyeOffIcon } from '../icons'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

/**
 * Labelled input for white form cards: bg-colored fill, primary ring on focus.
 * Password fields get a button to show or hide what was typed.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, id, type, className = '', ...props },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`
  const isPassword = type === 'password'
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-field-label text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`min-h-13 w-full rounded-md bg-bg px-4 text-input text-ink outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-primary aria-invalid:ring-2 aria-invalid:ring-danger ${isPassword ? 'pr-13' : ''} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            aria-controls={inputId}
            className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-md text-ink-muted"
          >
            {revealed ? <EyeOffIcon width={22} height={22} /> : <EyeIcon width={22} height={22} />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  )
})
