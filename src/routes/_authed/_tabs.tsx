import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { NavBar } from '@/components/NavBar'
import { profileQuery } from '@/features/profile/api'

export const Route = createFileRoute('/_authed/_tabs')({
  // The tabs need a city (weather, day length); finish onboarding first.
  beforeLoad: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(profileQuery(context.user.id))
    if (!profile.city) throw redirect({ to: '/onboarding/city', replace: true })
  },
  component: TabsLayout,
})

function TabsLayout() {
  return (
    <>
      <Outlet />
      <NavBar />
    </>
  )
}
