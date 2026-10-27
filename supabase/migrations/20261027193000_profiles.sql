-- Profiles: one row per user, created by a trigger on sign-up.
-- City and coordinates feed weather and day length; reminder_times drive push summaries.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  city text check (char_length(city) <= 120),
  lat double precision check (lat between -90 and 90),
  lon double precision check (lon between -180 and 180),
  timezone text,
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  reminder_times text[] not null default array['09:00', '15:00', '20:00']
    check (cardinality(reminder_times) between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Per-user settings: name, city for weather, units, reminder times.';

-- Row Level Security: a user sees and edits only their own row.
alter table public.profiles enable row level security;

create policy "Users read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- New tables are not exposed to the Data API automatically, so grant explicitly.
-- No insert or delete from the client: the trigger creates rows, account deletion cascades.
grant select on public.profiles to authenticated;
grant update (display_name, city, lat, lon, timezone, units, reminder_times)
  on public.profiles to authenticated;

-- Keep updated_at current.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile when a user signs up; the name comes from sign-up metadata.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''));
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users who signed up before this migration.
insert into public.profiles (id, display_name)
select id, nullif(trim(raw_user_meta_data ->> 'display_name'), '')
from auth.users
on conflict (id) do nothing;
