import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, type LinkProps } from '@tanstack/react-router'
import type { ComponentType, ReactNode, SVGProps } from 'react'

import {
  BellIcon,
  ChevronRightIcon,
  FlaskIcon,
  GoogleIcon,
  LockIcon,
  LogOutIcon,
  MailIcon,
  PersonIcon,
  PinIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/icons'
import { authUserQuery, googleIdentity, hasPassword } from '@/features/account/api'
import { fertilizersQuery, fertilizerTypeOptions, formatDose } from '@/features/fertilizers/api'
import { profileQuery } from '@/features/profile/api'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authed/_tabs/profile')({
  loader: ({ context }) => context.queryClient.ensureQueryData(fertilizersQuery()),
  component: ProfileScreen,
})

type Icon = ComponentType<SVGProps<SVGSVGElement>>

function ProfileScreen() {
  const { user } = Route.useRouteContext()
  // Loaded by the _tabs guard, so this never suspends on first render.
  const { data: profile } = useSuspenseQuery(profileQuery(user.id))
  const name = profile.display_name ?? ''
  // Fresh from Auth: the session copy doesn't see email, password or Google changes.
  const authUser = useQuery(authUserQuery()).data
  const email = authUser?.email ?? user.email

  // The _authed guard sends the user to Log in once the session is gone.
  const logOut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
  })

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4.5 px-4 pt-screen pb-40">
      <h1 className="px-1 text-display text-primary">Profile</h1>

      <div
        aria-hidden
        className="my-1 flex size-26 items-center justify-center self-center rounded-pill bg-leaf-tile text-display text-primary"
      >
        {name ? name[0]!.toUpperCase() : <PersonIcon width={44} height={44} />}
      </div>

      <Section title="Account">
        <Row
          to="/profile/name"
          Icon={PersonIcon}
          label="Display name"
          value={name || 'Add your name'}
        />
        <Row to="/profile/email" Icon={MailIcon} label="Email" sub={email} />
        <Row
          to="/profile/password"
          Icon={LockIcon}
          label="Password"
          value={authUser && !hasPassword(authUser) ? 'Set' : 'Change'}
        />
        <Row
          to="/profile/google"
          Icon={GoogleIcon}
          label="Google"
          value={authUser && googleIdentity(authUser) ? 'Linked' : 'Not linked'}
        />
      </Section>

      <Section title="Location">
        <Row
          to="/onboarding/city"
          search={{ from: 'profile' }}
          Icon={PinIcon}
          label="City"
          value={profile.city ?? 'Not set'}
          sub="For outdoor weather and daylight"
        />
      </Section>

      <Section title="Notifications">
        <Row
          to="/reminders"
          Icon={BellIcon}
          label="Reminders"
          value={`${profile.reminder_times.length} a day`}
          sub={profile.reminder_times.join(' · ')}
        />
      </Section>

      <Fertilizers />

      <Section title="Account actions">
        <li>
          <button
            type="button"
            onClick={() => logOut.mutate()}
            disabled={logOut.isPending}
            className="flex min-h-16 w-full items-center gap-3.5 py-1.5 text-left disabled:opacity-60"
          >
            <RowIcon Icon={LogOutIcon} />
            <span className="flex-1 text-label font-semibold text-ink">
              {logOut.isPending ? 'Signing out…' : 'Sign out'}
            </span>
          </button>
        </li>
        <Row to="/profile/delete" Icon={TrashIcon} label="Delete account" danger />
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col rounded-lg bg-surface px-5 pt-5.5 pb-3">
      <h2 className="mb-2 text-section text-primary">{title}</h2>
      <ul>{children}</ul>
    </section>
  )
}

function RowIcon({ Icon, tone = 'bg-primary text-logo-light' }: { Icon: Icon; tone?: string }) {
  return (
    <span className={`flex size-12 shrink-0 items-center justify-center rounded-pill ${tone}`}>
      <Icon width={22} height={22} />
    </span>
  )
}

/** A profile row: icon, label, optional sub line and value; a link when it has `to`. */
function Row({
  to,
  search,
  Icon,
  label,
  sub,
  value,
  danger = false,
}: {
  to?: LinkProps['to']
  search?: LinkProps['search']
  Icon: Icon
  label: string
  sub?: string
  value?: string
  danger?: boolean
}) {
  const content = (
    <>
      <RowIcon Icon={Icon} tone={danger ? 'bg-danger text-on-primary' : undefined} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`text-label font-semibold ${danger ? 'text-danger' : 'text-ink'}`}>
          {label}
        </span>
        {sub && <span className="truncate text-caption font-medium text-ink-subtle">{sub}</span>}
      </span>
      {value && <span className="shrink-0 text-body text-ink-subtle">{value}</span>}
      {to && <ChevronRightIcon width={20} height={20} className="shrink-0 text-primary" />}
    </>
  )
  return (
    <li>
      {to ? (
        <Link to={to} search={search} className="flex min-h-16 items-center gap-3.5 py-1.5">
          {content}
        </Link>
      ) : (
        <div className="flex min-h-16 items-center gap-3.5 py-1.5">{content}</div>
      )}
    </li>
  )
}

function Fertilizers() {
  const { data: fertilizers } = useSuspenseQuery(fertilizersQuery())

  return (
    <Section title="My fertilizers">
      {fertilizers.map((f) => (
        <li key={f.id}>
          <Link
            to="/fertilizers/$fertilizerId"
            params={{ fertilizerId: f.id }}
            className="flex min-h-16 items-center gap-3.5 py-1.5"
          >
            <RowIcon Icon={FlaskIcon} tone="bg-fert-soft text-fert" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-label font-semibold text-ink">{f.name}</span>
              <span className="text-caption font-medium text-ink-subtle">
                {fertilizerTypeOptions.find((o) => o.value === f.type)?.label} ·{' '}
                {formatDose(f.dose, f.type)}
              </span>
            </span>
            <ChevronRightIcon width={20} height={20} className="text-primary" />
          </Link>
        </li>
      ))}
      <li>
        <Link to="/fertilizers/new" className="flex min-h-16 items-center gap-3.5 py-1.5">
          <RowIcon Icon={PlusIcon} tone="bg-primary-soft text-primary" />
          <span className="text-label font-semibold text-ink">Add fertilizer</span>
        </Link>
      </li>
    </Section>
  )
}
