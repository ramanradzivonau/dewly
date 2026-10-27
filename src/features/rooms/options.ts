import { z } from 'zod'

export const lights = ['shade', 'indirect', 'bright_indirect', 'direct'] as const
export type Light = (typeof lights)[number]

export const lightLabels: Record<Light, { label: string; hint: string }> = {
  shade: { label: 'Shade', hint: 'Far from windows' },
  indirect: { label: 'Indirect', hint: 'Some light, no sun' },
  bright_indirect: { label: 'Bright indirect', hint: 'Near a window' },
  direct: { label: 'Direct sun', hint: 'Sun on the sill' },
}

export const windowDirs = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw', 'none'] as const
export type WindowDir = (typeof windowDirs)[number]

export const windowLabel = (dir: WindowDir) => (dir === 'none' ? 'None' : dir.toUpperCase())

export const roomNameSuggestions = [
  'Living room',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Hallway',
  'Office',
]

const range = (label: string, min: number, max: number) => {
  const between = `Between ${min} and ${max}`
  return z
    .object({
      min: z
        .number({ error: `Enter the ${label} range` })
        .int()
        .min(min, between)
        .max(max, between),
      max: z
        .number({ error: `Enter the ${label} range` })
        .int()
        .min(min, between)
        .max(max, between),
    })
    .refine((r) => r.min <= r.max, { error: 'Minimum is above maximum', path: ['max'] })
}

export const roomSchema = z.object({
  name: z.string().trim().min(1, 'Give the room a name').max(40, 'Keep it under 40 characters'),
  light: z.enum(lights),
  window_dir: z.enum(windowDirs),
  winter: range('winter temperature', -10, 45),
  summer: range('summer temperature', -10, 45),
  humidity: range('humidity', 0, 100),
  drafts: z.boolean(),
})

export type RoomFormValues = z.infer<typeof roomSchema>

/** Typical apartment values; the user adjusts them. */
export const roomDefaults: RoomFormValues = {
  name: '',
  light: 'indirect',
  window_dir: 'none',
  winter: { min: 18, max: 21 },
  summer: { min: 23, max: 27 },
  humidity: { min: 40, max: 55 },
  drafts: false,
}
