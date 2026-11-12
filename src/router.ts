import type { Session } from '@supabase/supabase-js'
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

export type RouterContext = {
  /** Current Supabase session; null when signed out. Provided by <App />. */
  session: Session | null
  queryClient: QueryClient
}

/** Persisted queries live a day, so the app opens offline with what it last saw. */
export const CACHE_MAX_AGE = 24 * 60 * 60_000

export const queryClient = new QueryClient({
  defaultOptions: {
    // offlineFirst: with no network a query tries once and fails, instead of waiting forever.
    queries: { staleTime: 60_000, retry: 1, gcTime: CACHE_MAX_AGE, networkMode: 'offlineFirst' },
    // Changes fail at once offline, so forms can say so.
    mutations: { networkMode: 'always' },
  },
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
