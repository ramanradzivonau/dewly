-- Fertilizers and per-plant feeding plans.
-- Liquid fertilizer rides along with a watering ("with fertilizer"); granules and sticks get
-- their own Fertilize task. Feeding happens only in the plan's active months.

create table public.fertilizers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  type text not null check (type in ('liquid', 'granules', 'sticks')),
  -- ml per 1 L of water, g per 1 L of soil, or sticks per pot, by type.
  dose numeric(6, 2) not null check (dose > 0 and dose <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index fertilizers_user_id_idx on public.fertilizers (user_id);

alter table public.fertilizers enable row level security;

create policy "Users manage their own fertilizers"
  on public.fertilizers for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, delete on public.fertilizers to authenticated;
grant insert (name, type, dose), update (name, type, dose)
  on public.fertilizers to authenticated;

create trigger fertilizers_set_updated_at
  before update on public.fertilizers
  for each row execute function public.set_updated_at();

-- Feeding plan on the schedule. Deleting a fertilizer clears it from plans (keeps user_id).
alter table public.care_schedules
  add column fertilizer_id uuid,
  add column fert_mode text check (fert_mode in ('every_n_waterings', 'every_n_weeks')),
  add column fert_n smallint check (fert_n between 1 and 12),
  add column fert_months smallint[] not null default '{3,4,5,6,7,8,9}'
    check (fert_months <@ '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[]),
  -- Overrides the fertilizer's dose for this plant.
  add column fert_dose numeric(6, 2) check (fert_dose > 0 and fert_dose <= 1000),
  add foreign key (fertilizer_id, user_id)
    references public.fertilizers (id, user_id) on delete set null (fertilizer_id),
  add check (fertilizer_id is null or (fert_mode is not null and fert_n is not null));

create index care_schedules_fertilizer_id_idx on public.care_schedules (fertilizer_id);

grant insert (fertilizer_id, fert_mode, fert_n, fert_months, fert_dose),
  update (fertilizer_id, fert_mode, fert_n, fert_months, fert_dose)
  on public.care_schedules to authenticated;

-- due_tasks gains feeding: a with_fertilizer flag on waterings and Fertilize rows.
drop view public.due_tasks;

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
    s.fertilizer_id,
    f.name as fertilizer_name,
    f.type as fertilizer_type,
    coalesce(s.fert_dose, f.dose) as fert_dose,
    s.fert_mode,
    s.fert_n,
    (p.created_at at time zone tz.name)::date as added_on,
    d.today,
    tz.name as tz,
    coalesce(pr.lat, 0) >= 0 as north,
    f.id is not null and extract(month from d.today)::smallint = any (s.fert_months) as fert_active
  from public.plants p
  join public.rooms r on r.id = p.room_id
  join public.care_schedules s on s.plant_id = p.id
  left join public.fertilizers f on f.id = s.fertilizer_id
  left join public.profiles pr on pr.id = p.user_id
  cross join lateral (select coalesce(pr.timezone, 'UTC') as name) tz
  cross join lateral (select (now() at time zone tz.name)::date as today) d
),
water as (
  select
    b.*,
    lw.at as last_water_at,
    (lw.at at time zone b.tz)::date as last_water_on,
    lw.id as last_water_id,
    lw.with_fertilizer as last_water_fed,
    (lf.at at time zone b.tz)::date as last_fed_on,
    lf.at as last_fed_at,
    -- Waterings since the last feeding (or ever), for "every Nth watering".
    (
      select count(*)
      from public.care_events e
      where e.plant_id = b.plant_id
        and e.type = 'water'
        and (lf.at is null or e.at > lf.at)
    ) as waterings_since_fed,
    case
      when (extract(month from b.today) in (10, 11, 12, 1, 2, 3)) = b.north then b.water_days_cold
      else b.water_days_warm
    end as interval_days
  from base b
  left join lateral (
    select e.id, e.at, e.with_fertilizer
    from public.care_events e
    where e.plant_id = b.plant_id and e.type = 'water'
    order by e.at desc
    limit 1
  ) lw on true
  left join lateral (
    select e.at
    from public.care_events e
    where e.plant_id = b.plant_id
      and ((e.type = 'water' and e.with_fertilizer) or e.type = 'fertilize')
    order by e.at desc
    limit 1
  ) lf on true
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
fertilize_due as (
  select
    w.*,
    case
      when w.fert_mode = 'every_n_weeks' then coalesce(w.last_fed_on + 7 * w.fert_n, w.added_on)
      -- The Nth watering since the last feeding; before it happens, estimate from the schedule.
      else coalesce(
        (
          select (e.at at time zone w.tz)::date
          from public.care_events e
          where e.plant_id = w.plant_id
            and e.type = 'water'
            and (w.last_fed_at is null or e.at > w.last_fed_at)
          order by e.at
          offset w.fert_n - 1
          limit 1
        ),
        w.due_on + (w.fert_n - 1 - w.waterings_since_fed)::int * w.interval_days
      )
    end as fed_due_on,
    (
      select e.id
      from public.care_events e
      where e.plant_id = w.plant_id
        and e.type = 'fertilize'
        and (e.at at time zone w.tz)::date = w.today
      order by e.at desc
      limit 1
    ) as fed_today_event_id
  from water_due w
  where w.fertilizer_type in ('granules', 'sticks') and w.fert_active
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
  case when last_water_on = today then last_water_id end as done_today_event_id,
  case
    when last_water_on = today then last_water_fed
    when fertilizer_type <> 'liquid' or not fert_active then false
    when fert_mode = 'every_n_waterings' then waterings_since_fed + 1 >= fert_n
    else last_fed_on is null or greatest(due_on, today) >= last_fed_on + 7 * fert_n
  end as with_fertilizer,
  fertilizer_name,
  fertilizer_type,
  fert_dose
from water_due
union all
select
  plant_id,
  user_id,
  'fertilize',
  nickname,
  cover_photo,
  room_id,
  room_name,
  null,
  null,
  -- Fed today: the next feeding is in the future; keep today's row for undo.
  case when fed_today_event_id is not null then today else fed_due_on end,
  today,
  case when fed_today_event_id is not null then 0 else greatest(today - fed_due_on, 0) end,
  last_fed_on,
  fed_today_event_id,
  false,
  fertilizer_name,
  fertilizer_type,
  fert_dose
from fertilize_due
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
  null,
  false,
  null,
  null,
  null
from progress_due;

grant select on public.due_tasks to authenticated;
