import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router'

import { Button } from '@/components/ui/Button'
import { useOnline } from '@/lib/useOnline'

/** Any route that fails to load: plain words, a retry, and a way home. */
export function ErrorScreen({ reset }: ErrorComponentProps) {
  const router = useRouter()
  const online = useOnline()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pt-screen pb-10">
      <h1 className="text-title text-primary">
        {online ? 'Something went wrong' : 'You’re offline'}
      </h1>
      <p className="text-body text-ink-muted">
        {online
          ? 'This screen couldn’t load. Try again in a moment.'
          : 'This screen needs a connection the first time. Connect and try again.'}
      </p>
      <Button
        onClick={() => {
          reset()
          void router.invalidate()
        }}
      >
        Try again
      </Button>
      <Link
        to="/today"
        className="flex min-h-11 items-center self-center text-label text-primary-text"
      >
        Go to Today
      </Link>
    </main>
  )
}

export function NotFoundScreen() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-screen">
      <h1 className="text-title text-primary">Page not found</h1>
      <p className="text-body text-ink-muted">The link may be old or mistyped.</p>
      <Link to="/today" className="flex min-h-11 items-center text-label text-primary-text">
        Go to Today
      </Link>
    </main>
  )
}

/** A thin strip on top while there's no network; screens keep showing the saved copy. */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <p
      role="status"
      className="sticky top-0 z-20 bg-primary px-4 pt-[max(6px,env(safe-area-inset-top))] pb-1.5 text-center text-caption text-on-primary"
    >
      You’re offline. Showing what was saved; changes need a connection.
    </p>
  )
}
