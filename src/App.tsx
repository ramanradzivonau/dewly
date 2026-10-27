import type { Session } from '@supabase/supabase-js'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { supabase } from './lib/supabase'
import { queryClient, router } from './router'

export function App() {
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

  if (session === undefined) return null

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ session, queryClient }} />
    </QueryClientProvider>
  )
}
