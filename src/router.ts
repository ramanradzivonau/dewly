import type { Session } from '@supabase/supabase-js'
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

export type RouterContext = {
  /** Current Supabase session; null when signed out. Provided by <App />. */
  session: Session | null
  queryClient: QueryClient
}

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

export const router = createRouter({
  routeTree,
  context: { session: null, queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
