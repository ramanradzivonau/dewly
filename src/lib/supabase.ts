import { createClient } from '@supabase/supabase-js'

import { env } from './env'

export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  // PKCE: the OAuth return carries a one-time code, not tokens in the URL.
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
