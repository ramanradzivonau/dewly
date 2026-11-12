// Care recommendation from Gemini: watering, progress interval, a feeding plan and species care
// info, from the species, the plant, its room and the local weather.
//
// POST { plant_id, force? }  computes for a saved plant and writes its schedule (source 'ai'),
//                            unless the schedule is custom and `force` isn't set.
// POST { draft }             computes for a plant that isn't saved yet (Add plant, step 5).
//
// Reads go through the caller's JWT, so RLS decides what they can ask about; writes use the
// service role. Answers are cached by their inputs. No name or email ever goes to Gemini.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { z } from 'npm:zod@4.6.7'

import { cors, json } from '../_shared/http.ts'
import { Recommendation, recommendationJsonSchema } from './schema.ts'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
// Google's aliases for the current models. Flash-Lite answers a schedule quickly even under
// load; Flash is the backup. The client waits 60 s, so both attempts fit inside it.
const DEFAULT_MODEL = 'gemini-flash-lite-latest'
const FALLBACK_MODEL = 'gemini-flash-latest'
const WEATHER_TIMEOUT_MS = 8_000

const Draft = z.object({
  room_id: z.uuid(),
  species: z
    .object({ scientific_name: z.string().max(120), common_name: z.string().max(120).nullable() })
    .nullable(),
  pot_type: z.enum(['plastic', 'ceramic', 'terracotta', 'other']),
  pot_diameter_cm: z.number().int().nullable(),
  drainage: z.enum(['yes', 'no', 'unknown']),
  soil: z.string().max(60),
  repotted_on: z.string().nullable(),
  height_cm: z.number().int().nullable(),
  born_on: z.string().nullable(),
  near: z.enum(['none', 'radiator', 'ac']),
  grow_light_hours: z.number().int().nullable(),
})
type Draft = z.infer<typeof Draft>

const Body = z.union([
  z.object({ plant_id: z.uuid(), force: z.boolean().optional() }),
  z.object({ draft: Draft }),
])

const roomColumns =
  'light, window_dir, winter_min, winter_max, summer_min, summer_max, humidity_min, humidity_max, drafts'

type Room = {
  light: string
  window_dir: string
  winter_min: number
  winter_max: number
  summer_min: number
  summer_max: number
  humidity_min: number
  humidity_max: number
  drafts: boolean
}

const monthsSince = (date: string | null) => {
  if (!date) return null
  const then = new Date(date)
  const now = new Date()
  return (now.getFullYear() - then.getFullYear()) * 12 + now.getMonth() - then.getMonth()
}

/** Average temperature and day length for the next week at the user's city (Open-Meteo, no key). */
async function weather(lat: number | null, lon: number | null) {
  if (lat == null || lon == null) return null
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat.toFixed(2))
  url.searchParams.set('longitude', lon.toFixed(2))
  url.searchParams.set('daily', 'temperature_2m_mean,daylight_duration')
  url.searchParams.set('forecast_days', '7')
  url.searchParams.set('timezone', 'auto')
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(WEATHER_TIMEOUT_MS) })
    if (!res.ok) return null
    const data = (await res.json()) as {
      daily?: { temperature_2m_mean?: number[]; daylight_duration?: number[] }
    }
    const avg = (xs: number[] = []) =>
      xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
    const temp = avg(data.daily?.temperature_2m_mean)
    const daylight = avg(data.daily?.daylight_duration)
    return {
      // Rounded, so the cache key holds for a while.
      outdoor_avg_c: temp == null ? null : Math.round(temp),
      daylight_hours: daylight == null ? null : Math.round(daylight / 1800) / 2,
    }
  } catch {
    return null
  }
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const SYSTEM = `You are an experienced houseplant care advisor.
Given one indoor plant, its pot and spot, the room and the local season, recommend a care schedule.
Be conservative: overwatering kills more houseplants than underwatering.
Watering intervals are for a full soak until water drains from the bottom, never a volume.
Account for light, pot material and size, drainage, soil, radiators or AC, drafts, humidity,
room temperatures, outdoor temperature and day length.
If the species is unknown, give safe general advice and say so in the explanation.
Write in plain English for a home gardener.`

