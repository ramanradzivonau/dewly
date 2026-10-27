import type { ReactNode } from 'react'

/** Tab root layout: title in `display`, optional subtitle, cards stacked with `space-4` gaps. */
export function Screen({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-[max(var(--spacing-7),env(safe-area-inset-top))] pb-40">
      <header className="flex flex-col gap-1">
        <h1 className="text-display text-primary">{title}</h1>
        {subtitle && <p className="text-body text-ink-muted">{subtitle}</p>}
      </header>
      {children}
    </main>
  )
}

/** Placeholder card for screens that aren't built yet. */
export function StubCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 text-body text-ink-subtle">
      {children}
    </section>
  )
}
