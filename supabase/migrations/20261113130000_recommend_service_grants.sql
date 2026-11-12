-- The recommend Edge Function writes as service_role. RLS doesn't apply to it, but table
-- privileges do, and new tables aren't exposed automatically, so grant exactly what it uses.

grant select, insert, update on public.care_schedules to service_role;
grant select, update on public.species to service_role;
grant select, insert, update on public.recommendation_cache to service_role;
