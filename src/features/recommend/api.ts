import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { tasksKey } from '@/features/care/keys'
import { plantsKey } from '@/features/plants/api'
import type { PlantFormValues } from '@/features/plants/options'
import type { SpeciesPick } from '@/features/species/api'
import { supabase } from '@/lib/supabase'

const toxicity = z.enum(['toxic', 'non_toxic', 'unknown'])

/** Species care info from Gemini, cached on the species row. */
export const careInfoSchema = z.object({
  light: z.string(),
  watering: z.string(),
  soil: z.string(),
  humidity: z.string(),
  temperature: z.string(),
  growth_rate: z.enum(['slow', 'medium', 'fast']),
  recommended_soil: z.enum(['universal', 'aroid_mix', 'cactus_mix', 'peat']),
  pot_diameter_cm: z.object({ min: z.number(), max: z.number() }),
  toxicity: z.object({ cats: toxicity, dogs: toxicity, note: z.string() }),
})
export type CareInfo = z.infer<typeof careInfoSchema>

const responseSchema = z.object({
  recommendation: z.object({
    water_days_warm: z.number().int(),
    water_days_cold: z.number().int(),
    progress_days: z.number().int(),
    tip: z.string(),
    explanation: z.string(),
    fertilizer: z.object({
      mode: z.enum(['every_n_waterings', 'every_n_weeks']),
      n: z.number().int(),
      months: z.array(z.number().int()),
    }),
    care_info: careInfoSchema,
  }),
  applied: z.boolean(),
})

export type Recommendation = z.infer<typeof responseSchema>['recommendation']

async function recommend(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('recommend', {
    body,
    // The function gives up on Gemini after ~90 s; don't spin forever if the network hangs.
    signal: AbortSignal.timeout(100_000),
  })
  if (error) throw error
  return responseSchema.parse(data)
}

/**
 * Gemini answers 502 (busy or slow) or 429 (limit) in load spikes that pass in a minute or two;
 * those are worth asking again. Anything else (bad input, no network) is not.
 */
const busyRetry = (times: number) => ({
  retry: (count: number, error: unknown) => count < times && isBusy(error),
  retryDelay: 20_000,
})

export function isBusy(error: unknown) {
  const status = (error as { context?: { status?: number } } | null)?.context?.status
  return status === 502 || status === 429
}

/** Step 5 of Add plant: a schedule for a plant that isn't saved yet. */
export function useDraftRecommendation() {
  return useMutation({
    // One more try: the Add button waits on this.
    ...busyRetry(1),
    mutationFn: ({ values, species }: { values: PlantFormValues; species: SpeciesPick | null }) =>
      recommend({
        draft: {
          room_id: values.room_id,
          species: species
            ? { scientific_name: species.scientific_name, common_name: species.common_name }
            : null,
          pot_type: values.pot_type,
          pot_diameter_cm: values.pot_diameter_cm,
          drainage: values.drainage,
          soil: values.soil === 'custom' ? values.soil_custom : values.soil,
          repotted_on: values.repotted_on,
          height_cm: values.height_cm,
          born_on: values.born_on,
          near: values.near,
          grow_light_hours: values.grow_light ? values.grow_light_hours : null,
        },
      }).then((r) => r.recommendation),
  })
}

/** Recalculate a saved plant; `force` also replaces a custom schedule. */
export function useRecommend(plantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    ...busyRetry(2),
    mutationFn: (force: boolean) => recommend({ plant_id: plantId, force }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [...plantsKey, plantId] }),
        queryClient.invalidateQueries({ queryKey: tasksKey }),
      ]),
  })
}

/** Saves the AI schedule for a just-created plant; the answer comes from the cache. */
export const applyRecommendation = (plantId: string) =>
  recommend({ plant_id: plantId, force: true })

/**
 * Recalculates AI schedules one by one, in the background. Custom schedules are skipped by
 * the function itself. Failures are left for the next trigger (edit, new month, button).
 */
export async function recalculate(plantIds: string[]) {
  for (const id of plantIds) {
    await recommend({ plant_id: id, force: false }).catch(() => undefined)
  }
}

/** AI schedules of these plants (or all), optionally only those computed before `before`. */
export async function aiSchedules({ roomId, before }: { roomId?: string; before?: Date } = {}) {
  let query = supabase
    .from('care_schedules')
    .select('plant_id, computed_at, plant:plants!inner (room_id)')
    .eq('source', 'ai')
  if (roomId) query = query.eq('plant.room_id', roomId)
  if (before) query = query.or(`computed_at.is.null,computed_at.lt.${before.toISOString()}`)
  const { data, error } = await query
  if (error) throw error
  return data.map((s) => s.plant_id as string)
}
