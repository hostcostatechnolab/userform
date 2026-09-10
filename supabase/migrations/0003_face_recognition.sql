-- =============================================================================
-- 0003 — Face recognition on clock in / out
--
-- * profiles gets an enrolled 128-d face descriptor + reference photo path
-- * time_entries records the selfie + match score for each clock in / out
-- * a private Storage bucket `attendance-selfies` holds the images
--
-- Run in the Supabase SQL editor AFTER 0002.
-- Path convention for objects:  <user_id>/<org_id>/<filename>.jpg
-- =============================================================================

-- ---- profiles: enrolled face -------------------------------------------------
alter table public.profiles
  add column if not exists face_descriptor jsonb;      -- number[128] or null
alter table public.profiles
  add column if not exists face_photo_path text;       -- storage object path

-- ---- time_entries: per-punch selfie + score --------------------------------
alter table public.time_entries
  add column if not exists clock_in_photo_path  text;
alter table public.time_entries
  add column if not exists clock_out_photo_path text;
alter table public.time_entries
  add column if not exists clock_in_face_score  double precision;  -- euclidean distance
alter table public.time_entries
  add column if not exists clock_out_face_score double precision;

-- ---- Storage bucket -------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('attendance-selfies', 'attendance-selfies', false)
on conflict (id) do nothing;

-- ---- Storage RLS: users write their own folder; managers can read the org's
drop policy if exists "selfies: insert own" on storage.objects;
create policy "selfies: insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attendance-selfies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "selfies: update own" on storage.objects;
create policy "selfies: update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'attendance-selfies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "selfies: delete own" on storage.objects;
create policy "selfies: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attendance-selfies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "selfies: read own or manager" on storage.objects;
create policy "selfies: read own or manager" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attendance-selfies'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_org_manager((((storage.foldername(name))[2]))::uuid)
    )
  );

notify pgrst, 'reload schema';
