import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { tasksKey } from '@/features/care/keys'
import type { FertilizerType } from '@/features/fertilizers/api'
import { roomColumns, roomsKey, type Room } from '@/features/rooms/api'
import { saveSpecies, type SpeciesPick } from '@/features/species/api'
import { supabase } from '@/lib/supabase'

import {
  isSoilPreset,
  plantDefaults,
  type Drainage,
  type FertMode,
  type Near,
  type PlantFormValues,
  type PotType,
} from './options'
import { removePhotos, uploadPhoto } from './photos'

export type CareSchedule = {
  water_days_warm: number
  water_days_cold: number
  tip: string | null
  progress_days: number
  source: 'ai' | 'custom'
  explanation: string | null
  computed_at: string | null
  fertilizer_id: string | null
  fert_mode: FertMode | null
  fert_n: number | null
  fert_months: number[]
  fert_dose: number | null
  fertilizer: { id: string; name: string; type: FertilizerType; dose: number } | null
}

export type Plant = {
  id: string
  room_id: string
  species_id: string | null
  nickname: string
  cover_photo: string | null
  pot_type: PotType
  pot_diameter_cm: number | null
  drainage: Drainage
  soil: string
  repotted_on: string | null
  height_cm: number | null
  born_on: string | null
  near: Near
  grow_light_hours: number | null
  room: Room
  schedule: CareSchedule | null
  species: {
    scientific_name: string
    common_name: string | null
    /** From Gemini, unchecked JSON; parse with careInfoSchema before use. */
    care_info: unknown
  } | null
}

const plantColumns =
  'id, room_id, species_id, nickname, cover_photo, pot_type, pot_diameter_cm, drainage, soil, repotted_on, height_cm, born_on, near, grow_light_hours'
const scheduleColumns =
  'water_days_warm, water_days_cold, tip, progress_days, source, explanation, computed_at, fertilizer_id, fert_mode, fert_n, fert_months, fert_dose, fertilizer:fertilizers (id, name, type, dose)'

export const plantsKey = ['plants'] as const

type PlantRow = Omit<Plant, 'schedule'> & { schedule: CareSchedule | CareSchedule[] | null }

export const plantQuery = (id: string) =>
  queryOptions({
    queryKey: [...plantsKey, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plants')
        .select(
          `${plantColumns}, room:rooms (${roomColumns}), schedule:care_schedules (${scheduleColumns}), species (scientific_name, common_name, care_info)`,
        )
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      const row = data as unknown as PlantRow
      // The schedule's foreign key is composite, so PostgREST may return it as a list.
      const schedule = Array.isArray(row.schedule) ? (row.schedule[0] ?? null) : row.schedule
      return { ...row, schedule } as Plant
    },
  })

const toPlantRow = (v: PlantFormValues) => ({
  room_id: v.room_id,
  nickname: v.nickname,
  pot_type: v.pot_type,
  pot_diameter_cm: v.pot_diameter_cm,
  drainage: v.drainage,
  soil: v.soil === 'custom' ? v.soil_custom : v.soil,
  repotted_on: v.repotted_on,
  height_cm: v.height_cm,
  born_on: v.born_on,
  near: v.near,
  grow_light_hours: v.grow_light ? v.grow_light_hours : null,
})

const toScheduleRow = (v: PlantFormValues) => ({
  water_days_warm: v.water_days_warm,
  water_days_cold: v.water_days_cold,
  progress_days: v.progress_days,
  tip: v.tip || null,
  fertilizer_id: v.fertilizer_id || null,
  fert_mode: v.fertilizer_id ? v.fert_mode : null,
  fert_n: v.fertilizer_id ? v.fert_n : null,
  fert_months: v.fert_months,
  fert_dose: v.fertilizer_id ? v.fert_dose : null,
})

export const toFormValues = (p: Plant): PlantFormValues => ({
  nickname: p.nickname,
  room_id: p.room_id,
  pot_type: p.pot_type,
  pot_diameter_cm: p.pot_diameter_cm,
  drainage: p.drainage,
  soil: isSoilPreset(p.soil) ? p.soil : 'custom',
  soil_custom: isSoilPreset(p.soil) ? '' : p.soil,
  repotted_on: p.repotted_on,
  born_on: p.born_on,
  height_cm: p.height_cm,
  near: p.near,
  grow_light: p.grow_light_hours != null,
  grow_light_hours: p.grow_light_hours ?? 8,
  water_days_warm: p.schedule?.water_days_warm ?? 7,
  water_days_cold: p.schedule?.water_days_cold ?? 10,
  progress_days: p.schedule?.progress_days ?? 30,
  tip: p.schedule?.tip ?? '',
  fertilizer_id: p.schedule?.fertilizer_id ?? '',
  fert_mode: p.schedule?.fert_mode ?? plantDefaults.fert_mode,
  fert_n: p.schedule?.fert_n ?? plantDefaults.fert_n,
  fert_months: p.schedule?.fert_months ?? plantDefaults.fert_months,
  fert_dose: p.schedule?.fert_dose ?? null,
})

