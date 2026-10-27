-- Google sign-ups carry the name as full_name / name, not display_name.

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
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
