import { Link, useRouterState } from '@tanstack/react-router'
import type { ComponentType, SVGProps } from 'react'

import { CalendarIcon, LeafIcon, PersonIcon, PlusIcon } from './icons'

type Tab = {
  to: '/today' | '/plants' | '/profile'
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

const tabs: Tab[] = [
  { to: '/today', label: 'Today', Icon: CalendarIcon },
  { to: '/plants', label: 'My Plants', Icon: LeafIcon },
  { to: '/profile', label: 'Profile', Icon: PersonIcon },
]

/** Tabs that show the floating + button above the bar. */
const fabTabs = new Set<string>(['/today', '/plants'])

/**
 * Floating bottom navigation for the three tab roots, with the + button on Today and My Plants.
 * Pushed screens (forms, details) render outside the tabs layout, so the bar is hidden there.
 */
export function NavBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const showFab = fabTabs.has(pathname)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md flex-col items-end gap-3 px-10 pb-[max(28px,env(safe-area-inset-bottom))]">
      {showFab && (
        <Link
          to="/new-plant"
          aria-label="Add plant"
          className="pointer-events-auto -mr-5 flex size-14 items-center justify-center rounded-pill bg-primary text-on-primary shadow-float transition-colors active:bg-primary-hover"
        >
          <PlusIcon width={26} height={26} />
        </Link>
      )}
      <nav
        aria-label="Main"
        className="pointer-events-auto flex w-full rounded-pill border border-border bg-surface/95 p-1.5 shadow-float backdrop-blur"
      >
        {tabs.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex min-h-11 flex-1 flex-col items-center gap-0.5 rounded-pill py-2 text-nav font-semibold text-ink-muted"
            activeProps={{ className: 'bg-primary-soft !text-primary !font-extrabold' }}
          >
            <Icon />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
