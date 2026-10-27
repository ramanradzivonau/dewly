import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { Screen, StubCard } from '@/components/Screen'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authed/_tabs/profile')({
  component: ProfileScreen,
})

function ProfileScreen() {
  const { session } = Route.useRouteContext()
  const user = session?.user
  const name = (user?.user_metadata as { display_name?: string } | undefined)?.display_name

  // The _authed guard sends the user to Log in once the session is gone.
  const logOut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
  })

  return (
    <Screen title="Profile" subtitle={name ? `Signed in as ${name}` : undefined}>
      <StubCard>
        {user?.email}
        <br />
        City, reminder times and fertilizers will live here.
      </StubCard>
      <Button variant="secondary" loading={logOut.isPending} onClick={() => logOut.mutate()}>
        Log out
      </Button>
    </Screen>
  )
}
