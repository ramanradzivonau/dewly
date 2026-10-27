-- Homes, rooms, plants and their care schedules.
-- Every row carries user_id; composite foreign keys keep a child on the same user as its parent.

-- Home: one hidden row per user, created on sign-up. Holds nothing yet but scopes rooms.
create table public.homes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null default 'Home' check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

comment on table public.homes is 'One hidden home per user; the UI only shows its rooms.';

-- Room: light and climate feed the care recommendations. Temperatures are stored in °C.
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  home_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 40),
  light text not null check (light in ('shade', 'indirect', 'bright_indirect', 'direct')),
  window_dir text not null default 'none'
    check (window_dir in ('n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw', 'none')),
  winter_min smallint not null check (winter_min between -10 and 45),
  winter_max smallint not null check (winter_max between -10 and 45),
  summer_min smallint not null check (summer_min between -10 and 45),
  summer_max smallint not null check (summer_max between -10 and 45),
  humidity_min smallint not null check (humidity_min between 0 and 100),
  humidity_max smallint not null check (humidity_max between 0 and 100),
  drafts boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (home_id, user_id) references public.homes (id, user_id) on delete cascade,
  check (winter_min <= winter_max),
  check (summer_min <= summer_max),
  check (humidity_min <= humidity_max)
);

create index rooms_user_id_idx on public.rooms (user_id);
create index rooms_home_id_idx on public.rooms (home_id, user_id);

-- Plant. Approximate dates (born_on, repotted_on) come from "6–12 months ago" style picks;
-- null repotted_on means "a long time ago / not sure". Species arrives with identification (phase 6).
create table public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Rooms with plants can't be deleted directly: delete_room moves them first.
  room_id uuid not null,
  nickname text not null check (char_length(trim(nickname)) between 1 and 60),
  cover_photo text check (char_length(cover_photo) <= 300),
  pot_type text not null default 'plastic'
    check (pot_type in ('plastic', 'ceramic', 'terracotta', 'other')),
  pot_diameter_cm smallint check (pot_diameter_cm between 1 and 150),
  drainage text not null default 'unknown' check (drainage in ('yes', 'no', 'unknown')),
  soil text not null default 'unknown' check (char_length(trim(soil)) between 1 and 60),
  repotted_on date,
  height_cm smallint check (height_cm between 1 and 1000),
  born_on date,
  near text not null default 'none' check (near in ('none', 'radiator', 'ac')),
  grow_light_hours smallint check (grow_light_hours between 1 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (room_id, user_id) references public.rooms (id, user_id) on delete restrict
);

create index plants_user_id_idx on public.plants (user_id);
create index plants_room_id_idx on public.plants (room_id, user_id);

-- Care schedule: one per plant. Entered by hand until the AI recommendation (phase 6).
create table public.care_schedules (
  plant_id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  water_days_warm smallint not null check (water_days_warm between 1 and 90),
  water_days_cold smallint not null check (water_days_cold between 1 and 90),
  tip text check (char_length(tip) <= 200),
  progress_days smallint not null default 30 check (progress_days between 7 and 180),
  source text not null default 'custom' check (source in ('ai', 'custom')),
  explanation text check (char_length(explanation) <= 500),
  computed_at timestamptz,
  updated_at timestamptz not null default now(),
  foreign key (plant_id, user_id) references public.plants (id, user_id) on delete cascade
);

create index care_schedules_user_id_idx on public.care_schedules (user_id);

-- Row Level Security: a user sees and changes only their own rows.
alter table public.homes enable row level security;
alter table public.rooms enable row level security;
alter table public.plants enable row level security;
alter table public.care_schedules enable row level security;

create policy "Users read their own home"
  on public.homes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users manage their own rooms"
  on public.rooms for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own plants"
  on public.plants for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own care schedules"
  on public.care_schedules for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Grants: the home is created by the trigger; ids and owners are never changed by the client.
grant select on public.homes to authenticated;
grant select, delete on public.rooms to authenticated;
grant insert (home_id, name, light, window_dir, winter_min, winter_max, summer_min, summer_max,
  humidity_min, humidity_max, drafts) on public.rooms to authenticated;
grant update (name, light, window_dir, winter_min, winter_max, summer_min, summer_max,
  humidity_min, humidity_max, drafts) on public.rooms to authenticated;
grant select, delete on public.plants to authenticated;
grant insert (room_id, nickname, cover_photo, pot_type, pot_diameter_cm, drainage, soil,
  repotted_on, height_cm, born_on, near, grow_light_hours) on public.plants to authenticated;
grant update (room_id, nickname, cover_photo, pot_type, pot_diameter_cm, drainage, soil,
  repotted_on, height_cm, born_on, near, grow_light_hours) on public.plants to authenticated;
grant select, delete on public.care_schedules to authenticated;
grant insert (plant_id, water_days_warm, water_days_cold, tip, progress_days)
  on public.care_schedules to authenticated;
grant update (water_days_warm, water_days_cold, tip, progress_days)
  on public.care_schedules to authenticated;

create trigger rooms_set_updated_at
  before update on public.rooms
  for each row execute function public.set_updated_at();

create trigger plants_set_updated_at
  before update on public.plants
  for each row execute function public.set_updated_at();

create trigger care_schedules_set_updated_at
  before update on public.care_schedules
  for each row execute function public.set_updated_at();

-- Delete a room; its plants move to another room first, in one transaction.
-- Runs as the caller, so RLS still applies to every row it touches.
create function public.delete_room(room uuid, move_to uuid default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if move_to is not null then
    if move_to = room then
      raise exception 'Pick a different room to move the plants to';
    end if;
    update public.plants set room_id = move_to where room_id = room;
  end if;

  delete from public.rooms where id = room;
  if not found then
    raise exception 'Room not found';
  end if;
end;
$$;

revoke execute on function public.delete_room(uuid, uuid) from public, anon;
grant execute on function public.delete_room(uuid, uuid) to authenticated;

-- Sign-up now also creates the hidden home.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      nullif(trim(coalesce(
        new.raw_user_meta_data ->> 'display_name',
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name'
      )), ''),
      60
    )
  );
  insert into public.homes (user_id) values (new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Users who signed up before this migration.
insert into public.homes (user_id)
select id from auth.users
on conflict (user_id) do nothing;
