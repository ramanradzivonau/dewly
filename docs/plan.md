# Dewly — MVP implementation plan

> English translation of the Claude Docs plan, as of 2026-10-27. Source: https://claude.ai/artifact/8r5wV7eDBqRB2qyNdX7RFg

## Stack

The client is React + TypeScript on Vite as a PWA, and the backend is entirely Supabase. Everything fits in free tiers; the new parts to learn are TanStack Router/Query, Tailwind v4 and the Supabase server side.

| Layer | Choice | Why |
| --- | --- | --- |
| Build | Vite + React 18 + TypeScript | Familiar React, fast dev server |
| PWA | vite-plugin-pwa (Workbox) | Manifest, service worker, offline cache, receiving Web Push |
| Routing | TanStack Router | Typed routes, tabs and nested screens |
| Data | TanStack Query + supabase-js | Caching, optimistic "watered" check-offs |
| Styles | Tailwind CSS v4, Dewly design-system tokens as CSS variables | One source for colors and spacing |
| Forms | React Hook Form + Zod | Add-plant steps, validation |
| Backend | Supabase: Auth (email + password, OTP, Google), Postgres + RLS, Storage, Edge Functions, pg_cron | Everything in one free project |
| AI | Gemini API (structured JSON) from an Edge Function | The key never reaches the client |
| Plants | Pl@ntNet (by photo), iNaturalist (search by name) | Free |
| Weather | Open-Meteo; day length computed locally (suncalc) | No key |
| Hosting | Cloudflare Pages (or Vercel) | Free HTTPS, required for PWA and push |

## Architecture

The phone talks only to Supabase. All external API keys live in Edge Functions, and reminders are sent by a scheduled job.

```
iPhone PWA ──► Supabase (Auth · Postgres · Storage)
     ▲              │
     │         Edge Functions ──► Gemini · Pl@ntNet · iNaturalist · Open-Meteo
     └── Web Push ◄─ send-reminders (pg_cron)
```

The client reads and writes data directly through supabase-js (access is enforced by Row Level Security). Anything that needs secrets or computes a schedule goes through Edge Functions:

- `identify` — photo → Pl@ntNet, text → iNaturalist.
- `recommend` — gathers plant, room and weather data, calls Gemini with a JSON schema, and saves the schedule, hints and care info. Cached by species + conditions.
- `weather` — once a month refreshes the average temperature for the city and triggers a recalculation.
- `send-reminders` — hourly from pg_cron: finds users whose reminder time is now and who have open tasks, and sends Web Push.

## Data model

Ten Postgres tables. Each has a `user_id` (or a link to one) and an RLS policy "you see only your own rows".

| Table | Key fields |
| --- | --- |
| `profiles` | display_name, city, lat, lon, units, reminder_times (array of "HH:MM"), timezone |
| `homes` | user_id, name — one hidden row, created by a trigger on sign-up |
| `rooms` | home_id, name, light, window_dir, winter_min/max, summer_min/max, humidity_min/max, drafts |
| `species` | source (plantnet / inaturalist), external_id, scientific_name, common_name, image_url, care_info (jsonb, AI cache), toxicity |
| `plants` | room_id, species_id, nickname, cover_photo, soil, pot_type, pot_diameter, drainage, last_repotted, height_cm, age_months, near (none / radiator / ac), grow_light_hours |
| `care_schedules` | plant_id, water_days_warm, water_days_cold, tip, fert_mode (every_n_waterings / every_n_weeks), fert_n, fert_months, fertilizer_id, progress_days, source (ai / custom), explanation, computed_at |
| `fertilizers` | user_id, name, type (liquid / granules / sticks), dose, dose_unit |
| `care_events` | plant_id, type (water / fertilize / postpone / progress), at, soil_state, with_fertilizer, postpone_days |
| `progress_entries` | plant_id, at, photo_path, health, height_cm, tags[], note |
| `push_subscriptions` | user_id, endpoint, p256dh, auth, created_at |

Tasks for Today and Upcoming are not stored: they are derived from `care_schedules` + the latest event in `care_events` (SQL view `due_tasks`). That gives "overdue by N days" and postponements for free. Photos go to the Storage bucket `plant-photos/<user_id>/…`, resized on the client to ~1600 px.

## Phases

Eight phases, each ending with a working build on the phone. Daily needs come first (plants and watering); AI and push come later.

1. **Shell.** Vite + React + TS, Tailwind with Dewly tokens, TanStack Router (Today / My Plants / Profile tabs), vite-plugin-pwa, deploy to Cloudflare Pages. _Done when:_ the empty app installs on iPhone via Add to Home Screen.
2. **Account.** Supabase project, sign-up with an OTP code, sign-in, Google, city picker (Open-Meteo geocoding for autocomplete), email template. _Done when:_ you can sign up and land on an empty Today.
3. **Rooms and plants by hand.** DB schema and RLS, My Plants, Room, create/edit room, add-plant steps 2–4, photo upload, Edit plant. Schedules are entered manually for now. _Done when:_ all your plants are in.
4. **Daily care.** `due_tasks` view, Today and Upcoming (list + calendar), Task detail with soil state and postponing, fertilizers in Profile, care history. _Done when:_ you can drop Planta.
5. **Progress.** Update progress form, History · Progress feed, cover from the latest photo, progress tasks on an interval. _Done when:_ the first entry is in the history.
6. **AI.** Step 1 (Pl@ntNet + iNaturalist), `recommend` Edge Function with Gemini, step 5 with the suggested schedule, Care info, "Schedule is based on", Recalculate, interval tuning from "Wet / Very dry" answers, recalculation when the month changes. _Done when:_ a new plant gets a schedule without manual input.
7. **Reminders.** VAPID keys, subscription in Profile · Reminders, `send-reminders` from pg_cron, handling notification taps. _Done when:_ push arrives on iPhone at 09:00, 15:00 and 20:00.
8. **Polish.** Empty states, offline task cache, network errors, icon and splash, account deletion, email/password change, linking Google.

