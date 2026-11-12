-- Progress entries: health, one photo (it becomes the cover), optional height, tags and a note.
-- Each entry hangs off a 'progress' care event, which is what due_tasks counts from.

create table public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plant_id uuid not null,
  -- Deleting the event (undo) deletes the entry.
  event_id uuid not null unique references public.care_events (id) on delete cascade,
  at timestamptz not null default now(),
  health text not null check (health in ('sick', 'struggling', 'good', 'thriving')),
  photo_path text check (char_length(photo_path) <= 300),
  height_cm smallint check (height_cm between 1 and 1000),
  tags text[] not null default '{}' check (
    tags <@ array[
      'new_leaf', 'new_shoots', 'flowering', 'big_leaves', 'aerial_roots',
      'yellow_leaves', 'brown_tips', 'drooping', 'leaf_drop', 'not_growing', 'leggy', 'pests',
      'spots'
    ]
  ),
  note text check (char_length(note) <= 500),
  foreign key (plant_id, user_id) references public.plants (id, user_id) on delete cascade,
  -- Problem tags only for a plant that is Sick or Struggling.
  check (
    health in ('sick', 'struggling')
    or not tags && array[
      'yellow_leaves', 'brown_tips', 'drooping', 'leaf_drop', 'not_growing', 'leggy', 'pests',
      'spots'
    ]
  )
);

create index progress_entries_plant_at_idx on public.progress_entries (plant_id, at desc);
create index progress_entries_user_id_idx on public.progress_entries (user_id);

alter table public.progress_entries enable row level security;

create policy "Users manage their own progress entries"
  on public.progress_entries for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Written through save_progress; read and removed directly.
grant select, delete on public.progress_entries to authenticated;
grant insert (plant_id, event_id, health, photo_path, height_cm, tags, note)
  on public.progress_entries to authenticated;

-- One transaction: the 'progress' event (closes the task), the entry, the new cover and height.
-- Runs as the caller, so RLS applies to every row it touches.
create function public.save_progress(
  p_plant uuid,
  p_health text,
  p_photo_path text default null,
  p_height_cm smallint default null,
  p_tags text[] default '{}',
  p_note text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_event uuid;
  v_entry uuid;
begin
  insert into public.care_events (plant_id, type)
  values (p_plant, 'progress')
  returning id into v_event;

  insert into public.progress_entries (plant_id, event_id, health, photo_path, height_cm, tags, note)
  values (p_plant, v_event, p_health, p_photo_path, p_height_cm, coalesce(p_tags, '{}'), p_note)
  returning id into v_entry;

  update public.plants
  set cover_photo = coalesce(p_photo_path, cover_photo),
      height_cm = coalesce(p_height_cm, height_cm)
  where id = p_plant;

  return v_entry;
end;
$$;

revoke execute on function public.save_progress(uuid, text, text, smallint, text[], text)
  from public, anon;
grant execute on function public.save_progress(uuid, text, text, smallint, text[], text)
  to authenticated;
