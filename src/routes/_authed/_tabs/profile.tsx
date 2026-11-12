import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'

import { ChevronRightIcon, FlaskIcon, PlusIcon } from '@/components/icons'
import { Screen, StubCard } from '@/components/Screen'
import { Button } from '@/components/ui/Button'
import { fertilizersQuery, fertilizerTypeOptions, formatDose } from '@/features/fertilizers/api'
import { profileQuery } from '@/features/profile/api'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authed/_tabs/profile')({
  loader: ({ context }) => context.queryClient.ensureQueryData(fertilizersQuery()),
  component: ProfileScreen,
})

function ProfileScreen() {
  const { user } = Route.useRouteContext()
  // Loaded by the _tabs guard, so this never suspends on first render.
  const { data: profile } = useSuspenseQuery(profileQuery(user.id))

  // The _authed guard sends the user to Log in once the session is gone.
  const logOut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
  })

  return (
    <Screen
      title="Profile"
      subtitle={profile.display_name ? `Signed in as ${profile.display_name}` : undefined}
    >
      <StubCard>
        {user.email}
        <br />
        City: {profile.city}{' '}
        <Link to="/onboarding/city" className="font-bold text-primary-text">
          Change
        </Link>
        <br />
        Reminder times will live here.
      </StubCard>
      <Fertilizers />
      <Button variant="secondary" loading={logOut.isPending} onClick={() => logOut.mutate()}>
        Log out
      </Button>
    </Screen>
  )
}

function Fertilizers() {
  const { data: fertilizers } = useSuspenseQuery(fertilizersQuery())

  return (
    <section className="flex flex-col rounded-lg bg-surface px-5 pt-5.5 pb-3">
      <h2 className="mb-2 text-section text-primary">My fertilizers</h2>
      <ul>
        {fertilizers.map((f) => (
          <li key={f.id}>
            <Link
              to="/fertilizers/$fertilizerId"
              params={{ fertilizerId: f.id }}
              className="flex min-h-16 items-center gap-3.5 py-1.5"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-fert-soft text-fert">
                <FlaskIcon width={22} height={22} />
              </span>
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
            <span className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-primary-soft text-primary">
              <PlusIcon width={22} height={22} />
            </span>
            <span className="text-label font-semibold text-ink">Add fertilizer</span>
          </Link>
        </li>
      </ul>
    </section>
  )
}
