import { useSyncExternalStore } from 'react'

import { currentToasts, subscribeToasts } from '@/lib/toast'

/** Bottom of the screen, above the floating nav bar; announced to screen readers. */
export function Toaster() {
  const list = useSyncExternalStore(subscribeToasts, currentToasts, currentToasts)

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[max(112px,calc(env(safe-area-inset-bottom)+96px))] z-30 mx-auto flex max-w-md flex-col items-center gap-2 px-5"
    >
      {list.map((t) => (
        <p
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-md px-4 py-3 text-center text-field-label shadow-float ${
            t.tone === 'error' ? 'bg-danger-strong text-on-primary' : 'bg-primary text-on-primary'
          }`}
        >
          {t.message}
        </p>
      ))}
    </div>
  )
}
