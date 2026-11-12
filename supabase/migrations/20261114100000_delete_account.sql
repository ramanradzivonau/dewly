-- Account deletion. Everything hangs off auth.users with ON DELETE CASCADE, except that a room
-- with plants can't be deleted (plants.room_id is RESTRICT), and the cascade order isn't
-- guaranteed. The delete-account Edge Function calls this first, then deletes the user.

create function public.delete_user_plants(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.plants where user_id = p_user;
$$;

revoke execute on function public.delete_user_plants(uuid) from public, anon, authenticated;
grant execute on function public.delete_user_plants(uuid) to service_role;
