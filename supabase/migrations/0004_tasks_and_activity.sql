-- =============================================================================
-- 0004 — Tasks + desktop activity tracking (screenshots)
--
-- * tasks belong to a project; any member can create them
-- * activity_sessions are the desktop tracker's own timeline (NOT time_entries)
-- * screenshots are captured by the Python app, one row per capture
-- * private Storage bucket `activity-screenshots` holds the images
--
-- Run in the Supabase SQL editor AFTER 0003.
-- Screenshot object path convention:  <user_id>/<org_id>/<uuid>.jpg
-- =============================================================================

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  archived    boolean not null default false,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_tasks_org on public.tasks(org_id);

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- activity_sessions  (desktop tracker timeline)
-- ---------------------------------------------------------------------------
create table if not exists public.activity_sessions (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete set null,
  task_id     uuid references public.tasks(id) on delete set null,
  started_at  timestamptz not null,
  ended_at    timestamptz,
  app_version text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint activity_sessions_end_after_start
    check (ended_at is null or ended_at >= started_at)
);

create index if not exists idx_activity_sessions_user
  on public.activity_sessions(user_id, started_at desc);
create index if not exists idx_activity_sessions_org
  on public.activity_sessions(org_id, started_at desc);

-- one open session per user
create unique index if not exists uniq_running_session_per_user
  on public.activity_sessions(user_id)
  where ended_at is null;

drop trigger if exists trg_activity_sessions_updated_at on public.activity_sessions;
create trigger trg_activity_sessions_updated_at
  before update on public.activity_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- screenshots
-- ---------------------------------------------------------------------------
create table if not exists public.screenshots (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  session_id    uuid not null references public.activity_sessions(id) on delete cascade,
  task_id       uuid references public.tasks(id) on delete set null,
  captured_at   timestamptz not null,
  storage_path  text not null,
  width         integer,
  height        integer,
  created_at    timestamptz not null default now()
);

create index if not exists idx_screenshots_session
  on public.screenshots(session_id, captured_at);
create index if not exists idx_screenshots_org_captured
  on public.screenshots(org_id, captured_at desc);
create index if not exists idx_screenshots_user_captured
  on public.screenshots(user_id, captured_at desc);

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('activity-screenshots', 'activity-screenshots', false)
on conflict (id) do nothing;

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.tasks              enable row level security;
alter table public.activity_sessions  enable row level security;
alter table public.screenshots        enable row level security;

-- ---- tasks: members read + create; managers edit/archive ------------------
drop policy if exists "tasks: members read" on public.tasks;
create policy "tasks: members read" on public.tasks
  for select using (public.is_org_member(org_id));

drop policy if exists "tasks: members create" on public.tasks;
create policy "tasks: members create" on public.tasks
  for insert with check (
    public.is_org_member(org_id)
    and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "tasks: managers update" on public.tasks;
create policy "tasks: managers update" on public.tasks
  for update using (public.is_org_manager(org_id))
  with check (public.is_org_manager(org_id));

drop policy if exists "tasks: managers delete" on public.tasks;
create policy "tasks: managers delete" on public.tasks
  for delete using (public.is_org_manager(org_id));

-- ---- projects: also let plain members create (add-project from desktop) ---
drop policy if exists "projects: members create" on public.projects;
create policy "projects: members create" on public.projects
  for insert with check (public.is_org_member(org_id));

-- ---- activity_sessions: own or manager -----------------------------------
drop policy if exists "sessions: read own or manager" on public.activity_sessions;
create policy "sessions: read own or manager" on public.activity_sessions
  for select using (user_id = auth.uid() or public.is_org_manager(org_id));

drop policy if exists "sessions: insert own" on public.activity_sessions;
create policy "sessions: insert own" on public.activity_sessions
  for insert with check (user_id = auth.uid() and public.is_org_member(org_id));

drop policy if exists "sessions: update own" on public.activity_sessions;
create policy "sessions: update own" on public.activity_sessions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "sessions: delete own or manager" on public.activity_sessions;
create policy "sessions: delete own or manager" on public.activity_sessions
  for delete using (user_id = auth.uid() or public.is_org_manager(org_id));

-- ---- screenshots: own or manager --------------------------------------
drop policy if exists "screenshots: read own or manager" on public.screenshots;
create policy "screenshots: read own or manager" on public.screenshots
  for select using (user_id = auth.uid() or public.is_org_manager(org_id));

drop policy if exists "screenshots: insert own" on public.screenshots;
create policy "screenshots: insert own" on public.screenshots
  for insert with check (user_id = auth.uid() and public.is_org_member(org_id));

drop policy if exists "screenshots: delete own or manager" on public.screenshots;
create policy "screenshots: delete own or manager" on public.screenshots
  for delete using (user_id = auth.uid() or public.is_org_manager(org_id));

-- ---- Storage RLS for activity-screenshots -----------------------------
drop policy if exists "shots: insert own" on storage.objects;
create policy "shots: insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'activity-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shots: delete own" on storage.objects;
create policy "shots: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'activity-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shots: read own or manager" on storage.objects;
create policy "shots: read own or manager" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'activity-screenshots'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_org_manager((((storage.foldername(name))[2]))::uuid)
    )
  );

notify pgrst, 'reload schema';
