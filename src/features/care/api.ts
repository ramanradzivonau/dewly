import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { plantsKey } from '@/features/plants/api'
import { supabase } from '@/lib/supabase'

import { tasksKey } from './keys'

export { tasksKey }

export type TaskType = 'water' | 'progress'

/** A row of the due_tasks view: one per plant and task type. */
export type DueTask = {
  plant_id: string
  type: TaskType
  nickname: string
  cover_photo: string | null
  room_id: string
  room_name: string
  tip: string | null
  interval_days: number
  /** Dates are YYYY-MM-DD in the user's time zone. */
  due_on: string
  today: string
  overdue_days: number
  last_done_on: string | null
  done_today_event_id: string | null
}

/** "Dry on top" is a normal watering; wet soil postpones instead. */
export type SoilState = 'dry_top' | 'very_dry'

const taskColumns =
  'plant_id, type, nickname, cover_photo, room_id, room_name, tip, interval_days, due_on, today, overdue_days, last_done_on, done_today_event_id'

export const tasksQuery = () =>
  queryOptions({
    queryKey: tasksKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('due_tasks')
        .select(taskColumns)
        .order('due_on')
        .order('nickname')
      if (error) throw error
      return data as DueTask[]
    },
  })

/** Due today or overdue, plus what was already done today (kept so it can be undone). */
export const isToday = (t: DueTask) => t.due_on <= t.today || !!t.done_today_event_id

function useCareMutation<T>(mutationFn: (input: T) => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: tasksKey }),
        queryClient.invalidateQueries({ queryKey: plantsKey }),
      ]),
  })
}

export function useWater() {
  return useCareMutation(async ({ plantId, soil }: { plantId: string; soil?: SoilState }) => {
    const { error } = await supabase
      .from('care_events')
      .insert({ plant_id: plantId, type: 'water', soil_state: soil ?? null })
    if (error) throw error
  })
}

/** Wet soil: ask again in 1–2 days instead of logging a watering. */
export function usePostpone() {
  return useCareMutation(async ({ plantId, days }: { plantId: string; days: 1 | 2 }) => {
    const { error } = await supabase
      .from('care_events')
      .insert({ plant_id: plantId, type: 'postpone', postpone_days: days })
    if (error) throw error
  })
}

export function useUndo() {
  return useCareMutation(async (eventId: string) => {
    const { error } = await supabase.from('care_events').delete().eq('id', eventId)
    if (error) throw error
  })
}

/** "Overdue by 2 days", "2d late". */
export const overdueLabel = (days: number) => `Overdue by ${days === 1 ? '1 day' : `${days} days`}`
export const lateBadge = (days: number) => `${days}d late`
