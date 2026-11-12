-- AI recommendations: species care info, a cache of Gemini answers, and "custom" schedules.
-- Only the recommend Edge Function (service role) writes care info and the cache.

alter table public.species
  add column care_info jsonb,
  add column care_info_at timestamptz;

-- One Gemini answer per set of inputs (species, plant, room, month, weather), so the same
-- question never spends the limit twice. No client access: RLS on, no policies, no grants.
create table public.recommendation_cache (
  user_id uuid not null references auth.users (id) on delete cascade,
  input_hash text not null check (char_length(input_hash) = 64),
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, input_hash)
);

alter table public.recommendation_cache enable row level security;

-- A user changing the intervals makes the schedule custom, so recalculation leaves it alone.
-- The Edge Function writes as service_role and sets the source itself.
create function public.care_schedules_mark_custom()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
    and (
      new.water_days_warm is distinct from old.water_days_warm
      or new.water_days_cold is distinct from old.water_days_cold
      or new.progress_days is distinct from old.progress_days
    )
  then
    new.source := 'custom';
  end if;
  return new;
end;
$$;

create trigger care_schedules_mark_custom
  before update on public.care_schedules
  for each row execute function public.care_schedules_mark_custom();
