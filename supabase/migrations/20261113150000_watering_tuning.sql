-- Interval tuning from soil feedback: the same answer twice in a row nudges watering.
-- "Still wet" (a postponement) twice → water a bit less often; "very dry" twice → a bit more.
-- The nudge works between AI recalculations; a recalculation sees the same answers in the care
-- history, so it resets the nudge rather than adding it twice.

alter table public.care_schedules
  add column water_tune_pct smallint not null default 0 check (water_tune_pct between -50 and 100),
  add column tuned_at timestamptz,
  add column tuning_note text check (char_length(tuning_note) <= 200);

-- Tuning updates intervals on the user's behalf; that must not turn the schedule custom.
create or replace function public.care_schedules_mark_custom()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
    and coalesce(current_setting('dewly.tuning', true), '') <> 'on'
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

create function public.tune_watering()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answer text;
  v_previous text;
  v_tuned_at timestamptz;
  v_wetter boolean;
begin
  -- Only soil answers count; "dry on top" is the normal case and breaks a streak.
  if new.type = 'postpone' then
    v_answer := 'wet';
  elsif new.type = 'water' and new.soil_state is not null then
    v_answer := new.soil_state;
  else
    return new;
  end if;
  if v_answer = 'dry_top' then
    return new;
  end if;

  select tuned_at into v_tuned_at from public.care_schedules where plant_id = new.plant_id;
  if not found then
    return new;
  end if;

  -- The answer before this one, since the last nudge.
  select case when e.type = 'postpone' then 'wet' else e.soil_state end
  into v_previous
  from public.care_events e
  where e.plant_id = new.plant_id
    and e.id <> new.id
    and (e.type = 'postpone' or (e.type = 'water' and e.soil_state is not null))
    and (v_tuned_at is null or e.at > v_tuned_at)
    and e.at <= new.at
  order by e.at desc
  limit 1;

  if v_previous is distinct from v_answer then
    return new;
  end if;

  v_wetter := v_answer = 'wet';
  perform set_config('dewly.tuning', 'on', true);
  update public.care_schedules
  set
    water_days_warm = least(90, greatest(1, water_days_warm
      + case when v_wetter then 1 else -1 end * greatest(1, round(water_days_warm * 0.15))::int)),
    water_days_cold = least(90, greatest(1, water_days_cold
      + case when v_wetter then 1 else -1 end * greatest(1, round(water_days_cold * 0.15))::int)),
    water_tune_pct = least(100, greatest(-50, water_tune_pct + case when v_wetter then 15 else -15 end)),
    tuned_at = now(),
    tuning_note = case
      when v_wetter then 'The soil was still wet twice in a row, so watering is a little less often.'
      else 'The soil was very dry twice in a row, so watering is a little more often.'
    end
  where plant_id = new.plant_id;
  perform set_config('dewly.tuning', 'off', true);
  return new;
end;
$$;

revoke execute on function public.tune_watering() from public, anon, authenticated;

create trigger care_events_tune_watering
  after insert on public.care_events
  for each row execute function public.tune_watering();
