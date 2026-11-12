// Deletes the signed-in user's account: their photos in storage, their plants, then the user
// (every other table cascades from auth.users). POST { confirm: "DELETE" }.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

import { cors, json } from '../_shared/http.ts'

const BUCKET = 'plant-photos'

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

  const body = (await req.json().catch(() => null)) as { confirm?: string } | null
  if (body?.confirm !== 'DELETE') return json({ error: 'Confirm with DELETE' }, 400)

  // Photos live under <user_id>/ in one flat folder; remove them page by page.
  for (;;) {
    const { data: files, error } = await admin.storage.from(BUCKET).list(user.id, { limit: 1000 })
    if (error) {
      console.error('list photos', error)
      return json({ error: 'Couldn’t delete photos' }, 500)
    }
    if (!files || files.length === 0) break
    const { error: removeError } = await admin.storage
      .from(BUCKET)
      .remove(files.map((f) => `${user.id}/${f.name}`))
    if (removeError) {
      console.error('remove photos', removeError)
      return json({ error: 'Couldn’t delete photos' }, 500)
    }
    if (files.length < 1000) break
  }

  const plants = await admin.rpc('delete_user_plants', { p_user: user.id })
  if (plants.error) {
    console.error('delete plants', plants.error)
    return json({ error: 'Couldn’t delete plants' }, 500)
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('delete user', error)
    return json({ error: 'Couldn’t delete the account' }, 500)
  }

  return json({ deleted: true })
})