/** 503 (overloaded) and 429 (rate limit) pass; anything else won't fix itself by retrying. */
const RETRYABLE = new Set([429, 500, 503])
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function askGemini(input: unknown) {
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  const model = Deno.env.get('GEMINI_MODEL') ?? DEFAULT_MODEL
  const fallback = Deno.env.get('GEMINI_FALLBACK_MODEL') ?? FALLBACK_MODEL

  // A slow or busy model gets one chance; then the other one.
  const attempts = [
    { model, delay: 0, timeout: 20_000 },
    { model: fallback, delay: 1_000, timeout: 30_000 },
  ]
  let lastStatus = 0
  for (const attempt of attempts) {
    await sleep(attempt.delay)
    let res: Response
    try {
      res = await fetch(`${GEMINI_URL}/${attempt.model}:generateContent`, {
        method: 'POST',
        signal: AbortSignal.timeout(attempt.timeout),
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: recommendationJsonSchema(),
            temperature: 0.2,
          },
        }),
      })
    } catch (e) {
      // Timed out or the network dropped: try the next model.
      console.error('Gemini', attempt.model, e instanceof Error ? e.name : e)
      continue
    }
    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
      return Recommendation.parse(JSON.parse(text))
    }
    lastStatus = res.status
    console.error('Gemini', attempt.model, res.status, await res.text())
    if (!RETRYABLE.has(res.status)) break
  }
  throw new Error(lastStatus === 429 ? 'rate_limited' : 'gemini_failed')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = req.headers.get('Authorization')
  if (!authorization) return json({ error: 'Sign in first' }, 401)

  const url = Deno.env.get('SUPABASE_URL')!
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const {
    data: { user },
  } = await asUser.auth.getUser()
  if (!user) return json({ error: 'Sign in first' }, 401)

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'Send { plant_id } or { draft }' }, 400)
  const body = parsed.data

  // Gather the plant (saved or draft) and its room, through RLS.
  let plant: Draft
  let room: Room
  let saved: { id: string; species_id: string | null; source: string | null } | null = null
  if ('plant_id' in body) {
    const { data, error } = await asUser
      .from('plants')
      .select(
        `id, species_id, pot_type, pot_diameter_cm, drainage, soil, repotted_on, height_cm, born_on, near, grow_light_hours, room_id,
         room:rooms (${roomColumns}), species (scientific_name, common_name), schedule:care_schedules (source)`,
      )
      .eq('id', body.plant_id)
      .maybeSingle()
    if (error) {
      console.error('read plant', error)
      return json({ error: error.message }, 500)
    }
    if (!data) return json({ error: 'Plant not found' }, 404)
    const row = data as unknown as Draft & {
      id: string
      species_id: string | null
      room: Room
      schedule: { source: string } | { source: string }[] | null
    }
    const schedule = Array.isArray(row.schedule) ? row.schedule[0] : row.schedule
    plant = row
    room = row.room
    saved = { id: row.id, species_id: row.species_id, source: schedule?.source ?? null }
  } else {
    plant = body.draft
    const { data, error } = await asUser
      .from('rooms')
      .select(roomColumns)
      .eq('id', plant.room_id)
      .maybeSingle()
    if (error) {
      console.error('read room', error)
      return json({ error: error.message }, 500)
    }
    if (!data) return json({ error: 'Room not found' }, 404)
    room = data as Room
  }

  const { data: profile } = await asUser
    .from('profiles')
    .select('lat, lon')
    .eq('id', user.id)
    .maybeSingle()
  const now = new Date()
  const conditions = {
    month: now.getUTCMonth() + 1,
    hemisphere: (profile?.lat ?? 0) >= 0 ? 'north' : 'south',
    ...(await weather(profile?.lat ?? null, profile?.lon ?? null)),
  }

  // Only what matters for care: no names, no email, no city.
  const input = {
    species: plant.species,
    pot: {
      material: plant.pot_type,
      diameter_cm: plant.pot_diameter_cm,
      drainage_holes: plant.drainage,
      soil: plant.soil,
      months_since_repotting: monthsSince(plant.repotted_on),
    },
    plant: {
      height_cm: plant.height_cm,
      age_months: monthsSince(plant.born_on),
      near: plant.near,
      grow_light_hours_per_day: plant.grow_light_hours,
    },
    room,
    conditions,
  }

  const hash = await sha256(JSON.stringify(input))
  let recommendation: Recommendation | null = null
  const cached = await admin
    .from('recommendation_cache')
    .select('response')
    .eq('user_id', user.id)
    .eq('input_hash', hash)
    .maybeSingle()
  if (cached.data) recommendation = Recommendation.safeParse(cached.data.response).data ?? null

  if (!recommendation) {
    try {
      recommendation = await askGemini(input)
    } catch (e) {
      const limited = e instanceof Error && e.message === 'rate_limited'
      console.error('recommend', e)
      return json(
        { error: limited ? 'AI limit reached, try again later' : 'Couldn’t get a recommendation' },
        limited ? 429 : 502,
      )
    }
    await admin
      .from('recommendation_cache')
      .upsert({ user_id: user.id, input_hash: hash, response: recommendation })
  }

  let applied = false
  if (saved && (saved.source !== 'custom' || ('force' in body && body.force))) {
    const schedule = {
      water_days_warm: recommendation.water_days_warm,
      water_days_cold: recommendation.water_days_cold,
      progress_days: recommendation.progress_days,
      tip: recommendation.tip,
      explanation: recommendation.explanation,
      source: 'ai',
      computed_at: now.toISOString(),
    }
    const write = saved.source
      ? await admin.from('care_schedules').update(schedule).eq('plant_id', saved.id)
      : await admin
          .from('care_schedules')
          .insert({ ...schedule, plant_id: saved.id, user_id: user.id })
    if (write.error) {
      console.error('write schedule', write.error)
      return json({ error: write.error.message }, 500)
    }
    applied = true
  }
  if (saved?.species_id) {
    await admin
      .from('species')
      .update({ care_info: recommendation.care_info, care_info_at: now.toISOString() })
      .eq('id', saved.species_id)
  }

  return json({ recommendation, conditions, applied })
})
