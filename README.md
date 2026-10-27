<p align="center">
  <img src="docs/assets/dewly-mark.svg" width="72" alt="Dewly logo">
</p>

<h1 align="center">Dewly</h1>

<p align="center">
  A calm plant-care PWA with AI-tuned watering and fertilizer schedules.<br>
  <a href="#">Live demo</a> · <a href="docs/requirements.md">Requirements</a> · <a href="docs/plan.md">Roadmap</a>
</p>

---

## Why

I used Planta and it lagged a lot, and it didn't let me set up my own fertilizer schedule. Dewly is my replacement: it installs on iPhone from the browser (no App Store), sends push reminders, and adjusts each plant's schedule to its room, pot, season and the weather outside.

## Features (MVP)

- **Today**: one checklist of watering, fertilizing and progress updates, with overdue days, plus an upcoming list and calendar
- **Smart schedules**: Gemini suggests watering and fertilizer intervals from the plant species, room, pot, soil, season and local weather; soil feedback ("still wet", "very dry") shifts the next date
- **Fertilizer**: your own fertilizers, marked as you water (liquid feed goes in the water)
- **Identify plants** by photo (Pl@ntNet) or name (iNaturalist)
- **Rooms** with light, window orientation, temperature, humidity and drafts
- **Progress**: one photo per update, health status, height, and tags
- **Push reminders** 1–5 times a day at times you choose (Web Push, iOS 16.4+)
- Sign in with email + one-time code, or with Google

## Screenshots

Coming soon. Until then, see the [design canvas](docs/design.md).

## Stack

| Layer | Tech |
| --- | --- |
| App | Vite, React 18, TypeScript, TanStack Router + Query, Tailwind v4, React Hook Form + Zod |
| PWA | vite-plugin-pwa (Workbox), Web Push with VAPID keys |
| Backend | Supabase: Auth, Postgres + RLS, Storage, Edge Functions, pg_cron |
| AI and data | Gemini API, Pl@ntNet, iNaturalist, Open-Meteo, suncalc |
| Hosting | Cloudflare Pages |

```
iPhone PWA ──► Supabase (Auth · Postgres · Storage)
     ▲              │
     │         Edge Functions ──► Gemini · Pl@ntNet · iNaturalist · Open-Meteo
     └── Web Push ◄─ send-reminders (pg_cron)
```

## Getting started

Requires Node 22.12+ (`.node-version` pins 24) and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
git clone https://github.com/<you>/dewly.git
cd dewly
npm install
cp .env.example .env.local      # fill in the values
supabase start                  # local Postgres, Auth and Storage
supabase db reset               # apply migrations
npm run dev
```

Server-side keys (Gemini, Pl@ntNet, VAPID private key) are set as Supabase secrets, never in `.env.local`:

```bash
supabase secrets set GEMINI_API_KEY=... PLANTNET_API_KEY=... VAPID_PRIVATE_KEY=...
```

To install on iPhone: open the deployed site in Safari → Share → **Add to Home Screen**, then open Dewly from the home screen and turn on reminders.

## Project structure

```
src/                 app code (routes, features, components, lib)
supabase/migrations  database schema
supabase/functions   identify, recommend, weather, send-reminders
docs/                requirements, plan, design links, assets
```

## Roadmap

- [ ] 0 · Setup: repo, Vite, Tailwind tokens, PWA shell, deploy
- [ ] 1 · Auth: email + code, Google, onboarding with city
- [ ] 2 · Rooms and plants
- [ ] 3 · Schedules and Today
- [ ] 4 · AI: identify and recommend
- [ ] 5 · Progress and history
- [ ] 6 · Push reminders
- [ ] 7 · Polish and v1.0

Details in [docs/plan.md](docs/plan.md).

## Design

The screens and the Dewly design system (Deep palette, Manrope) were designed before development: see [docs/design.md](docs/design.md).

## License

[MIT](LICENSE)
