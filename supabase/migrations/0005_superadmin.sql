-- =============================================================================
-- 0005 — Platform Super Admin + soft account deactivation
--
-- * profiles.is_superadmin — full cross-organization read access
-- * profiles.deactivated_at — soft "account disabled" flag (proxy signs them
--   out; RLS refuses their writes)
-- * profiles.email — mirrored from auth.users so the admin directory can show it
--
-- Grant super admin by hand (there is deliberately no UI):
--   update public.profiles set is_superadmin = true where email = 'you@example.com';
--
-- Run in the Supabase SQL editor AFTER 0004.
-- =============================================================================

alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;
alter table public.profiles
  add column if not exists deactivated_at timestamptz;
alter table public.profiles
  add column if not exists email text;

-- ---- keep profiles.email in sync with auth.users ------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone_number', '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- backfill existing rows
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and (p.email is distinct from u.email);

-- ---- helper predicates --------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_superadmin = true
      and p.deactivated_at is null
  );
$$;

create or replace function public.is_active()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.deactivated_at is not null
  );
$$;

grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.is_active() to authenticated;

-- ===========================================================================
-- RLS — give super admin read access everywhere; block deactivated writes
-- ===========================================================================

-- ---- profiles ---------------------------------------------------------
drop policy if exists "profiles: read own or co-member" on public.profiles;
create policy "profiles: read own or co-member" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_superadmin()
    or exists (
      select 1
      from public.org_members me
      join public.org_members them on them.org_id = me.org_id
      where me.user_id = auth.uid() and them.user_id = public.profiles.id
    )
  );

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid() and public.is_active())
  with check (id = auth.uid() and public.is_active());

drop policy if exists "profiles: superadmin update" on public.profiles;
create policy "profiles: superadmin update" on public.profiles
  for update using (public.is_superadmin()) with check (public.is_superadmin());

-- ---- organizations --------------------------------------------------
drop policy if exists "orgs: members read" on public.organizations;
create policy "orgs: members read" on public.organizations
  for select using (public.is_org_member(id) or public.is_superadmin());

-- ---- org_members --------------------------------------------------
drop policy if exists "members: read same org" on public.org_members;
create policy "members: read same org" on public.org_members
  for select using (public.is_org_member(org_id) or public.is_superadmin());

-- ---- invitations -------------------------------------------------
drop policy if exists "invites: managers manage" on public.invitations;
create policy "invites: managers manage" on public.invitations
  for all using (public.is_org_manager(org_id) or public.is_superadmin())
  with check (public.is_org_manager(org_id));

-- ---- projects --------------------------------------------------
drop policy if exists "projects: members read" on public.projects;
create policy "projects: members read" on public.projects
  for select using (public.is_org_member(org_id) or public.is_superadmin());

drop policy if exists "projects: members create" on public.projects;
create policy "projects: members create" on public.projects
  for insert with check (public.is_org_member(org_id) and public.is_active());

-- ---- tasks -------------------------------------------------
drop policy if exists "tasks: members read" on public.tasks;
create policy "tasks: members read" on public.tasks
  for select using (public.is_org_member(org_id) or public.is_superadmin());

drop policy if exists "tasks: members create" on public.tasks;
create policy "tasks: members create" on public.tasks
  for insert with check (
    public.is_org_member(org_id)
    and public.is_active()
    and (created_by is null or created_by = auth.uid())
  );

-- ---- time_entries ----------------------------------------
drop policy if exists "entries: read own or manager" on public.time_entries;
create policy "entries: read own or manager" on public.time_entries
  for select using (
    user_id = auth.uid() or public.is_org_manager(org_id) or public.is_superadmin()
  );

drop policy if exists "entries: insert own" on public.time_entries;
create policy "entries: insert own" on public.time_entries
  for insert with check (
    user_id = auth.uid() and public.is_org_member(org_id) and public.is_active()
  );

drop policy if exists "entries: update own or manager" on public.time_entries;
create policy "entries: update own or manager" on public.time_entries
  for update using (
    (user_id = auth.uid() or public.is_org_manager(org_id)) and public.is_active()
  )
  with check (
    (user_id = auth.uid() or public.is_org_manager(org_id)) and public.is_active()
  );

-- ---- activity_sessions ---------------------------------
drop policy if exists "sessions: read own or manager" on public.activity_sessions;
create policy "sessions: read own or manager" on public.activity_sessions
  for select using (
    user_id = auth.uid() or public.is_org_manager(org_id) or public.is_superadmin()
  );

drop policy if exists "sessions: insert own" on public.activity_sessions;
create policy "sessions: insert own" on public.activity_sessions
  for insert with check (
    user_id = auth.uid() and public.is_org_member(org_id) and public.is_active()
  );

drop policy if exists "sessions: update own" on public.activity_sessions;
create policy "sessions: update own" on public.activity_sessions
  for update using (user_id = auth.uid() and public.is_active())
  with check (user_id = auth.uid() and public.is_active());

-- ---- screenshots -------------------------------------
drop policy if exists "screenshots: read own or manager" on public.screenshots;
create policy "screenshots: read own or manager" on public.screenshots
  for select using (
    user_id = auth.uid() or public.is_org_manager(org_id) or public.is_superadmin()
  );

drop policy if exists "screenshots: insert own" on public.screenshots;
create policy "screenshots: insert own" on public.screenshots
  for insert with check (
    user_id = auth.uid() and public.is_org_member(org_id) and public.is_active()
  );

-- ---- Storage: let super admin read every selfie / screenshot --------
drop policy if exists "selfies: read own or manager" on storage.objects;
create policy "selfies: read own or manager" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attendance-selfies'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_org_manager((((storage.foldername(name))[2]))::uuid)
      or public.is_superadmin()
    )
  );

drop policy if exists "shots: read own or manager" on storage.objects;
create policy "shots: read own or manager" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'activity-screenshots'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_org_manager((((storage.foldername(name))[2]))::uuid)
      or public.is_superadmin()
    )
  );

notify pgrst, 'reload schema';
