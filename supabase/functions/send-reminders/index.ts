// Reminder digests over Web Push.
//
// Called by pg_cron every 15 minutes with the x-cron-secret header: finds users whose reminder
// time just came (claim_reminders), and sends each one a summary of what's still open today.
// Nothing open, no push. A signed-in user can also POST { test: true } to get a test push.
//
// verify_jwt is off for this function (cron has no user JWT); both paths authenticate here.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import webpush from 'npm:web-push@3.6.7'

import { cors, json } from '../_shared/http.ts'

type Digest = {
  user_id: string
  water: number
  with_fertilizer: number
  fertilize: number
  progress: number
  late: number
}

type Subscription = { id: string; endpoint: string; p256dh: string; auth: string }

const plants = (n: number) => (n === 1 ? '1 plant' : `${n} plants`)

/** "4 plants need water today (1 with fertilizer). 2 are late." */
function summary(d: Digest) {
  const parts: string[] = []
  if (d.water > 0) {
    const fed = d.with_fertilizer > 0 ? ` (${d.with_fertilizer} with fertilizer)` : ''
    parts.push(`${plants(d.water)} ${d.water === 1 ? 'needs' : 'need'} water today${fed}.`)
  }
  if (d.fertilize > 0) {
    parts.push(`${plants(d.fertilize)} ${d.fertilize === 1 ? 'needs' : 'need'} fertilizer.`)
  }
  if (d.progress > 0) parts.push(`${d.progress} progress update${d.progress === 1 ? '' : 's'} due.`)
  if (d.late > 0) parts.push(`${d.late} ${d.late === 1 ? 'is' : 'are'} late.`)
  return parts.join(' ')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT')
  if (!publicKey || !privateKey || !subject) return json({ error: 'Push is not set up' }, 500)
  webpush.setVapidDetails(subject, publicKey, privateKey)

  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const subscriptionsOf = async (userId: string) => {
    const { data } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)
    return (data ?? []) as Subscription[]
  }

  /** Sends to every device; a subscription the push service says is gone (404/410) is dropped. */
  const send = async (userId: string, payload: { title: string; body: string; url: string }) => {
    let sent = 0
    for (const s of await subscriptionsOf(userId)) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 },
        )
        sent++
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('id', s.id)
        } else {
          console.error('push', status, e instanceof Error ? e.message : e)
        }
      }
    }
    return sent
  }

  // Cron: the shared secret.
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && req.headers.get('x-cron-secret') === cronSecret) {
    const { data, error } = await admin.rpc('claim_reminders', { window_minutes: 15 })
    if (error) {
      console.error('claim_reminders', error)
      return json({ error: error.message }, 500)
    }
    let sent = 0
    for (const digest of (data ?? []) as Digest[]) {
      const body = summary(digest)
      if (body) sent += await send(digest.user_id, { title: 'Dewly', body, url: '/today' })
    }
    await admin.rpc('prune_reminder_log')
    return json({ users: (data ?? []).length, sent })
  }

  // A signed-in user asking for a test push to their own devices.
  const authorization = req.headers.get('Authorization')
  if (authorization) {
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    })
    const {
      data: { user },
    } = await asUser.auth.getUser()
    const body = (await req.json().catch(() => null)) as { test?: boolean } | null
    if (user && body?.test) {
      const sent = await send(user.id, {
        title: 'Dewly',
        body: 'Reminders are on. You’ll get a summary at your reminder times.',
        url: '/today',
      })
      return json({ sent })
    }
  }

  return json({ error: 'Not allowed' }, 401)
})
