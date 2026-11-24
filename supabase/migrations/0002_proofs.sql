-- Private storage for proof-of-work files. Each user can only touch files under a folder named with their user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 26214400, array['image/png','image/jpeg','image/webp','image/gif','audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/aac','audio/ogg','audio/webm','audio/flac'])
on conflict (id) do nothing;

create policy "proofs: read own" on storage.objects for select to authenticated
  using (bucket_id = 'proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "proofs: add own" on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "proofs: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);
