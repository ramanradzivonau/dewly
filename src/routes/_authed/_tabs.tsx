import { createFileRoute, Outlet } from '@tanstack/react-router'

import { NavBar } from '@/components/NavBar'

export const Route = createFileRoute('/_authed/_tabs')({
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
