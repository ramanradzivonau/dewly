import type { User, UserIdentity } from '@supabase/supabase-js'
import { queryOptions } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

/**
 * The signed-in user fresh from Supabase Auth. The route context holds the session's copy,
 * which doesn't change after an email, password or Google update, so these screens read this.
 */
export const authUserQuery = () =>
  queryOptions({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      return data.user
    },
    staleTime: 0,
  })

export const googleIdentity = (user: User): UserIdentity | undefined =>
  user.identities?.find((i) => i.provider === 'google')

/**
 * Whether the user can log in with email and password. An email sign-up has an `email`
 * identity; a Google-first user who set a password later is marked in user metadata.
 */
export const hasPassword = (user: User) =>
  !!user.identities?.some((i) => i.provider === 'email') ||
  user.user_metadata?.password_set === true
