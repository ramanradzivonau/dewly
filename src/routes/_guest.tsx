import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { safeRedirect } from '@/auth/errors'

/** Log in, Sign up and Forgot password are only for signed-out users. */
export const Route = createFileRoute('/_guest')({
  beforeLoad: ({ context, location }) => {
    if (context.session) {
      const search = location.search as { redirect?: unknown }
      throw redirect({ href: safeRedirect(search.redirect), replace: true })
    }
  },
  component: Outlet,
})
