-- Private bucket for plant photos. Objects live under <user_id>/…, and each user reaches only
-- their own folder. Photos are resized on the client (~1600 px JPEG), so 5 MB is plenty.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plant-photos', 'plant-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Users read their own plant photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users upload their own plant photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete their own plant photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
