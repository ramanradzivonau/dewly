-- Push reminders: subscriptions, a log of sent slots, and the digest send-reminders reads.
-- pg_cron calls the Edge Function every 15 minutes; see 20261113170100_reminders_cron.sql.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, delete on public.push_subscriptions to authenticated;
grant insert (endpoint, p256dh, auth) on public.push_subscriptions to authenticated;
-- send-reminders reads subscriptions and drops the ones the push service says are gone.
grant select, delete on public.push_subscriptions to service_role;

-- One row per user and reminder slot, so a slot is sent once even if cron runs twice.
create table public.reminder_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  slot timestamptz not null,
  primary key (user_id, slot)
);

alter table public.reminder_log enable row level security;

-- Users whose reminder time fell in the last `window_minutes`, with what's still open today.
-- Claims the slot as it reads it. Users with nothing to do are claimed too, and skipped.
create function public.claim_reminders(window_minutes int default 15)
returns table (user_id uuid, water int, with_fertilizer int, fertilize int, progress int, late int)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  return query
  with due_slots as (
    select p.id as user_id, s.slot
    from public.profiles p
    cross join lateral unnest(p.reminder_times) as t(hhmm)
    -- Today's reminder time in the user's time zone, as an instant.
    cross join lateral (
      select ((now() at time zone coalesce(p.timezone, 'UTC'))::date + t.hhmm::time)
        at time zone coalesce(p.timezone, 'UTC') as slot
    ) s
    where s.slot <= now()
      and s.slot > now() - make_interval(mins => window_minutes)
      and exists (select 1 from public.push_subscriptions ps where ps.user_id = p.id)
  ),
  claimed as (
    insert into public.reminder_log (user_id, slot)
    select d.user_id, d.slot from due_slots d
    on conflict do nothing
    returning reminder_log.user_id
  )
  select
    c.user_id,
    count(*) filter (where t.type = 'water')::int,
    count(*) filter (where t.type = 'water' and t.with_fertilizer)::int,
    count(*) filter (where t.type = 'fertilize')::int,
    count(*) filter (where t.type = 'progress')::int,
    count(*) filter (where t.overdue_days > 0)::int
  from claimed c
  join public.due_tasks t
    on t.user_id = c.user_id
   and t.due_on <= t.today
   and t.done_today_event_id is null
  group by c.user_id;
end;
$$;

revoke execute on function public.claim_reminders(int) from public, anon, authenticated;
grant execute on function public.claim_reminders(int) to service_role;

-- Old log rows have no use after a day or two.
create function public.prune_reminder_log()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.reminder_log where slot < now() - interval '3 days';
$$;

revoke execute on function public.prune_reminder_log() from public, anon, authenticated;
grant execute on function public.prune_reminder_log() to service_role;
