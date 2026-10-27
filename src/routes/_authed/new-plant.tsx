import { createFileRoute, useRouter } from '@tanstack/react-router'

import { ChevronLeftIcon } from '@/components/icons'
import { StubCard } from '@/components/Screen'

export const Route = createFileRoute('/_authed/new-plant')({
  component: NewPlantScreen,
})

/** Pushed screen: rendered outside the tabs layout, so the nav bar is hidden. */
function NewPlantScreen() {
  const router = useRouter()

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-[max(var(--spacing-7),env(safe-area-inset-top))] pb-10">
      <button
        type="button"
        onClick={() => router.history.back()}
        aria-label="Back"
        className="-ml-2 flex size-11 items-center justify-center rounded-pill text-primary"
      >
        <ChevronLeftIcon />
      </button>
      <h1 className="text-title text-primary">Add plant</h1>
      <StubCard>Identify by photo or name, then pick a room. Coming in phase 2.</StubCard>
    </main>
  )
}