## First evening

Goal for the first evening: phase 1 and the start of phase 2 — an empty Dewly on iPhone and working sign-in.

**Before starting (10 minutes, all free):**

- [ ] Project email, then a public `dewly` repository on your personal GitHub
- [ ] Supabase account on the project email, project in Frankfurt (eu-central-1)
- [ ] Cloudflare account for Pages
- [ ] Node.js 22.12+ on your computer (the plan originally said 20+; current Vite and PWA tooling need 22.12+)
- [ ] Gemini and Pl@ntNet keys can wait until phase 6

**Work:**

- [ ] Create the Vite project (React + TS), add Tailwind v4 and the Manrope font
- [ ] Move Dewly tokens (colors, radii, spacing) into CSS variables and the Tailwind theme
- [ ] TanStack Router: three tabs and floating navigation (NavBar component)
- [ ] vite-plugin-pwa: manifest, icons from the Dewly logo, `display: standalone`
- [ ] Deploy to Cloudflare Pages from GitHub and install on iPhone
- [ ] Supabase Auth: email + password with a 6-digit code, custom email template
- [ ] Log in, Sign up, Verify email screens

It's easiest to work in Claude Code right in the repo, with the requirements and design-system tokens there as context.

## Accounts and email

Create a separate project email (for example, a Gmail `dewly.app@…`) and register infrastructure services on it; keep GitHub personal so the project counts toward your portfolio.

| Service | Which email | Why |
| --- | --- | --- |
| GitHub | personal (your account) | Commits and stars on your profile; the repo can move to a `dewly` organization later |
| Supabase, Cloudflare | project email | Easy to hand over or invite a collaborator; your personal account is added as a member |
| Google Cloud (OAuth, Gemini) | project email | This address is shown to users on the Google sign-in screen |
| Pl@ntNet, Resend (SMTP) | project email | API keys and mailings stay separate from your personal inbox |

Turn on 2FA everywhere and keep passwords and keys in a password manager. The project email can forward to your personal one so nothing is missed.

## GitHub presentation

A public `dewly` repository with a clear README, the plan in Issues and checks on every push, so it reads as a tidy side project.

- [ ] **README:** logo, one line on what it is, 3–4 screenshots from the mockups (later from the app), features, stack, architecture diagram, "run locally", link to the demo
- [ ] **Description and topics:** `pwa`, `react`, `typescript`, `supabase`, `plants`, `gemini`; social preview from the design-system cover
- [ ] **License:** MIT (or no license if you don't want to allow reuse of the code)
- [ ] **Secrets:** `.env.example` without values, `.env` in `.gitignore`; Gemini/Pl@ntNet/VAPID keys only in Supabase Secrets
- [ ] **Structure:** `src/`, `supabase/migrations` and `supabase/functions` (DB schema in the repo), `docs/` with the requirements and this plan, `CLAUDE.md` with context for Claude Code
- [ ] **Plan on GitHub:** 8 milestones = 8 phases, tasks as issues, a GitHub Projects board (Todo / In progress / Done), labels `feature`, `bug`, `design`, `infra`, `ai`
- [ ] **CI:** GitHub Actions — lint, typecheck, build on every PR; Cloudflare Pages makes a preview deploy for every branch
- [ ] **Discipline:** Conventional Commits (`feat:`, `fix:`), work in branches through PRs, `CHANGELOG.md` and a `v0.x` tag at the end of each phase

## Risks and open questions

The main pitfalls are free-tier limits and PWA quirks on iOS; check the docs before the relevant phase.

- **Code emails.** Supabase's built-in email is heavily rate-limited and meant for testing; for a custom template and reliable delivery, connect your own SMTP (for example, Resend's free tier).
- **Supabase auto-pause.** A free project sleeps after a long period of inactivity; the hourly push cron will most likely keep it active — check the current rules.
- **Push on iOS.** Works only for a PWA on the Home Screen; ask for permission on a tap. Removing the icon drops the subscription — clean up stale subscriptions on a 410 response.
- **Gemini.** The free tier has limits and, under Google's terms, data may be used to improve models. Fine for plant data, but never send email or name in requests. Validate the response with a Zod schema and cache it.
- **Pl@ntNet / iNaturalist.** Daily request limits and attribution rules (step 1 already shows a source credit).
- **Google sign-in.** Needs a Google Cloud project with an OAuth consent screen; the button follows the official guidelines.

**Open questions:**

- [ ] Cloudflare Pages or Vercel?
- [ ] A custom domain (for email and a nicer address), or is the free subdomain enough?
- [ ] Dark theme — in the MVP or later?
