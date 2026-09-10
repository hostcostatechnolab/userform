-- =============================================================================
-- 0002 — let PostgREST embed `profiles` from time_entries and org_members
--
-- The API queries do `select=*, profile:profiles(...)`. PostgREST can only embed
-- when there is a foreign key between the two tables. `user_id` originally FK'd
-- to `auth.users`; repoint it to `public.profiles(id)` (which itself FKs to
-- auth.users, so referential integrity is unchanged) so the embed resolves.
--
-- Run this in the Supabase SQL editor AFTER 0001_init.sql.
-- =============================================================================

-- Make sure every existing auth user has a profile row before we add the FK.
insert into public.profiles (id, full_name, phone_number)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'full_name', ''),
       coalesce(u.raw_user_meta_data ->> 'phone_number', '')
from auth.users u
on conflict (id) do nothing;

-- time_entries.user_id  ->  profiles.id
alter table public.time_entries
  drop constraint if exists time_entries_user_id_fkey;
alter table public.time_entries
  add constraint time_entries_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- org_members.user_id  ->  profiles.id
alter table public.org_members
  drop constraint if exists org_members_user_id_fkey;
alter table public.org_members
  add constraint org_members_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- Ask PostgREST to refresh its schema cache immediately.
notify pgrst, 'reload schema';