type SaveInput = { values: PlantFormValues; photo: Blob | null }

/** How long ago the plant was last watered, when known; logged so the first task lands right. */
/** `species`: a newly picked one, or null to keep the current. */
type UpdateInput = SaveInput & { species: SpeciesPick | null }

type CreateInput = SaveInput & {
  lastWateredDaysAgo: number | null
  /** Picked in the first step; saved before the plant. */
  species: SpeciesPick | null
}

export function useCreatePlant(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ values, photo, lastWateredDaysAgo, species }: CreateInput) => {
      const species_id = species ? await saveSpecies(species) : null
      const cover_photo = photo ? await uploadPhoto(userId, photo) : null
      const { data, error } = await supabase
        .from('plants')
        .insert({ ...toPlantRow(values), cover_photo, species_id })
        .select('id')
        .single()
      if (error) {
        if (cover_photo) await removePhotos([cover_photo])
        throw error
      }
      const schedule = await supabase
        .from('care_schedules')
        .insert({ plant_id: data.id, ...toScheduleRow(values) })
      if (schedule.error) {
        // Keep the two writes together: no plant without a schedule.
        await supabase.from('plants').delete().eq('id', data.id)
        if (cover_photo) await removePhotos([cover_photo])
        throw schedule.error
      }
      if (lastWateredDaysAgo != null) {
        const at = new Date(Date.now() - lastWateredDaysAgo * 86_400_000).toISOString()
        // Best effort: without it the first watering is simply due today.
        await supabase.from('care_events').insert({ plant_id: data.id, type: 'water', at })
      }
      return data
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: roomsKey }),
        queryClient.invalidateQueries({ queryKey: tasksKey }),
      ]),
  })
}

export function useUpdatePlant(userId: string, plant: Plant) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ values, photo, species }: UpdateInput) => {
      const species_id = species ? await saveSpecies(species) : plant.species_id
      const cover_photo = photo ? await uploadPhoto(userId, photo) : plant.cover_photo
      const { error } = await supabase
        .from('plants')
        .update({ ...toPlantRow(values), cover_photo, species_id })
        .eq('id', plant.id)
      if (error) {
        if (photo && cover_photo) await removePhotos([cover_photo])
        throw error
      }
      if (photo && plant.cover_photo && !(await usedByProgress(plant.cover_photo))) {
        await removePhotos([plant.cover_photo])
      }

      const schedule = plant.schedule
        ? await supabase
            .from('care_schedules')
            .update(toScheduleRow(values))
            .eq('plant_id', plant.id)
        : await supabase
            .from('care_schedules')
            .insert({ plant_id: plant.id, ...toScheduleRow(values) })
      if (schedule.error) throw schedule.error
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [...plantsKey, plant.id] }),
        queryClient.invalidateQueries({ queryKey: tasksKey }),
        queryClient.invalidateQueries({ queryKey: roomsKey }),
      ]),
  })
}

export function useDeletePlant(plant: Plant) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      // Progress photos go with the plant; collect them before the rows cascade away.
      const entries = await supabase
        .from('progress_entries')
        .select('photo_path')
        .eq('plant_id', plant.id)
      const { error } = await supabase.from('plants').delete().eq('id', plant.id)
      if (error) throw error
      const paths = new Set(
        (entries.data ?? []).flatMap((e) => (e.photo_path ? [e.photo_path as string] : [])),
      )
      if (plant.cover_photo) paths.add(plant.cover_photo)
      await removePhotos([...paths])
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [...plantsKey, plant.id] })
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: roomsKey }),
        queryClient.invalidateQueries({ queryKey: tasksKey }),
      ])
    },
  })
}

/** A cover that came from a progress entry stays in storage with that entry. */
async function usedByProgress(path: string) {
  const { count } = await supabase
    .from('progress_entries')
    .select('id', { count: 'exact', head: true })
    .eq('photo_path', path)
  return (count ?? 0) > 0
}
