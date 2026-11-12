// What Gemini must return. The JSON schema sent to Gemini is generated from this, and the
// answer is parsed with it before anything is saved.

import { z } from 'npm:zod@4.6.7'

const toxicity = z.enum(['toxic', 'non_toxic', 'unknown'])
const month = z.number().int().min(1).max(12)

export const Recommendation = z.object({
  water_days_warm: z.number().int().min(1).max(60).describe('Days between waterings, warm season'),
  water_days_cold: z.number().int().min(1).max(90).describe('Days between waterings, cold season'),
  progress_days: z
    .number()
    .int()
    .min(7)
    .max(180)
    .describe(
      'Days between progress photos: 14-28 for fast growers, 60-90 for cacti and slow ones',
    ),
  tip: z
    .string()
    .max(120)
    .describe('When to water, without a volume, e.g. "Water when the top 3 cm are dry"'),
  explanation: z
    .string()
    .max(300)
    .describe(
      'One or two sentences on what drives the schedule, e.g. "Bright room and a radiator nearby dry the soil faster."',
    ),
  fertilizer: z.object({
    mode: z.enum(['every_n_waterings', 'every_n_weeks']),
    n: z.number().int().min(1).max(12),
    months: z.array(month).min(1).max(12).describe('Active feeding months, 1-12'),
  }),
  care_info: z.object({
    light: z.string().max(160),
    watering: z.string().max(160),
    soil: z.string().max(160),
    humidity: z.string().max(160),
    temperature: z.string().max(160),
    growth_rate: z.enum(['slow', 'medium', 'fast']),
    recommended_soil: z.enum(['universal', 'aroid_mix', 'cactus_mix', 'peat']),
    pot_diameter_cm: z.object({
      min: z.number().int().min(5).max(100),
      max: z.number().int().min(5).max(120),
    }),
    toxicity: z.object({
      cats: toxicity,
      dogs: toxicity,
      note: z.string().max(160),
    }),
  }),
})

export type Recommendation = z.infer<typeof Recommendation>

/** JSON Schema for Gemini's responseJsonSchema; the $schema key is not part of its subset. */
export function recommendationJsonSchema() {
  const schema = { ...(z.toJSONSchema(Recommendation) as Record<string, unknown>) }
  delete schema.$schema
  return schema
}
