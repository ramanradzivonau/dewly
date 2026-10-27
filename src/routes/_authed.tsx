import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

/** Everything inside the app needs a session; otherwise go to Log in and come back after. */
export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context, location }) => {
    if (!context.session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: Outlet,
})
