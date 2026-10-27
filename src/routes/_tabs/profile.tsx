import { createFileRoute } from '@tanstack/react-router'

import { Screen, StubCard } from '@/components/Screen'

export const Route = createFileRoute('/_tabs/profile')({
  component: ProfileScreen,
})

function ProfileScreen() {
  return (
    <Screen title="Profile">
      <StubCard>Account, city, reminder times and fertilizers will live here.</StubCard>
    </Screen>
  )
}
