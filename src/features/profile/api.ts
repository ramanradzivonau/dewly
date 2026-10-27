import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export type Profile = {
  id: string
  display_name: string | null
  city: string | null
  lat: number | null
  lon: number | null
  timezone: string | null
  units: 'metric' | 'imperial'
  reminder_times: string[]
}

export type ProfileUpdate = Partial<Omit<Profile, 'id'>>

const columns = 'id, display_name, city, lat, lon, timezone, units, reminder_times'

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(columns)
        .eq('id', userId)
        .single()
      if (error) throw error
      return data as Profile
    },
  })

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (patch: ProfileUpdate) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select(columns)
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: (profile) => queryClient.setQueryData(profileQuery(userId).queryKey, profile),
  })
}
