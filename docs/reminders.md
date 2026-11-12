# Reminders setup

Push reminders need a VAPID key pair, a shared secret for the cron job, and the two reminder
migrations. Secrets go into Supabase and Cloudflare only, never into git or chat.

## 1. Keys and secrets

1. Generate a VAPID key pair in the project folder:
   ```
   npx web-push generate-vapid-keys
   ```
2. Make a random string for the cron secret, e.g.:
   ```
   node -e "console.log(crypto.randomUUID())"
   ```
3. Supabase Dashboard → Edge Functions → Secrets:
   - `VAPID_PUBLIC_KEY` — the public key
   - `VAPID_PRIVATE_KEY` — the private key
   - `VAPID_SUBJECT` — `mailto:` + the project email
   - `CRON_SECRET` — the random string
4. The public key also goes to the client as `VITE_VAPID_PUBLIC_KEY`:
   - `.env.local` for `npm run dev`
   - Cloudflare Pages → Settings → Environment variables, for Production and Preview

## 2. Database

1. SQL Editor: store the same cron secret in Vault, so pg_cron can send it:
   ```sql
   select vault.create_secret('<the random string>', 'reminders_cron_secret');
   ```
2. Apply `supabase/migrations/20261113170000_reminders.sql`, then
   `20261113170100_reminders_cron.sql` (it enables `pg_cron` and `pg_net` and schedules the job).

## 3. Function

```
npx supabase functions deploy send-reminders --no-verify-jwt
```

`verify_jwt` is off because pg_cron has no user token; the function checks `CRON_SECRET`, or a
signed-in user for the test push.

## How it works

- Every 15 minutes pg_cron POSTs to `send-reminders` with the `x-cron-secret` header.
- `claim_reminders()` finds users whose reminder time fell in the last 15 minutes (in their time
  zone), records the slot in `reminder_log` so it's sent once, and counts open tasks from
  `due_tasks`. Nothing open, no push.
- A push the service reports gone (404/410) deletes its subscription.
- On iPhone, push reaches only the PWA added to the Home Screen (iOS 16.4+); permission is asked
  from a tap in Profile → Reminders.
