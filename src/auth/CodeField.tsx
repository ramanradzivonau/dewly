import { useEffect, useState } from 'react'

import { FormCard } from '@/components/FormScreen'
import { OtpInput } from '@/components/ui/OtpInput'

const RESEND_AFTER_SECONDS = 60

type CodeFieldProps = {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  /** The code was accepted: digits stay visible but locked, resend is hidden. */
  confirmed?: boolean
  /** Sends a new code; the countdown restarts when it resolves. */
  onResend: () => Promise<unknown>
}

/** The "Code" card: six digit boxes and a resend link with a countdown. */
export function CodeField({
  value,
  onChange,
  invalid,
  confirmed = false,
  onResend,
}: CodeFieldProps) {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_AFTER_SECONDS)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  const resend = async () => {
    setResending(true)
    try {
      await onResend()
      setSecondsLeft(RESEND_AFTER_SECONDS)
    } finally {
      setResending(false)
    }
  }

  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`

  return (
    <FormCard>
      <span id="code-label" className="text-field-label text-ink">
        Code
      </span>
      <OtpInput
        value={value}
        onChange={onChange}
        labelledBy="code-label"
        invalid={invalid}
        disabled={confirmed}
      />
      {confirmed ? (
        <p role="status" className="text-field-label text-primary">
          Code confirmed.
        </p>
      ) : (
        <p className="text-field-label font-medium text-ink-subtle">
          Didn’t get it? Check spam or{' '}
          <button
            type="button"
            onClick={resend}
            disabled={secondsLeft > 0 || resending}
            className="min-h-8 font-extrabold text-primary disabled:text-ink-subtle"
          >
            {secondsLeft > 0 ? `resend in ${countdown}` : resending ? 'sending…' : 'resend code'}
          </button>
        </p>
      )}
    </FormCard>
  )
}
