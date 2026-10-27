-- Care events and the tasks derived from them.
-- Tasks aren't stored: due_tasks computes them from the schedule and the latest events,
-- which gives "overdue by N days" and postponements for free.

create table public.care_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plant_id uuid not null,
  type text not null check (type in ('water', 'fertilize', 'postpone', 'progress')),
  at timestamptz not null default now(),
  -- How the soil felt when watering: wet soil postpones instead of logging a watering.
  soil_state text check (soil_state in ('dry_top', 'very_dry')),
  with_fertilizer boolean not null default false,
  postpone_days smallint check (postpone_days between 1 and 7),
  created_at timestamptz not null default now(),
  foreign key (plant_id, user_id) references public.plants (id, user_id) on delete cascade,
  check (soil_state is null or type = 'water'),
  check ((type = 'postpone') = (postpone_days is not null)),
  check (not with_fertilizer or type = 'water')
);

create index care_events_plant_type_at_idx on public.care_events (plant_id, type, at desc);
create index care_events_user_id_idx on public.care_events (user_id);

alter table public.care_events enable row level security;

create policy "Users manage their own care events"
  on public.care_events for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Events are a log: added and undone (deleted), never edited.
grant select, delete on public.care_events to authenticated;
grant insert (plant_id, type, at, soil_state, with_fertilizer, postpone_days)
  on public.care_events to authenticated;

-- One row per plant and task type, with the date it's due in the user's time zone.
-- Watering: last watering + the interval for the current season; a later postponement wins.
-- The cold season is October–March in the northern hemisphere, April–September in the southern.
-- Progress: last progress update (or when the plant was added) + the progress interval.
create view public.due_tasks
with (security_invoker = true)
as
with base as (
  select
    p.id as plant_id,
    p.user_id,
    p.nickname,
    p.cover_photo,
    p.room_id,
    r.name as room_name,
    s.water_days_warm,
    s.water_days_cold,
    s.progress_days,
    s.tip,
    (p.created_at at time zone tz.name)::date as added_on,
    (now() at time zone tz.name)::date as today,
    tz.name as tz,
    coalesce(pr.lat, 0) >= 0 as north
  from public.plants p
  join public.rooms r on r.id = p.room_id
  join public.care_schedules s on s.plant_id = p.id
  left join public.profiles pr on pr.id = p.user_id
  cross join lateral (select coalesce(pr.timezone, 'UTC') as name) tz
),
water as (
  select
    b.*,
    lw.at as last_water_at,
    (lw.at at time zone b.tz)::date as last_water_on,
    lw.id as last_water_id,
    case
      when (extract(month from b.today) in (10, 11, 12, 1, 2, 3)) = b.north then b.water_days_cold
      else b.water_days_warm
    end as interval_days
  from base b
  left join lateral (
    select e.id, e.at
    from public.care_events e
    where e.plant_id = b.plant_id and e.type = 'water'
    order by e.at desc
    limit 1
  ) lw on true
),
water_due as (
  select
    w.*,
    greatest(
      coalesce(w.last_water_on + w.interval_days, w.added_on),
      (
        select max((e.at at time zone w.tz)::date + e.postpone_days)
        from public.care_events e
        where e.plant_id = w.plant_id
          and e.type = 'postpone'
          and (w.last_water_at is null or e.at > w.last_water_at)
      )
    ) as due_on
  from water w
),
progress_due as (
  select
    b.*,
    coalesce(
      (
        select max((e.at at time zone b.tz)::date)
        from public.care_events e
        where e.plant_id = b.plant_id and e.type = 'progress'
      ),
      b.added_on
    ) + b.progress_days as due_on
  from base b
)
select
  plant_id,
  user_id,
  'water'::text as type,
  nickname,
  cover_photo,
  room_id,
  room_name,
  tip,
  interval_days,
  due_on,
  today,
  greatest(today - due_on, 0) as overdue_days,
  last_water_on as last_done_on,
  -- Watered today: Today keeps the row, checked, so the tap can be undone.
  case when last_water_on = today then last_water_id end as done_today_event_id
from water_due
union all
select
  plant_id,
  user_id,
  'progress',
  nickname,
  cover_photo,
  room_id,
  room_name,
  null,
  progress_days,
  due_on,
  today,
  greatest(today - due_on, 0),
  null,
  null
from progress_due;

grant select on public.due_tasks to authenticated;
