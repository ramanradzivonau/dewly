import { createFileRoute } from '@tanstack/react-router'

import { Screen, StubCard } from '@/components/Screen'

export const Route = createFileRoute('/_authed/_tabs/plants')({
  component: PlantsScreen,
})

function PlantsScreen() {
  return (
    <Screen title="My Plants" subtitle="Your rooms and plants.">
      <StubCard>Add your first plant with the + button.</StubCard>
    </Screen>
  )
}
