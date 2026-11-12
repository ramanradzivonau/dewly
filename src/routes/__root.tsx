import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'

import { ErrorScreen, NotFoundScreen, OfflineBanner } from '@/components/ErrorScreen'
import { Toaster } from '@/components/Toaster'
import type { RouterContext } from '@/router'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
  errorComponent: ErrorScreen,
  notFoundComponent: NotFoundScreen,
})

function Root() {
  return (
    <>
      <OfflineBanner />
      <Outlet />
      <Toaster />
    </>
  )
}
