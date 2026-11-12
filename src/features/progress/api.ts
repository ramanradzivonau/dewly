import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { tasksKey } from '@/features/care/keys'
import { plantsKey } from '@/features/plants/api'
import { removePhotos, uploadPhoto } from '@/features/plants/photos'
import { roomsKey } from '@/features/rooms/api'
import { supabase } from '@/lib/supabase'

export const healths = ['sick', 'struggling', 'good', 'thriving'] as const
export type Health = (typeof healths)[number]

export const healthLabels: Record<Health, string> = {
  sick: 'Sick',
  struggling: 'Struggling',
  good: 'Good',
  thriving: 'Thriving',
}

/** Problem tags are offered (and allowed) only for these. */
export const needsHelp = (h: Health | undefined) => h === 'sick' || h === 'struggling'

export const goodTags = {
  new_leaf: 'New leaf',
  new_shoots: 'New shoots',
  flowering: 'Flowering',
  big_leaves: 'Big leaves',
  aerial_roots: 'Aerial roots',
} as const

export const problemTags = {
  yellow_leaves: 'Yellow leaves',
  brown_tips: 'Brown tips',
  drooping: 'Drooping',
  leaf_drop: 'Leaf drop',
  not_growing: 'Not growing',
  leggy: 'Leggy growth',
  pests: 'Pests',
  spots: 'Spots',
} as const

export type Tag = keyof typeof goodTags | keyof typeof problemTags

export const tagLabel = (t: string) =>
  (goodTags as Record<string, string>)[t] ?? (problemTags as Record<string, string>)[t] ?? t
export const isProblem = (t: string) => t in problemTags

export const progressSchema = z.object({
  health: z.enum(healths, { error: 'How is the plant doing?' }),
  height_cm: z
    .number()
    .int()
    .min(1, 'Between 1 and 1000 cm')
    .max(1000, 'Between 1 and 1000 cm')
    .nullable(),
  tags: z.array(z.string()),
  note: z.string().trim().max(500, 'Keep it under 500 characters'),
})

export type ProgressFormValues = z.infer<typeof progressSchema>

export type ProgressEntry = {
  id: string
  event_id: string
  at: string
  health: Health
  photo_path: string | null
  height_cm: number | null
  tags: string[]
  note: string | null
}

export const progressQuery = (plantId: string) =>
  queryOptions({
    queryKey: [...tasksKey, 'progress', plantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_entries')
        .select('id, event_id, at, health, photo_path, height_cm, tags, note')
        .eq('plant_id', plantId)
        .order('at', { ascending: false })
      if (error) throw error
      return data as ProgressEntry[]
    },
  })

/** Saves the entry, closes the progress task and makes the photo the cover, in one call. */
export function useSaveProgress(userId: string, plantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ values, photo }: { values: ProgressFormValues; photo: Blob | null }) => {
      const path = photo ? await uploadPhoto(userId, photo) : null
      // Problem tags only count while the plant needs help.
      const tags = needsHelp(values.health) ? values.tags : values.tags.filter((t) => !isProblem(t))
      const { error } = await supabase.rpc('save_progress', {
        p_plant: plantId,
        p_health: values.health,
        p_photo_path: path,
        p_height_cm: values.height_cm,
        p_tags: tags,
        p_note: values.note || null,
      })
      if (error) {
        if (path) await removePhotos([path])
        throw error
      }
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: tasksKey }),
        queryClient.invalidateQueries({ queryKey: [...plantsKey, plantId] }),
        queryClient.invalidateQueries({ queryKey: roomsKey }),
      ]),
  })
}

/** Selected tile and badge colors per health level. */
export const healthTone: Record<Health, string> = {
  sick: 'bg-danger text-on-primary',
  struggling: 'bg-fert text-on-primary',
  good: 'bg-primary-soft text-primary',
  thriving: 'bg-primary text-on-primary',
}
