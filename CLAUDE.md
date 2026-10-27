# Dewly — context for Claude Code

Plant-care PWA for iPhone (installed via Add to Home Screen). Single user for now, English UI.

## Stack
Vite + React 18 + TypeScript, TanStack Router + Query, Tailwind v4 with Dewly tokens, React Hook Form + Zod, vite-plugin-pwa. Supabase (Auth, Postgres + RLS, Storage, Edge Functions in Deno, pg_cron). Hosting on Cloudflare Pages.

## Rules
- Secrets: only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` in the client. Gemini, Pl@ntNet and VAPID private keys live in Supabase secrets and are used only inside Edge Functions.
- Every table has RLS on, scoped to `auth.uid()`. Schema changes go through `supabase/migrations`.
- Gemini calls use a JSON response schema; validate the result with Zod before saving.
- Colors, type, radius and spacing come from the design tokens (`src/styles/tokens.css`), never raw hex values in components.
- iOS push: ask for notification permission only from a user tap inside the installed PWA.
- Commits follow Conventional Commits (`feat:`, `fix:`, `chore:`). Work in branches, merge through PRs.

## Domain
- Home (hidden, one per user) → rooms → plants. Care events: water (optionally with fertilizer), progress update.
- Soil feedback on watering: wet / dry on top / very dry shifts the next watering by 1–2 days.
- Progress: one photo per update (becomes the cover), health Sick / Struggling / Good / Thriving, problem tags only when Sick or Struggling, optional height.
- Reminders: 1–5 times a day at user-set times (default 09:00, 15:00, 20:00), skipped when nothing is due.

## Commands
- `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`
- `supabase start`, `supabase db reset`, `supabase functions serve`

## Docs
- `docs/requirements.md` — MVP requirements
- `docs/plan.md` — stack, data model, 8 phases
- `docs/design.md` — links to the screens and the design system, palette tokens
- Before building a screen, check its layout on the design canvas linked in `docs/design.md`.
