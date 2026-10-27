# Dewly — MVP requirements

> English translation of the Claude Docs requirements ("Plant Care App"), as of 2026-10-27. Source: https://claude.ai/artifact/T58QghDVaPnv68Zm79N7Rb

## Overview

A personal PWA for houseplant care: a Planta replacement with a fast interface, flexible fertilizer setup and a watering schedule that AI computes from the room, the plant and the weather.

- **Platform:** PWA, installed on iPhone via Add to Home Screen (iOS 16.4+ for push).
- **UI language:** English.
- **Users:** only the author for now; public launch and multi-user hardening come later.
- **Format:** side project built in a vibe-coding style; stack and implementation plan were discussed after requirements and design.

## Account and sign-in

The MVP signs in with email + password and with Google. Sign in with Apple is postponed because it needs the paid Apple Developer Program.

- Sign-up and sign-in with email + password; email confirmed with a 6-digit OTP code from an email (valid 10 minutes, can be resent); password reset by code.
- Sign-in with Google.
- Creating an account automatically creates one hidden home (Home). The user never sees it: the UI has no notion of "home", only rooms.
- In Profile: change email (confirmed by code), change or set a password (if the user only signed in with Google), link, relink and unlink Google (unlink only when a password is set), sign out and delete the account. The city is entered manually with autocomplete, no geolocation.

## Home and rooms

An account has one home (Home). Inside it the user creates, edits and deletes rooms, and every room parameter feeds the care recommendations.

**Home:** a hidden entity that stores the city (for weather and day length). The city is asked at sign-up and changed in Profile. More homes are out of the MVP.

**Room:**

| Field | Values | Effect on care |
| --- | --- | --- |
| Name | text (Bathroom, Bedroom, Hallway…) | — |
| Light | Shade / Indirect / Bright indirect / Direct sun | drying speed, growth |
| Window direction | N / NE / E / SE / S / SW / W / NW / no window | refines light by season |
| Winter temperature | range, °C (e.g. 16–19) | winter watering frequency |
| Summer temperature | range, °C (e.g. 22–27) | summer watering frequency |
| Humidity | range, % (e.g. 40–60) | watering frequency, misting |
| Drafts | yes / no | risk of drying out and chilling |

Deleting a room that has plants offers to move them to another room.

## Plants

Plants can be created, edited and deleted. On creation the species is identified by photo or by name, and then AI suggests recommended values for soil, pot and care.

**Species identification (two ways):**

1. **By photo** — Pl@ntNet returns several species candidates with confidence and reference images; the user picks one.
2. **By name** — search with autocomplete, results as a list with images; the user picks the species.

**Plant fields:**

| Field | Input | Note |
| --- | --- | --- |
| Name (nickname) | text | editable |
| Species / plant type | from Pl@ntNet or search | scientific and common name |
| Photo | on creation | later added from progress entries |
| Room | pick from a list | light, temperature and humidity come from the room |
| Soil | pick + custom value | AI shows the one recommended for the species |
| Last repotted | approximate date / "a long time ago, not sure" | recommendation on when to repot |
| Pot: material | plastic / ceramic / terracotta / other | affects drying speed |
| Pot: diameter | cm | AI suggests a suitable size |
| Drainage holes | yes / no | warning if none |
| Grow light | none / yes + hours per day | adds to the room's light |
| Near a radiator / AC | none / radiator / AC | speeds up drying |
| Size | Small / Medium / Large + height in cm | updated from progress |
| Age | approximate on creation | then counted from the current date |
| Pet toxicity | from species data | cats / dogs, from Gemini, labelled "AI-generated" |

**Computed data (shown in the info, not entered):** city, current month, average outdoor temperature, day length. Updated automatically: weather for the city once a month, when the month changes (the result is cached); day length is computed locally every day.

For every field where AI gives a recommendation, a "Recommended for this species" hint is shown next to it, with a mark when the current value differs.

## Care: watering, fertilizer, recommendations

The watering and feeding schedule is suggested by AI (Gemini) from the species, the plant, the room and the weather. The user can adjust it, and manual settings take priority over recalculation.

### Watering

- **Interval** in days, separately for the warm and cold season; plus a short tip without a water volume (water until it drains from the bottom), e.g. "water when the top 2–3 cm are dry".
- **Next watering date** is counted from the actual watering, not from the plan.
- **Manual adjustment:** the user can change the interval; the plant is marked "custom schedule" and automatic recalculation doesn't overwrite it ("Use AI recommendation" brings it back).

### Feedback when watering

When completing or opening a watering task, the user can report the soil state:

