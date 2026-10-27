#!/usr/bin/env bash
# Creates labels, the 8 roadmap milestones and tonight's issues in the current repo.
# Run from the repo folder after `gh auth login`.
set -euo pipefail

repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)

gh repo edit "$repo" \
  --description "Calm plant-care PWA with AI-tuned watering and fertilizer schedules" \
  --add-topic pwa --add-topic react --add-topic typescript \
  --add-topic supabase --add-topic plants --add-topic gemini

for l in "feature:0E3A25" "bug:962D14" "design:BFD8C5" "infra:1B4A5E" "ai:7A3F0A"; do
  gh label create "${l%%:*}" --color "${l##*:}" --force
done

milestones=(
  "0 · Setup" "1 · Auth" "2 · Rooms and plants" "3 · Schedules and Today"
  "4 · AI" "5 · Progress and history" "6 · Push reminders" "7 · Polish and v1.0"
)
for m in "${milestones[@]}"; do
  gh api "repos/$repo/milestones" -f title="$m" >/dev/null
done

issue() { gh issue create --title "$1" --label "$2" --milestone "$3" --body "$4" >/dev/null; }

issue "Scaffold Vite + React + TS"          infra   "0 · Setup" "Vite, ESLint, Prettier, path aliases, npm scripts dev/build/lint/typecheck."
issue "Tailwind v4 with Dewly tokens"       design  "0 · Setup" "Map tokens.json (Deep palette, Manrope, radius, spacing) to CSS variables and Tailwind theme."
issue "Router and floating NavBar"          feature "0 · Setup" "TanStack Router with Today / My Plants / Profile and the floating nav from the design system."
issue "PWA manifest and service worker"     infra   "0 · Setup" "vite-plugin-pwa, icons from the Dewly mark, standalone display, check Add to Home Screen on iPhone."
issue "Deploy to Cloudflare Pages + CI"     infra   "0 · Setup" "Preview deploys per branch; GitHub Actions running lint, typecheck and build on PRs."
issue "Supabase project and Auth with OTP"  infra   "1 · Auth"  "Frankfurt region, email + password with 6-digit code, Resend SMTP."
issue "Login, Sign up and Verify screens"   feature "1 · Auth"  "Screens from the design canvas, React Hook Form + Zod."

echo "Done: $repo"
