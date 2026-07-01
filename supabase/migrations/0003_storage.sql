-- Storage buckets — public read, authenticated write/delete, per
-- specs/001-progress-tracker-migration/contracts/supabase-setup.md and research.md §7.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = true;

drop policy if exists "public read photos" on storage.objects;
create policy "public read photos" on storage.objects
  for select
  using (bucket_id = 'photos');

drop policy if exists "authenticated write photos" on storage.objects;
create policy "authenticated write photos" on storage.objects
  for insert
  with check (bucket_id = 'photos' and auth.role() = 'authenticated');

drop policy if exists "authenticated delete photos" on storage.objects;
create policy "authenticated delete photos" on storage.objects
  for delete
  using (bucket_id = 'photos' and auth.role() = 'authenticated');

drop policy if exists "public read documents" on storage.objects;
create policy "public read documents" on storage.objects
  for select
  using (bucket_id = 'documents');

drop policy if exists "authenticated write documents" on storage.objects;
create policy "authenticated write documents" on storage.objects
  for insert
  with check (bucket_id = 'documents' and auth.role() = 'authenticated');

drop policy if exists "authenticated delete documents" on storage.objects;
create policy "authenticated delete documents" on storage.objects
  for delete
  using (bucket_id = 'documents' and auth.role() = 'authenticated');
