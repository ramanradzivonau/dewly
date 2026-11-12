import type { Session } from '@supabase/supabase-js'
import { QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { RouterProvider } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { persistOptions } from './lib/persist'
import { supabase } from './lib/supabase'
import { queryClient, router } from './router'

// Restore yesterday's data before the first route loads, then keep saving changes.
const [, restored] = persistQueryClient({ queryClient, ...persistOptions })

export function App() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    // A broken or old copy just means starting without one.
    void restored.catch(() => undefined).finally(() => setReady(true))
  }, [])

  // undefined = still restoring the session from storage.
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const wasSignedIn = useRef<boolean | null>(null)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  // Re-run route guards when the user signs in or out (not on token refresh).
  useEffect(() => {
    if (session === undefined) return
    const signedIn = session !== null
    if (wasSignedIn.current !== null && wasSignedIn.current !== signedIn) {
      if (!signedIn) queryClient.clear()
      void router.invalidate()
    }
    wasSignedIn.current = signedIn
  }, [session])

  if (session === undefined || !ready) return null

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ session, queryClient }} />
    </QueryClientProvider>
  )
}
