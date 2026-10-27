import { z } from 'zod'

import type { Choice } from '@/components/ui/ChoiceGroup'

export const potTypes = ['plastic', 'ceramic', 'terracotta', 'other'] as const
export type PotType = (typeof potTypes)[number]
export const potTypeOptions: Choice<PotType>[] = [
  { value: 'plastic', label: 'Plastic' },
  { value: 'ceramic', label: 'Ceramic' },
  { value: 'terracotta', label: 'Terracotta' },
  { value: 'other', label: 'Other' },
]

export const drainages = ['yes', 'no', 'unknown'] as const
export type Drainage = (typeof drainages)[number]
export const drainageOptions: Choice<Drainage>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Not sure' },
]

/** Soil presets; anything else is stored as the user's own text. */
export const soils = ['universal', 'aroid_mix', 'cactus_mix', 'peat', 'unknown'] as const
export type Soil = (typeof soils)[number]
export const soilOptions: Choice<Soil | 'custom'>[] = [
  { value: 'universal', label: 'Universal' },
  { value: 'aroid_mix', label: 'Aroid mix' },
  { value: 'cactus_mix', label: 'Cactus mix' },
  { value: 'peat', label: 'Peat-based' },
  { value: 'unknown', label: 'Not sure' },
  { value: 'custom', label: 'Other' },
]

export const isSoilPreset = (soil: string): soil is Soil =>
  (soils as readonly string[]).includes(soil)

export const soilLabel = (soil: string) =>
  isSoilPreset(soil) ? soilOptions.find((o) => o.value === soil)!.label : soil

export const nears = ['none', 'radiator', 'ac'] as const
export type Near = (typeof nears)[number]
export const nearOptions: Choice<Near>[] = [
  { value: 'none', label: 'Nothing' },
  { value: 'radiator', label: 'Radiator' },
  { value: 'ac', label: 'Air conditioner' },
]

/**
 * "6–12 months ago" style picks, stored as an approximate date (the middle of the span)
 * so the age keeps counting. A date maps back to its span, so re-saving doesn't drift.
 */
type Span = { value: string; label: string; months: number; upTo: number }

export const repotSpans: Span[] = [
  { value: 'lt6m', label: 'Less than 6 months', months: 3, upTo: 6 },
  { value: '6_12m', label: '6–12 months ago', months: 9, upTo: 12 },
  { value: '1_2y', label: '1–2 years ago', months: 18, upTo: 24 },
]
export const REPOT_UNKNOWN = { value: 'unknown', label: 'Longer / not sure' }

export const ageSpans: Span[] = [
  { value: 'lt6m', label: 'Under 6 months', months: 3, upTo: 6 },
  { value: '6_12m', label: '6–12 months', months: 9, upTo: 12 },
  { value: '1_3y', label: '1–3 years', months: 24, upTo: 36 },
  { value: 'gt3y', label: 'Over 3 years', months: 48, upTo: Infinity },
]

const monthsSince = (date: string) => {
  const then = new Date(date)
  const now = new Date()
  return (now.getFullYear() - then.getFullYear()) * 12 + now.getMonth() - then.getMonth()
}

export const spanOf = (spans: Span[], date: string | null) =>
  date ? spans.find((s) => monthsSince(date) < s.upTo)?.value : undefined

export const dateOf = (spans: Span[], value: string) => {
  const span = spans.find((s) => s.value === value)
  if (!span) return null
  const d = new Date()
  d.setMonth(d.getMonth() - span.months)
  return d.toISOString().slice(0, 10)
}

/** "~3 years", "8 months". */
export const ageLabel = (bornOn: string) => {
  const months = Math.max(0, monthsSince(bornOn))
  if (months < 12) return months === 1 ? '1 month' : `${months} months`
  const years = Math.round(months / 12)
  return `~${years} ${years === 1 ? 'year' : 'years'}`
}

const int = (min: number, max: number, message: string) =>
  z.number({ error: message }).int(message).min(min, message).max(max, message)

const optionalInt = (min: number, max: number, message: string) => int(min, max, message).nullable()

export const plantSchema = z
  .object({
    nickname: z
      .string()
      .trim()
      .min(1, 'Give the plant a name')
      .max(60, 'Keep it under 60 characters'),
    room_id: z.string({ error: 'Pick a room' }).min(1, 'Pick a room'),
    pot_type: z.enum(potTypes),
    pot_diameter_cm: optionalInt(1, 150, 'Between 1 and 150 cm'),
    drainage: z.enum(drainages),
    soil: z.enum([...soils, 'custom']),
    soil_custom: z.string().trim().max(60, 'Keep it under 60 characters'),
    repotted_on: z.string().nullable(),
    born_on: z.string().nullable(),
    height_cm: optionalInt(1, 1000, 'Between 1 and 1000 cm'),
    near: z.enum(nears),
    grow_light: z.boolean(),
    grow_light_hours: int(1, 24, 'Between 1 and 24 hours'),
    water_days_warm: int(1, 90, 'Between 1 and 90 days'),
    water_days_cold: int(1, 90, 'Between 1 and 90 days'),
    progress_days: int(7, 180, 'Between 7 and 180 days'),
    tip: z.string().trim().max(200, 'Keep it under 200 characters'),
  })
  .refine((v) => v.soil !== 'custom' || v.soil_custom.length > 0, {
    error: 'Describe the soil',
    path: ['soil_custom'],
  })

export type PlantFormValues = z.infer<typeof plantSchema>

export const plantDefaults: PlantFormValues = {
  nickname: '',
  room_id: '',
  pot_type: 'plastic',
  pot_diameter_cm: null,
  drainage: 'yes',
  soil: 'universal',
  soil_custom: '',
  repotted_on: null,
  born_on: null,
  height_cm: null,
  near: 'none',
  grow_light: false,
  grow_light_hours: 8,
  water_days_warm: 7,
  water_days_cold: 10,
  progress_days: 30,
  tip: '',
}
