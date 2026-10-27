import { createFileRoute } from '@tanstack/react-router'

import { Screen, StubCard } from '@/components/Screen'

export const Route = createFileRoute('/_authed/_tabs/today')({
  component: TodayScreen,
})

function TodayScreen() {
  return (
    <Screen title="Today" subtitle="Nothing to water yet.">
      <StubCard>Your watering, fertilizing and progress tasks will show up here.</StubCard>
    </Screen>
  )
}
