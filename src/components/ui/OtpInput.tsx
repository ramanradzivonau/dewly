import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

const LENGTH = 6

type OtpInputProps = {
  value: string
  onChange: (value: string) => void
  labelledBy: string
  invalid?: boolean
  disabled?: boolean
}

/** Six one-digit boxes. Typing moves forward, Backspace moves back, paste fills all. */
export function OtpInput({
  value,
  onChange,
  labelledBy,
  invalid = false,
  disabled = false,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '')

  const focus = (i: number) => refs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus()

  const setDigit = (i: number, digit: string) => {
    const next = digits.slice()
    next[i] = digit
    onChange(next.join('').slice(0, LENGTH))
  }

  const handleInput = (i: number, raw: string) => {
    const clean = raw.replace(/\D/g, '')
    if (clean.length > 1) {
      // iOS one-time-code autofill and some keyboards put the whole code in one box.
      onChange(clean.slice(0, LENGTH))
      focus(clean.length)
      return
    }
    setDigit(i, clean)
    if (clean) focus(i + 1)
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i]) {
      e.preventDefault()
      setDigit(i - 1, '')
      focus(i - 1)
    } else if (e.key === 'ArrowLeft') {
      focus(i - 1)
    } else if (e.key === 'ArrowRight') {
      focus(i + 1)
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const clean = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (!clean) return
    e.preventDefault()
    onChange(clean)
    focus(clean.length)
  }

  return (
    <div role="group" aria-labelledby={labelledBy} className="grid grid-cols-6 gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={i === 0 ? LENGTH : 1}
          value={digit}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="min-h-15 w-full rounded-md border-2 border-transparent bg-bg text-center text-code text-ink outline-none focus:border-primary disabled:text-ink-muted aria-invalid:border-danger"
        />
      ))}
    </div>
  )
}
