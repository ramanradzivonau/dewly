import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import type { Choice } from '@/components/ui/ChoiceGroup'
import { tasksKey } from '@/features/care/keys'
import { plantsKey } from '@/features/plants/api'
import { supabase } from '@/lib/supabase'

export const fertilizerTypes = ['liquid', 'granules', 'sticks'] as const
export type FertilizerType = (typeof fertilizerTypes)[number]

export const fertilizerTypeOptions: Choice<FertilizerType>[] = [
  { value: 'liquid', label: 'Liquid' },
  { value: 'granules', label: 'Granules' },
  { value: 'sticks', label: 'Sticks' },
]

export const doseUnits: Record<FertilizerType, string> = {
  liquid: 'ml per 1 L of water',
  granules: 'g per 1 L of soil',
  sticks: 'sticks per pot',
}

/** "5 ml per 1 L" style, for chips and task rows. */
export const formatDose = (dose: number, type: FertilizerType) => `${dose} ${doseUnits[type]}`

/** Short form for the "+ fertilizer 5 ml" badge. */
export const shortDose = (dose: number, type: FertilizerType) =>
  type === 'liquid' ? `${dose} ml` : type === 'granules' ? `${dose} g` : `${dose} sticks`

export type Fertilizer = {
  id: string
  name: string
  type: FertilizerType
  dose: number
  /** Plants whose plan uses it. */
  plants: { plant: { id: string; nickname: string; cover_photo: string | null } | null }[]
}

export const fertilizerSchema = z.object({
  name: z.string().trim().min(1, 'Give it a name').max(40, 'Keep it under 40 characters'),
  type: z.enum(fertilizerTypes),
  dose: z
    .number({ error: 'Enter the dose' })
    .int('Whole numbers only')
    .positive('Enter the dose')
    .max(1000, 'Up to 1000'),
})

export type FertilizerFormValues = z.infer<typeof fertilizerSchema>

export const fertilizersKey = ['fertilizers'] as const

const columns =
  'id, name, type, dose, plants:care_schedules (plant:plants (id, nickname, cover_photo))'

export const fertilizersQuery = () =>
  queryOptions({
    queryKey: fertilizersKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('fertilizers').select(columns).order('name')
      if (error) throw error
      return data as unknown as Fertilizer[]
    },
  })

function useFertilizerMutation<T, R>(mutationFn: (input: T) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    // Doses and names show up in tasks and plant cards too.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: fertilizersKey }),
        queryClient.invalidateQueries({ queryKey: tasksKey }),
        queryClient.invalidateQueries({ queryKey: plantsKey }),
      ]),
  })
}

export const useCreateFertilizer = () =>
  useFertilizerMutation(async (values: FertilizerFormValues) => {
    const { data, error } = await supabase.from('fertilizers').insert(values).select('id').single()
    if (error) throw error
    return data
  })

export const useUpdateFertilizer = (id: string) =>
  useFertilizerMutation(async (values: FertilizerFormValues) => {
    const { error } = await supabase.from('fertilizers').update(values).eq('id', id)
    if (error) throw error
  })

/** Plans that use it lose their fertilizer (set to none). */
export const useDeleteFertilizer = (id: string) =>
  useFertilizerMutation(async () => {
    const { error } = await supabase.from('fertilizers').delete().eq('id', id)
    if (error) throw error
  })
