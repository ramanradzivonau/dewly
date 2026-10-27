import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

import type { Light, RoomFormValues, WindowDir } from './options'

export type Room = {
  id: string
  name: string
  light: Light
  window_dir: WindowDir
  winter_min: number
  winter_max: number
  summer_min: number
  summer_max: number
  humidity_min: number
  humidity_max: number
  drafts: boolean
}

/** The few plant fields the room screens show. */
export type RoomPlant = { id: string; nickname: string; cover_photo: string | null }

export type RoomWithPlants = Room & { plants: RoomPlant[] }

const roomColumns =
  'id, name, light, window_dir, winter_min, winter_max, summer_min, summer_max, humidity_min, humidity_max, drafts'
const withPlants = `${roomColumns}, plants (id, nickname, cover_photo)`

export const roomsKey = ['rooms'] as const

export const roomsQuery = () =>
  queryOptions({
    queryKey: roomsKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select(withPlants)
        .order('created_at')
        .order('created_at', { referencedTable: 'plants' })
      if (error) throw error
      return data as RoomWithPlants[]
    },
  })

export const roomQuery = (id: string) =>
  queryOptions({
    queryKey: [...roomsKey, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select(withPlants)
        .eq('id', id)
        .order('created_at', { referencedTable: 'plants' })
        .maybeSingle()
      if (error) throw error
      return data as RoomWithPlants | null
    },
  })

const toRow = (v: RoomFormValues) => ({
  name: v.name,
  light: v.light,
  window_dir: v.window_dir,
  winter_min: v.winter.min,
  winter_max: v.winter.max,
  summer_min: v.summer.min,
  summer_max: v.summer.max,
  humidity_min: v.humidity.min,
  humidity_max: v.humidity.max,
  drafts: v.drafts,
})

export const toFormValues = (r: Room): RoomFormValues => ({
  name: r.name,
  light: r.light,
  window_dir: r.window_dir,
  winter: { min: r.winter_min, max: r.winter_max },
  summer: { min: r.summer_min, max: r.summer_max },
  humidity: { min: r.humidity_min, max: r.humidity_max },
  drafts: r.drafts,
})

export function useCreateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: RoomFormValues) => {
      // The hidden home: one per user, created on sign-up.
      const home = await supabase.from('homes').select('id').single()
      if (home.error) throw home.error
      const { data, error } = await supabase
        .from('rooms')
        .insert({ ...toRow(values), home_id: home.data.id })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomsKey }),
  })
}

export function useUpdateRoom(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: RoomFormValues) => {
      const { error } = await supabase.from('rooms').update(toRow(values)).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomsKey }),
  })
}

/** Deletes the room; with `moveTo`, its plants move there first (one transaction). */
export function useDeleteRoom(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (moveTo: string | null) => {
      const { error } = await supabase.rpc('delete_room', { room: id, move_to: moveTo })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [...roomsKey, id] })
      return queryClient.invalidateQueries({ queryKey: roomsKey })
    },
  })
}
