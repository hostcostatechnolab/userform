-- =============================================================================
-- Jibble Clone — initial schema
-- Time & attendance: organizations, members, projects, time entries, breaks.
-- Paste this whole file into the Supabase SQL editor and run it once.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.org_role as enum ('owner', 'admin', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.entry_source as enum ('web', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invite_status as enum ('pending', 'accepted', 'revoked');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- updated_at helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  phone_number  text,
  bio           text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- If `profiles` already existed from an earlier setup, backfill new columns.
alter table public.profiles add column if not exists full_name    text;
alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists bio          text;
alter table public.profiles add column if not exists avatar_url   text;
alter table public.profiles add column if not exists created_at   timestamptz not null default now();
alter table public.profiles add column if not exists updated_at   timestamptz not null default now();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user is created.
-- Works whether or not email confirmation is enabled.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone_number', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- organizations
-- ----------------------------------------------------------------------------
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  owner_id    uuid not null references auth.users(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- org_members
-- ----------------------------------------------------------------------------
create table if not exists public.org_members (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  -- references profiles (1:1 with auth.users) so PostgREST can embed the profile
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists idx_org_members_user on public.org_members(user_id);

-- ----------------------------------------------------------------------------
-- invitations
-- ----------------------------------------------------------------------------
create table if not exists public.invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  email       text not null,
  role        public.org_role not null default 'member',
  status      public.invite_status not null default 'pending',
  token       uuid not null default gen_random_uuid(),
  invited_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  unique (org_id, email)
);

create index if not exists idx_invitations_email on public.invitations(lower(email));
create index if not exists idx_invitations_token on public.invitations(token);

-- ----------------------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  color       text not null default '#6366f1',
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_projects_org on public.projects(org_id);

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- time_entries
-- ----------------------------------------------------------------------------
create table if not exists public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  -- references profiles (1:1 with auth.users) so PostgREST can embed the profile
  user_id     uuid not null references public.profiles(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete set null,
  started_at  timestamptz not null,
  ended_at    timestamptz,
  note        text,
  source      public.entry_source not null default 'web',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint time_entries_end_after_start
    check (ended_at is null or ended_at >= started_at)
);

create index if not exists idx_time_entries_org_started on public.time_entries(org_id, started_at desc);
create index if not exists idx_time_entries_user_started on public.time_entries(user_id, started_at desc);

-- At most one running (ended_at is null) entry per user.
create unique index if not exists uniq_running_entry_per_user
  on public.time_entries(user_id)
  where ended_at is null;

drop trigger if exists trg_time_entries_updated_at on public.time_entries;
create trigger trg_time_entries_updated_at
  before update on public.time_entries
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- breaks
-- ----------------------------------------------------------------------------
create table if not exists public.breaks (
  id             uuid primary key default gen_random_uuid(),
  time_entry_id  uuid not null references public.time_entries(id) on delete cascade,
  started_at     timestamptz not null,
  ended_at       timestamptz,
  created_at     timestamptz not null default now(),
  constraint breaks_end_after_start
    check (ended_at is null or ended_at >= started_at)
);

create index if not exists idx_breaks_entry on public.breaks(time_entry_id);

-- ============================================================================
-- Membership helper functions (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================================
create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_manager(p_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

-- Create an organization and make the caller its owner, atomically.
create or replace function public.create_organization(p_name text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.organizations (name, owner_id)
  values (p_name, auth.uid())
  returning * into v_org;

  insert into public.org_members (org_id, user_id, role)
  values (v_org.id, auth.uid(), 'owner');

  return v_org;
end;
$$;

-- Accept an invitation by token; adds the caller to the org.
create or replace function public.accept_invitation(p_token uuid)
returns public.org_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.invitations;
  v_member public.org_members;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  select * into v_inv
  from public.invitations
  where token = p_token and status = 'pending'
  for update;

  if v_inv.id is null then
    raise exception 'Invitation not found or already used';
  end if;

  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'This invitation was sent to a different email address';
  end if;

  insert into public.org_members (org_id, user_id, role)
  values (v_inv.org_id, auth.uid(), v_inv.role)
  on conflict (org_id, user_id) do update set role = excluded.role
  returning * into v_member;

  update public.invitations
  set status = 'accepted', accepted_at = now()
  where id = v_inv.id;

  return v_member;
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.organizations  enable row level security;
alter table public.org_members    enable row level security;
alter table public.invitations    enable row level security;
alter table public.projects       enable row level security;
alter table public.time_entries   enable row level security;
alter table public.breaks         enable row level security;

-- ---- profiles --------------------------------------------------------------
drop policy if exists "profiles: read own or co-member" on public.profiles;
create policy "profiles: read own or co-member" on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1
      from public.org_members me
      join public.org_members them on them.org_id = me.org_id
      where me.user_id = auth.uid() and them.user_id = public.profiles.id
    )
  );

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert with check (id = auth.uid());

-- ---- organizations -------------------------------------------------------
drop policy if exists "orgs: members read" on public.organizations;
create policy "orgs: members read" on public.organizations
  for select using (public.is_org_member(id));

drop policy if exists "orgs: managers update" on public.organizations;
create policy "orgs: managers update" on public.organizations
  for update using (public.is_org_manager(id)) with check (public.is_org_manager(id));

-- Insert/owner bootstrap goes through public.create_organization().

-- ---- org_members -------------------------------------------------------
drop policy if exists "members: read same org" on public.org_members;
create policy "members: read same org" on public.org_members
  for select using (public.is_org_member(org_id));

drop policy if exists "members: managers write" on public.org_members;
create policy "members: managers write" on public.org_members
  for all using (public.is_org_manager(org_id)) with check (public.is_org_manager(org_id));

drop policy if exists "members: leave org" on public.org_members;
create policy "members: leave org" on public.org_members
  for delete using (user_id = auth.uid());

-- ---- invitations -----------------------------------------------------
drop policy if exists "invites: managers manage" on public.invitations;
create policy "invites: managers manage" on public.invitations
  for all using (public.is_org_manager(org_id)) with check (public.is_org_manager(org_id));

-- ---- projects -------------------------------------------------------
drop policy if exists "projects: members read" on public.projects;
create policy "projects: members read" on public.projects
  for select using (public.is_org_member(org_id));

drop policy if exists "projects: managers write" on public.projects;
create policy "projects: managers write" on public.projects
  for all using (public.is_org_manager(org_id)) with check (public.is_org_manager(org_id));

-- ---- time_entries --------------------------------------------------
drop policy if exists "entries: read own or manager" on public.time_entries;
create policy "entries: read own or manager" on public.time_entries
  for select using (
    user_id = auth.uid() or public.is_org_manager(org_id)
  );

drop policy if exists "entries: insert own" on public.time_entries;
create policy "entries: insert own" on public.time_entries
  for insert with check (
    user_id = auth.uid() and public.is_org_member(org_id)
  );

drop policy if exists "entries: update own or manager" on public.time_entries;
create policy "entries: update own or manager" on public.time_entries
  for update using (user_id = auth.uid() or public.is_org_manager(org_id))
  with check (user_id = auth.uid() or public.is_org_manager(org_id));

drop policy if exists "entries: delete own or manager" on public.time_entries;
create policy "entries: delete own or manager" on public.time_entries
  for delete using (user_id = auth.uid() or public.is_org_manager(org_id));

-- ---- breaks -------------------------------------------------------
drop policy if exists "breaks: via parent entry" on public.breaks;
create policy "breaks: via parent entry" on public.breaks
  for all using (
    exists (
      select 1 from public.time_entries e
      where e.id = breaks.time_entry_id
        and (e.user_id = auth.uid() or public.is_org_manager(e.org_id))
    )
  )
  with check (
    exists (
      select 1 from public.time_entries e
      where e.id = breaks.time_entry_id
        and (e.user_id = auth.uid() or public.is_org_manager(e.org_id))
    )
  );

-- ============================================================================
-- Grants (RLS still applies; these just expose the RPCs to the API roles)
-- ============================================================================
grant execute on function public.create_organization(text)   to authenticated;
grant execute on function public.accept_invitation(uuid)      to authenticated;
grant execute on function public.is_org_member(uuid)          to authenticated;
grant execute on function public.is_org_manager(uuid)         to authenticated;
