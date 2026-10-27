import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'

import { Screen, StubCard } from '@/components/Screen'
import { Button } from '@/components/ui/Button'
import { profileQuery } from '@/features/profile/api'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authed/_tabs/profile')({
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
        Reminder times and fertilizers will live here.
      </StubCard>
      <Button variant="secondary" loading={logOut.isPending} onClick={() => logOut.mutate()}>
        Log out
      </Button>
    </Screen>
  )
}
