import { SparkleIcon } from '@/components/icons'

import type { Recommendation } from './api'

type SuggestionCardProps = {
  state: 'idle' | 'loading' | 'error' | 'ready'
  suggestion: Recommendation | null
  onRetry: () => void
}

/** Step 5 of Add plant: what the AI suggested and why, above the editable numbers. */
export function SuggestionCard({ state, suggestion, onRetry }: SuggestionCardProps) {
  if (state === 'idle') return null

  if (state === 'loading') {
    return (
      <p
        aria-live="polite"
        className="flex items-center gap-2.5 rounded-md bg-track px-4 py-3.5 text-field-label text-primary"
      >
        <SparkleIcon width={20} height={20} className="shrink-0 animate-pulse" />
        Working out a care schedule…
      </p>
    )
  }

  if (state === 'error' || !suggestion) {
    return (
      <div role="alert" className="flex flex-col gap-2 rounded-md bg-danger-soft px-4 py-3.5">
        <p className="text-caption text-danger-strong">
          Couldn’t get an AI suggestion. Set the schedule by hand, or try again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-9 self-start text-caption font-bold text-danger-strong underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2.5 rounded-md bg-track px-4 py-3.5 text-field-label font-medium text-primary">
      <SparkleIcon width={20} height={20} className="mt-px shrink-0" />
      <p className="flex flex-col gap-1">
        <span>{suggestion.explanation}</span>
        <span className="text-caption font-extrabold">AI recommendation</span>
      </p>
    </div>
  )
}
