import { Link, type LinkProps } from '@tanstack/react-router'
import type { FormEventHandler, ReactNode } from 'react'

import { ChevronLeftIcon, CloseIcon } from './icons'

type FormScreenProps = {
  title: string
  subtitle?: ReactNode
  /** "Step 1 of 3" style label above the title. */
  step?: string
  /** Where the round back button goes; no button when omitted. */
  back?: {
    to: LinkProps['to']
    params?: LinkProps['params']
    search?: LinkProps['search']
    label: string
    /** ✕ for screens that cancel a flow (New room), chevron otherwise. */
    icon?: 'back' | 'close'
  }
  /** Content above the header, e.g. the logo on Log in. */
  top?: ReactNode
  /** Sticky bottom bar with the primary action (Verify, Save). */
  bottomBar?: ReactNode
  onSubmit?: FormEventHandler<HTMLFormElement>
  children: ReactNode
}

/** Layout for form screens: sign-in flows, onboarding, room and plant forms. */
export function FormScreen({
  title,
  subtitle,
  step,
  back,
  top,
  bottomBar,
  onSubmit,
  children,
}: FormScreenProps) {
  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className={`mx-auto flex min-h-dvh max-w-md flex-col gap-4.5 px-5 pt-[max(var(--spacing-7),env(safe-area-inset-top))] ${bottomBar ? 'pb-36' : 'pb-10'}`}
    >
      {back && (
        <Link
          to={back.to}
          params={back.params}
          search={back.search}
          aria-label={back.label}
          className="flex size-11 items-center justify-center self-start rounded-pill border border-border bg-surface text-primary"
        >
          {back.icon === 'close' ? (
            <CloseIcon width={20} height={20} />
          ) : (
            <ChevronLeftIcon width={20} height={20} />
          )}
        </Link>
      )}
      {top}
      <header className="flex flex-col gap-1.5">
        {step && (
          <span className="text-caption font-extrabold tracking-[0.6px] text-ink-subtle uppercase">
            {step}
          </span>
        )}
        <h1 className="text-title text-primary">{title}</h1>
        {subtitle && <p className="text-body text-ink-muted">{subtitle}</p>}
      </header>
      {children}
      {bottomBar && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-bg-raised px-4 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-md">{bottomBar}</div>
        </div>
      )}
    </form>
  )
}

/** White rounded card that groups form fields. */
export function FormCard({ children }: { children: ReactNode }) {
  return <section className="flex flex-col gap-3 rounded-lg bg-surface p-5">{children}</section>
}

/** Inline error under a form, announced to screen readers. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-caption text-danger-strong">
      {message}
    </p>
  )
}