| Answer | Action |
| --- | --- |
| Done | watering logged, next date = today + interval |
| Soil still wet | watering moves by 1–2 days (user's choice); the interval grows slightly after repeats |
| Soil was too dry | watering logged; the interval shrinks slightly after repeats |

There is no manual "snooze": an undone watering stays in Today marked "Overdue by N days" until it is checked off.

The interval changes not after a single answer but when the answer repeats (e.g. twice in a row), so the schedule doesn't jump around.

### Fertilizer

- **My fertilizers:** a list with name, type (liquid / granules / sticks) and dosage (e.g. ml per liter of water).
- **Feeding plan per plant:** the chosen fertilizer, frequency ("every Nth watering" or "every N weeks"), active months (e.g. March–September), dose (defaults to the fertilizer's, can be changed).
- AI suggests a plan for the species; the user adjusts it.
- **Liquid fertilizer in the water:** the watering task is marked "with fertilizer" and shows the dose; no separate task is created. Other types get a separate feeding task.

### When the recommendation is recalculated

1. When a plant is created.
2. When the month or season changes (new weather and day length).
3. When the plant's or its room's data changes.
4. With the "Recalculate" button on the plant card.

Each recommendation is stored with a short explanation ("Bright room + radiator nearby → water more often"), so it's clear where the numbers come from.

## Growth progress

Each plant gets an "Update progress" task on its own interval; saving a progress entry closes it automatically.

**Progress interval** is suggested by AI from the species' growth rate: fast growers every 2–4 weeks, slow ones (cacti, succulents) every 2–3 months. The value can be changed on the plant card.

- **Progress entry:** health (Sick / Struggling / Good / Thriving), one photo (always becomes the plant's new cover, no separate setting), height in cm (optional, slider + field, shows the growth), "Worth noticing" tags (good signs: New leaf, Flowering…; problems: Yellow leaves, Pests… — shown only when health is Sick or Struggling), note (optional).
- Photos from entries go to the plant's gallery; the main photo can be switched to any of them.
- Size in the plant info is updated from the latest entry.
- An entry can be made at any time without waiting for the task; the next progress task then moves to this plant's interval from that date.
- Entry history is a feed on the plant card.

## Navigation and screens

A bottom navigation bar with three tabs: Today, My Plants, Profile.

### Today (home)

- Button to add a new plant.
- List of today's and overdue tasks: watering (marked "with fertilizer" when needed), feeding, progress update.
- Each task shows the plant's photo and name, the room, the task type and a "done" checkbox.
- Overdue tasks are on top, marked "Overdue by N days".
- The "Update progress" task can't be closed with the checkbox: a tap opens the progress form, and the task closes after saving.
- Tapping a task opens its details: Done / Soil still wet / Too dry, fertilizer dose, watering tip.
- An "Upcoming" block with a List / Calendar toggle for the next tasks.

### My Plants

- Button to add a new room.
- List of rooms: each with a name, a few preview photos of its plants and a count caption (e.g. "5 plants").
- Tapping a room opens the room page: its plants (photo, name, when the next watering is), a button to add a plant that is attached to this room right away, the room's parameters (light, window, winter and summer temperature, humidity, drafts), and Edit and Delete buttons for the room.
- **Plant card:** photo, species, toxicity, main info, watering and feeding schedule with its explanation, a History block linking to a separate history page with two tabs — Progress (feed of progress entries with photo, health, height and tags) and Care (watering and feeding by month: date, soil state, with or without fertilizer, postponements, plus a summary of the average watering interval and the number of feedings) — and Edit / Recalculate / Delete buttons.
- **Add plant:** a step-by-step form — identify species → photo and name → room → soil and pot → other parameters → suggested schedule to confirm.

### Profile

- Account details, sign out, delete account.
- City (for weather and day length).
- My fertilizers (list, add, edit).
- Notifications: turn on, list of reminder times (1–5 per day).
- Units (cm / inches, °C / °F).

## Notifications

Summary push notifications several times a day: the user sets 1 to 5 times (default 09:00, 15:00, 20:00). Each notification lists what is still undone today, e.g. "4 plants need water today (1 with fertilizer)"; if everything is done, the notification is skipped.

- Sent by the server on a schedule via Web Push; works only for a PWA added to the Home Screen.
- Turned on with a button in Profile or on first launch (iOS requires a user action).
- Tapping a notification opens the Today tab.
- If there are no tasks, no notification is sent.
- Overdue tasks are included in the same summary.

## External services

All services were chosen for free tiers that are enough for one user; limits are to be checked when choosing the stack.

| Task | Service | What it gives |
| --- | --- | --- |
| Species by photo | Pl@ntNet API | species candidates with confidence and reference photos |
| Care, soil, pot and toxicity recommendations | Gemini API | structured JSON response with an explanation |
| Weather for the city | Open-Meteo | monthly average temperature, no key |
| Day length | computed from coordinates and date | no external API |
| Push notifications | Web Push (VAPID) | free, needs your own server / scheduled function |

Species search by name uses the iNaturalist API: autocomplete with photos and common names, free and without a key.

AI requests are cached by plant species so identical questions don't spend limits.

## Out of the MVP and open questions

**Postponed:**

- Sign in with Apple (needs the paid Apple Developer Program).
- Several homes per account.
- Public launch: abuse protection, AI limits, privacy policy.
- Shared access to plants for several users.
- Importing plants from Planta.
- Misting, pruning and repotting as separate task types.
- A Home Screen widget: PWAs don't have one; an option is Scriptable with data from the API.
- Extra care tasks: treatment (e.g. a pest-control course), and custom tasks with a user-defined name and frequency.

**Decisions:**

- Species search by name with an image list uses the iNaturalist API (species autocomplete): free, no key, returns photos and English names. Pl@ntNet stays for identification by photo.
- Pet toxicity comes from Gemini together with the rest of the species data and is shown labelled "AI-generated, verify if unsure".
- Per-plant reminders are not needed; summaries 1–5 times a day stay.
- Stack and implementation plan were discussed after the design (see [plan.md](plan.md)).
