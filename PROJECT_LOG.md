# Jibble Clone — Project Log

A running record of what this project is, what's been built, the decisions behind
it, and what's next. Read this first when picking the work back up.

- **Repo:** `hostcostatechnolab/userform`
- **Local path:** `d:\Projects\Websites\J\jibble\userform`
- **Supabase project:** `https://hwxhfabnulhtwitentmj.supabase.co`
- **Stack:** Next.js 16.3.3 (App Router, Turbopack) · React 19 · Tailwind v4 ·
  Supabase (`@supabase/ssr`) · react-hook-form + zod · lucide-react
- **Dev server:** `npm run dev -- -p 3001` → http://localhost:3001

---

## ⚠️ Required setup (run each migration once, in order)

In [supabase.com/dashboard](https://supabase.com/dashboard) → project → **SQL Editor → New query**,
paste and run each file:

1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — core schema *(done)*
2. [`supabase/migrations/0002_profile_relationships.sql`](supabase/migrations/0002_profile_relationships.sql) — FK fix for profile embeds *(done)*
3. [`supabase/migrations/0003_face_recognition.sql`](supabase/migrations/0003_face_recognition.sql) — face columns + `attendance-selfies` bucket *(done)*
4. [`supabase/migrations/0004_tasks_and_activity.sql`](supabase/migrations/0004_tasks_and_activity.sql) — `tasks`, `activity_sessions`, `screenshots` + `activity-screenshots` bucket **(run this)**
5. [`supabase/migrations/0005_superadmin.sql`](supabase/migrations/0005_superadmin.sql) — `profiles.is_superadmin` / `deactivated_at` / `email`, cross-org RLS grants, deactivated-write blocks **(run this)**
6. [`supabase/migrations/0006_invitation_preview.sql`](supabase/migrations/0006_invitation_preview.sql) — `invitation_preview(token)` RPC + invited-email read policy so the invite link works for logged-out / non-manager users **(run this)**
7. [`supabase/migrations/0007_admin_delete_user.sql`](supabase/migrations/0007_admin_delete_user.sql) — `admin_delete_user(id)` RPC (super admin permanently deletes an account; blocked if they own an org) **(run this)**
8. [`supabase/migrations/0008_fix_profiles_cascade.sql`](supabase/migrations/0008_fix_profiles_cascade.sql) — repair `profiles_id_fkey` to `ON DELETE CASCADE` (the old table pre-dated 0001) so account deletion actually works **(run this)**

Grant yourself super admin after 0005:
`update public.profiles set is_superadmin = true where email = 'you@example.com';`

Also, under **Authentication → URL Configuration**: set **Site URL** and add
`<site>/update-password` to **Redirect URLs** so password-reset links work.

**Camera:** `getUserMedia` needs a secure context — works on `localhost`, but a
deployed site must be **HTTPS** or Face ID capture will fail.

**Desktop app:** [`desktop/`](desktop/README.md) — CustomTkinter Python tracker.
Needs Python 3.10+ (not installed on this machine yet). `pip install -r
desktop/requirements.txt` then `python desktop/run.py`.

Env (`.env.local`, already present locally — see [`.env.example`](.env.example)):

```
NEXT_PUBLIC_SUPABASE_URL=https://hwxhfabnulhtwitentmj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable__...
```

---

## Timeline

### 2026-09-10 — Session 4 (cont.) — Super Admin: permanent account delete

- SQL `0007_admin_delete_user.sql`: `admin_delete_user(p_user_id)` SECURITY
  DEFINER RPC — checks `is_superadmin()`, not self, not another superadmin, and
  that the target owns no organization (`organizations.owner_id` is ON DELETE
  RESTRICT), then `delete from auth.users` (profiles / org_members / time_entries
  / activity_sessions / screenshots / invitations all cascade). Storage objects
  are left orphaned — noted.
- `lib/actions/admin.ts` → `deleteUserAction`; `UsersTable` gains a trash button
  that requires typing the exact email to confirm.
- Follow-up `0008_fix_profiles_cascade.sql`: the deployed DB had `profiles_id_fkey`
  WITHOUT `on delete cascade` (the table pre-dated 0001's `create table if not
  exists`), so `delete from auth.users` failed. 0008 drops/re-adds the FK with
  cascade and hardens the RPC to delete the profile row first.

### 2026-09-10 — Session 4 (cont.) — Fix invitation link for new users

Reported: opening `/onboarding/invite/<token>` while logged out just bounced to
`/login`, and a new invitee ended up on `/onboarding` (create workspace) with no
sign of the invite. Two root causes: the route was auth-gated by the proxy, and
`invitations` RLS only lets *managers* SELECT (an invitee is not one yet).

- SQL `0006_invitation_preview.sql`: `invitation_preview(p_token)` SECURITY
  DEFINER RPC (granted to anon + authenticated) returning org name / role /
  email / status for a pending invite; plus an `invitations` SELECT policy for
  `lower(email) = auth.jwt()->>'email'`.
- `proxy.ts` — `PUBLIC_EXCEPTIONS = ['/onboarding/invite/']` so logged-out users
  reach the page.
- Invite page rewritten: uses the RPC; four states — invalid, logged-out (Create
  account / I have an account, both carrying `?redirect` + `?email`), wrong
  account (sign out), ready-to-accept.
- `AuthForm` — carries `?redirect` + `?email` across the login/register toggle,
  prefills the email, and on register-with-session pushes to `redirect` instead
  of `/onboarding` (and the "check your inbox" copy tells invitees to reopen the
  link).

### 2026-09-10 — Session 4 — Platform Super Admin + account deactivation

Decisions: **full cross-org read** for super admins · **soft deactivation**
(`profiles.deactivated_at`, proxy signs them out, RLS refuses writes — no service
key) · granted **only via SQL** (no UI to promote).

**SQL `0005_superadmin.sql`:**
- `profiles.is_superadmin` / `deactivated_at` / `email` (email mirrored from
  `auth.users` via `handle_new_user` + an `on_auth_user_email_change` trigger,
  backfilled)
- `public.is_superadmin()` / `public.is_active()` SECURITY DEFINER predicates
- RLS: `or public.is_superadmin()` added to every table's SELECT policy
  (profiles, organizations, org_members, invitations, projects, tasks,
  time_entries, activity_sessions, screenshots) + the two storage read policies;
  `and public.is_active()` added to the key write policies so a deactivated user
  with a stale token still can't write

**App:**
- `lib/queries/org.ts` → `getViewer()` / `requireSuperadmin()`
- `lib/supabase/proxy.ts` — on gated routes, look up `deactivated_at`; if set,
  redirect to `/deactivated`. Added `/attendance` `/monthly` `/activity` `/admin`
  to `PROTECTED_PREFIXES`.
- `lib/queries/admin.ts` (`getAdminStats`, `listAllOrganizations`,
  `getOrganizationDetail`, `listAllUsers`) · `lib/actions/admin.ts`
  (`setUserDeactivatedAction` — superadmin only, can't hit self or another
  superadmin)
- `app/admin/` route group with its own layout (`requireSuperadmin`, own
  `AdminNav`): `/admin` overview + recent orgs, `/admin/organizations` list,
  `/admin/organizations/[id]` (members + 30-day entries + `ActivityView embedded`
  for screenshots), `/admin/users` (`UsersTable` — search + Deactivate/Reactivate)
- `app/deactivated/page.tsx` (public) · Sidebar shows a "Super Admin" link when
  `profile.is_superadmin`
- `ActivityView` gained an `embedded` prop (hide header/toggle)
- `tsc` + `next build` clean (23 routes)

### 2026-09-08 — Session 3 — Python desktop tracker + screenshots

Decisions: **CustomTkinter** GUI · **configurable interval, default 5 min** ·
**all monitors stitched into one JPEG** · **separate activity log** (desktop
sessions are NOT merged into the website timesheet / attendance / reports).

**Database — `0004_tasks_and_activity.sql`:**
- `tasks` (project-scoped; any member can insert, managers edit/archive)
- `activity_sessions` (desktop timeline: project_id, task_id, started/ended,
  app_version; partial unique index = one open session per user)
- `screenshots` (one row per capture: session_id, task_id, captured_at,
  storage_path, w/h)
- private bucket `activity-screenshots` + `storage.objects` RLS (write own
  folder, read own or `is_org_manager(path[2])`)
- also added a `projects` **insert** policy for plain members (add-project from
  desktop)

**Web side:**
- `lib/queries/tasks.ts`, `lib/actions/tasks.ts` (createTask / setTaskArchived)
- `lib/queries/activity.ts` — `listSessions` (embeds project/task/profile +
  `screenshots(count)`), `getSessionScreenshots` (signed URLs)
- `lib/queries/photos.ts` generalised to `signPaths(bucket, …)` +
  `signSelfies` / `signScreenshots` wrappers
- `/projects` reworked → **Projects & Tasks**: each project card expands to a
  task list with inline add + archive (`ProjectsManager` + `ProjectCard`)
- new `/activity` page (members see own, managers get a Mine/Everyone toggle) —
  `ActivityView`: session cards, expand to lazy-load a screenshot thumbnail grid
  via `loadSessionScreenshotsAction`
- nav: `/activity` "Activity" (all members), `Monitor` icon
- `tsc` + `next build` clean (19 routes)

**Desktop app — `desktop/` (new):**
- `jibble_tracker/`: `config.py` (baked URL + anon key, `%APPDATA%` state),
  `store.py` (settings.json + session.json refresh token), `api.py` (supabase-py
  wrapper: auth, orgs, projects, tasks, sessions, screenshot upload),
  `capture.py` (mss + Pillow → one JPEG, ≤2560px, q55), `tracker.py`
  (`ScreenshotWorker` thread: first shot ~8s, then every N min), `app.py`
  (CustomTkinter: login → project/task pickers + ＋ add · interval menu ·
  Start/Stop · elapsed clock · resumes an open session on relaunch).
- `run.py`, `requirements.txt`, `README.md`, `.gitignore`.
- **Could not run/lint here — no Python on the machine.** Reviewed by hand.
- Auth assumption: supabase-py v2 propagates the JWT to postgrest/storage on
  `sign_in` / `refresh_session` via auth-state events (holds for >= 2.5).

### 2026-09-03 — Session 2 (cont.) — Face recognition on clock in/out

Decisions: **selfie + in-browser face match** (not just capture), **always
required** for every clock in AND clock out.

- Library: `@vladmandic/face-api` (`tinyFaceDetector` + `faceLandmark68Net` +
  `faceRecognitionNet`, ~6.8MB weights). `scripts/copy-face-models.mjs` copies
  the needed weights → `public/models/` (git-ignored); wired into `predev` /
  `prebuild` npm scripts. Models served from `/models`.
- `lib/face/index.ts` — lazy singleton loader, `detectSingleDescriptor()` (throws
  on 0 or >1 faces), `descriptorDistance()` (euclidean), `isMatch()` (≤ 0.5, env
  `NEXT_PUBLIC_FACE_MATCH_THRESHOLD`), `captureJpeg()`. `lib/face/upload.ts` —
  `uploadSelfie(blob, {userId, orgId, kind})` → `<uid>/<org>/<kind>-<uuid>.jpg`.
- `lib/queries/photos.ts` — `signSelfies(paths)` batch-signs (30 min) for manager views.
- SQL `0003_face_recognition.sql`: `profiles.face_descriptor jsonb` +
  `face_photo_path`; `time_entries.clock_in/out_photo_path` +
  `clock_in/out_face_score`; private bucket `attendance-selfies` + `storage.objects`
  RLS (write own folder; read own or `is_org_manager(path[2])`).
- `lib/actions/face.ts` — `enrollFaceAction({descriptor, photoPath})`,
  `clearFaceAction()`. `clockInAction` / `clockOutAction` now **require**
  `{photoPath, faceScore}` (zod), and check the path is under the caller's uid.
- `components/face/FaceCaptureDialog.tsx` — reusable camera modal (model load →
  getUserMedia → capture → detect → in verify mode compare to reference &
  block on mismatch → hand `{descriptor, blob, distance}` to caller). Handles
  permission-denied / no-camera / no-face / multi-face.
- `components/face/FaceEnrollCard.tsx` on `/settings/profile` — set up / re-enroll
  / remove; shows the enrolled photo (signed URL).
- `ClockCard` reworked: if not enrolled → blocking "Face ID required" card linking
  to settings; otherwise the I'm-in / I'm-out buttons open `FaceCaptureDialog`
  (verify) then upload + call the action.
- Manager views show the punch selfies: `AttendanceDayDialog` renders in/out
  thumbnails (signed URLs threaded from `/attendance` + `/monthly` pages through
  `AttendanceGrid` / `MonthlyHeatmap`).
- **Known limitation:** the match is trusted client-side (no server re-check —
  that needs `@tensorflow/tfjs-node`). The stored `face_score` + selfie are the
  audit trail. No liveness detection.
- `tsc` + `next build` clean (18 routes).

### 2026-09-03 — Session 2 (cont.) — Monthly heatmap timesheet

User shared a Jibble "Monthly Timesheets" screenshot and asked for the same.
Decisions: **new view** (not a toggle on /attendance); **hours-only heatmap**
(shade scales with hours, no leave/holiday/threshold concept).

- `lib/queries/attendance.ts` → `getMonthlyTimesheet({orgId, ref})` → member ×
  day-of-month cells (totalMs, entries), per-member total, `dailyTotalsMs`, grand total.
- `components/timesheets/MonthlyHeatmap.tsx` — sticky member col + sticky Total
  col, day columns = small emerald-shaded squares (6-step ramp: 0 / <2 / <4 / <6 /
  <8 / ≥8 h), number = rounded hours, weekends dimmed, today ringed. Click a
  square → reuses `AttendanceDayDialog`. CSV export = `Member,1..31,Total` matrix
  in decimal hours + a Total row.
- `app/(app)/monthly/page.tsx` — managers only, `?m=<offset>` month nav, team
  total card.
- Nav: `/monthly` "Monthly" (managerOnly), `CalendarRange` icon.
- New-route note: `PageProps<'/monthly'>` fails until Next regenerates route types;
  used an inline `{ searchParams: Promise<Record<...>> }` type instead.
- `tsc` + `next build` clean (18 routes).

### 2026-09-03 — Session 2

**Applied:** user ran `0001_init.sql` in Supabase.

**Bug found:** `/dashboard` threw `PGRST200 — no relationship between 'time_entries'
and 'profiles'`. The API queries embed `profile:profiles(...)` but `user_id` FK'd
to `auth.users`, not `profiles`. **Fix:** `0002_profile_relationships.sql`
repoints `time_entries.user_id` and `org_members.user_id` FKs to
`public.profiles(id)` (+ backfills profile rows for existing users + `notify
pgrst`). `0001_init.sql` updated to match for fresh installs. **User must run
`0002` in the SQL editor.**

**Feature added — Attendance:**
- Decisions: admin **daily grid** (members × days of a week); "Absent" = weekday
  with no entries (weekends = "Off", no schedule config); members get a simple
  **"I'm in / I'm out" toggle**.
- `ClockCard` reworked into the big in/out toggle; project + note moved behind an
  "Add project or note" disclosure (collapsed by default).
- New `/attendance` page (managers only) — `lib/queries/attendance.ts`
  `getAttendanceGrid({orgId, ref})` → members × 7 days with first-in / last-out /
  total / status. `components/attendance/AttendanceGrid.tsx` renders the table;
  clicking a cell opens `AttendanceDayDialog.tsx` (list + inline add/edit/delete
  of that day's clock records for that member).
- Reuses `addManualEntryAction` / `updateEntryAction` / `deleteEntryAction`
  (already support manager-on-behalf via `user_id` + `assertManager`).
- Nav: `NAV_ITEMS` gains `/attendance` (managerOnly); `ClipboardCheck` icon.
- `tsc` + `next build` clean (17 routes).

### 2026-08-27 — Session 1

**Starting point:** repo cloned. It was a Next.js 16 + Supabase **auth module only**:
combined login/signup page, profile edit, forgot/update password, session
middleware. No database schema in the repo; UI was Create-Next-App boilerplate.

**Goal set by user:** turn it into a **Jibble.io-style time tracking & attendance
app**.

**Decisions:**

| Question | Choice |
| --- | --- |
| Multi-tenancy | **Teams from day one** — organizations + members + roles, every entry org-scoped |
| DB schema delivery | **Manual SQL files** (`supabase/migrations/*.sql`), no Supabase CLI |
| Data mutations | **Server Actions** (`lib/actions/*.ts`), zod-validated — not client-side supabase calls |
| Scope for the pass | **Everything through Phase 2** (foundation + MVP + projects/teams/reports) |
| Roles | `owner` / `admin` / `member`; owner+admin = "managers" (see all timesheets, manage projects/team) |
| Product name | Placeholder `"Jibble Clone"` — single constant `APP_NAME` in `lib/constants.ts` |
| Time handling | Store UTC `timestamptz`, render local, week starts **Monday** |

**Issues found in the original code and fixed:**

1. `utils/supabase/server.ts` — `cookies()` wasn't awaited (Next 16 requires
   `await cookies()` + async factory) and used the deprecated `get/set/remove`
   cookie API. Rewritten with `getAll/setAll`, moved to `lib/supabase/server.ts`.
2. `middleware.ts` — deprecated in Next 16. Renamed to `proxy.ts`
   (`export function proxy`), matcher extended to guard all app routes.
3. Signup upserted the `profiles` row from the client right after `signUp()` —
   fails under RLS when email confirmation is on (no session yet). Replaced with a
   Postgres trigger `handle_new_user()` on `auth.users`; the client now passes
   `full_name`/`phone_number` via `options.data` and shows a "check your inbox"
   notice when there's no session.
4. No DB schema existed. Added `supabase/migrations/0001_init.sql`.
5. Boilerplate `app/page.tsx` / metadata replaced.

**Verification:** `npx tsc --noEmit` clean · `npx next build` clean (16 routes +
Proxy) · dev smoke test: `/` 200, `/login` 200, `/dashboard` → 307 to `/login`.

---

## Database schema (`supabase/migrations/0001_init.sql`)

| Object | Purpose |
| --- | --- |
| `profiles` | 1:1 with `auth.users`; auto-created by `on_auth_user_created` trigger. `ALTER … ADD COLUMN IF NOT EXISTS` backfills columns if the table pre-existed |
| `organizations` | Workspaces; `owner_id` FK |
| `org_members` | `(org_id, user_id)` PK, `role` enum `owner/admin/member` |
| `invitations` | `(org_id, email)` unique, `status` enum, random `token`; accepted via RPC |
| `projects` | Per-org, `name` / `color` / `archived` |
| `time_entries` | `org_id, user_id, project_id?, started_at, ended_at?, note, source(web/manual)`. Partial unique index `uniq_running_entry_per_user` = one open entry per user. `CHECK (ended_at is null or ended_at >= started_at)` |
| `breaks` | Optional breaks within an entry |

**Functions (all `SECURITY DEFINER`):**
- `is_org_member(org)` / `is_org_manager(org)` — used by RLS, avoids recursion
- `create_organization(name)` — inserts org + `owner` membership atomically
- `accept_invitation(token)` — validates email match, adds membership, marks accepted
- `set_updated_at()` — generic `updated_at` trigger

**RLS summary:** members can read their org / its projects / its members;
managers can write projects, members, invitations; time entries are readable by
their owner **or** an org manager; users write their own entries (managers can
write for anyone).

---

## File map

```
proxy.ts                     session refresh + auth redirects (was middleware.ts)

app/
  layout.tsx                 root — metadata from lib/constants
  (marketing)/page.tsx       landing; redirects to /dashboard if signed in
  (auth)/
    layout.tsx               centered card
    login/page.tsx           <AuthForm mode="login">  (Suspense-wrapped)
    register/page.tsx        <AuthForm mode="register">
    forgot-password/page.tsx
    update-password/page.tsx
  (app)/
    layout.tsx               requireUser + requireMembership; renders shell
    dashboard/page.tsx       ClockCard (I'm in/out toggle) + today/week totals + today's entries
    timesheet/page.tsx       week view, ?w=<offset>, per-day + week totals
    entries/page.tsx         30-day history grouped by day; ?scope=all for managers
    attendance/page.tsx      requireManager; ?w=<offset>; weekly grid members × days
    monthly/page.tsx         requireManager; ?m=<offset>; monthly heatmap members × day-of-month + CSV
    activity/page.tsx        any member (own) / manager ?scope=all; desktop sessions + screenshot grid
    projects/page.tsx        requireManager; ProjectsManager (projects + per-project tasks)
app/admin/  (own layout — requireSuperadmin, AdminNav)
  page.tsx                 stats tiles + recent orgs
  organizations/page.tsx   all orgs (member/project counts, owner)
  organizations/[id]/page  one org: members + 30d entries + embedded ActivityView
  users/page.tsx           all users; UsersTable = search + Deactivate/Reactivate
app/deactivated/page.tsx   public; where the proxy sends disabled accounts
    team/page.tsx            requireManager; TeamManager
    reports/page.tsx         requireManager; ?from&to&groupBy; ReportsView (Suspense)
    settings/profile/page.tsx
  onboarding/
    page.tsx                 CreateOrgForm (redirects out if already in an org)
    invite/[token]/page.tsx  AcceptInvite

lib/
  constants.ts               APP_NAME, ORG_ROLES, MANAGER_ROLES, NAV_ITEMS, PROJECT_COLORS, ACTIVE_ORG_COOKIE
  types.ts                   Profile, Organization, OrgMember(WithProfile), Invitation, Project, TimeEntry(Detailed), Membership
  time.ts                    entryDurationMs, formatDuration/Clock, toDecimalHours, startOfWeek/endOfWeek/weekDays/addWeeks, localDayKey, toDatetimeLocalValue
  utils.ts                   cn(), initials()
  action-result.ts           ActionResult<T>, ok(), fail(), toMessage()  (client-safe)
  face/
    index.ts                 loadFaceApi(), detectSingleDescriptor(), descriptorDistance(), isMatch(), captureJpeg()
    upload.ts                uploadSelfie(blob, {userId, orgId, kind}) → object path
  supabase/
    client.ts                createBrowserClient
    server.ts                async createClient() — await cookies(), getAll/setAll
    proxy.ts                 updateSession(): refresh cookie + redirect rules
  queries/  (server-only reads)
    org.ts                   requireUser, getMembership, requireMembership, requireManager,
                             getViewer, requireSuperadmin
    admin.ts                 getAdminStats, listAllOrganizations, getOrganizationDetail, listAllUsers
    time.ts                  getRunningEntry, getEntries({orgId,from,to,userId?,projectId?}), getEntryById
    projects.ts              listProjects(orgId, {includeArchived})
    team.ts                  listMembers, listInvitations, getInvitationByToken
    reports.ts               getReport({orgId,from,to,groupBy}) → rows + totalMs + entries
    tasks.ts                 listTasks(orgId, {projectId?, includeArchived?})
    activity.ts              listSessions({orgId,from,to,userId?}), getSessionScreenshots(sessionId)
    photos.ts                signPaths(bucket, paths); signSelfies / signScreenshots wrappers (30 min)
    attendance.ts            getAttendanceGrid({orgId,ref}) → members × 7 days, first-in/last-out/total/status;
                             getMonthlyTimesheet({orgId,ref}) → members × day-of-month, totalMs + entries per cell
  actions/  ('use server')
    helpers.ts               getActionContext() → {supabase,user,membership}; assertManager()
    auth.ts                  signOutAction
    face.ts                  enrollFaceAction, clearFaceAction
    tasks.ts                 createTaskAction, setTaskArchivedAction
    activity.ts              loadSessionScreenshotsAction
    admin.ts                 setUserDeactivatedAction, deleteUserAction (superadmin only)
    org.ts                   createOrganization, switchOrganization, invite/revoke, updateMemberRole, removeMember, acceptInvitation
    time.ts                  clockIn/clockOut (now require {photoPath, faceScore}), addManualEntry, updateEntry, deleteEntry
    projects.ts              createProject, updateProject, setProjectArchived
    profile.ts               updateProfile

components/
  ui/         button, card, field (Input/Textarea/Select/Label/FieldError),
              misc (Spinner/Badge/Alert/EmptyState/ColorDot), modal, use-action.ts
  auth/       AuthForm
  shell/      Sidebar, Topbar, OrgSwitcher, UserMenu, MobileNav, nav-icons
  clock/      ClockCard (in/out toggle; blocks until Face ID enrolled; opens FaceCaptureDialog), LiveTimer
  face/       FaceCaptureDialog (camera + detect + match), FaceEnrollCard (settings/profile)
  attendance/ AttendanceGrid, AttendanceDayDialog (shows in/out selfie thumbnails)
  timesheets/ MonthlyHeatmap (reuses AttendanceDayDialog)
  entries/    EntryList, EntryFormDialog
  activity/   ActivityView (session cards + lazy screenshot grid; `embedded` prop)
  admin/      AdminNav, UsersTable
  projects/   ProjectsManager + ProjectCard (per-project task list), ProjectFormDialog
  team/       TeamManager
  reports/    ReportsView
  settings/   ProfileForm
  onboarding/ CreateOrgForm, AcceptInvite

desktop/  (Python 3.10+, CustomTkinter — separate app, not built/linted here)
  run.py · requirements.txt · README.md
  jibble_tracker/
    config.py    baked SUPABASE_URL + anon key; %APPDATA%/jibble-tracker state
    store.py     settings.json (interval, last project/task) + session.json (refresh token)
    api.py       supabase-py wrapper: auth, orgs, projects, tasks, sessions, screenshot upload
    capture.py   mss + Pillow → one JPEG of all monitors (≤2560px, q55)
    tracker.py   ScreenshotWorker thread — first shot ~8s, then every N min
    app.py       CustomTkinter UI (login → pickers → Start/Stop → resume open session)
```

**Patterns:**
- Pages are Server Components: resolve `requireMembership()` / `requireManager()`,
  fetch via `lib/queries/*`, pass plain data to client components.
- Client components call Server Actions through the `useAction()` hook
  (`{ pending, error, success, run }`) which surfaces `ActionResult` errors and
  re-throws Next's `redirect()`.
- Active org is remembered in the `active_org` cookie; `OrgSwitcher` sets it and
  `revalidatePath('/', 'layout')`.

---

## Status

**Done — Phase 0 (foundation):** supabase client fix · proxy rename + guards ·
route groups · authed shell · constants/types/time/queries/actions · metadata ·
landing · `.env.example` · schema file.

**Done — Phase 1 (time MVP):** clock in/out + live timer · dashboard totals ·
timesheet week view · entries list with manual add/edit/delete.

**Done — Phase 2 (teams):** organizations + onboarding · org switcher ·
invitations (link-based) · roles + member management · projects CRUD/archive ·
reports (group by member/project/day) + CSV export.

**Done — Attendance (Session 2):** member "I'm in / I'm out" toggle · admin
`/attendance` weekly grid (members × week) with first-in/last-out/total/status ·
`/monthly` heatmap timesheet (members × day-of-month, hours-shaded squares, month
nav, per-member + team totals, CSV export) · click any cell to add/edit/delete
that day's clock records · Present/Absent/Off (no schedule config).

**Done — Face recognition (Session 2):** `@vladmandic/face-api` in-browser
enrollment (`/settings/profile`) + mandatory face match on every clock in/out ·
selfies stored in a private Storage bucket · manager views show in/out thumbnails ·
match trusted client-side (see Known limitation above).

**Done — Super Admin (Session 4):** platform role (`profiles.is_superadmin`, set
via SQL only) with cross-org read of every workspace's data; `/admin` area
(overview, org list, org detail with members + entries + screenshots, user
directory); soft account **deactivation** (`deactivated_at` → proxy sign-out +
RLS write-block) toggled from `/admin/users`.

**Done — Desktop tracker + screenshots (Session 3):** `tasks` per project ·
`/projects` → Projects & Tasks with inline task add/archive · Python CustomTkinter
app in `desktop/` (login, pick/create project+task, Start/Stop → `activity_sessions`
row + a screenshot every N min into `activity-screenshots`) · `/activity` page shows
sessions + screenshot grids (own for members, all for managers). Desktop sessions
are a separate log — not in timesheet/attendance/reports. Python app unrun (no
interpreter on this machine).

**Not started — Phase 3 (Jibble extras):**
- Liveness detection + server-side face re-verification (`@tensorflow/tfjs-node`)
- Geolocation capture on clock-in
- Break tracking UI (table + policies already exist)
- Work-schedule config (so "Absent" respects real working days / half-days)
- Attendance CSV/PDF export (monthly sheet)
- Scheduled shifts, overtime rules, holidays
- Approvals workflow (manager approves a member's week)
- Email delivery for invitations (currently copy-link only) — e.g. Supabase +
  Resend, or an Edge Function
- PWA / kiosk mode
- Realtime "who's working now" board
- Tests (none yet)

**Known gaps / follow-ups:**
- Invitations are shared as links; no email is sent.
- No rate-limiting on Server Actions beyond RLS.
- `getReport` aggregates in JS (fetches entries in range) — fine at small scale,
  revisit with a SQL view / RPC if orgs get large.
- `AuthForm` resolver is cast to `any` to union two zod schemas — cosmetic.
- Reports date inputs assume the browser locale parses `YYYY-MM-DD` (they do).

---

## Commands

```bash
npm install
npm run dev -- -p 3001     # dev on http://localhost:3001
npx tsc --noEmit           # typecheck
npx next build             # production build
```

## Environment notes

- `gh` CLI is **not installed** on this machine — clone with
  `git clone https://github.com/<org>/<repo>.git`.
- `git` at `C:\Program Files\Git\cmd\git.exe`; node v24, npm 11.
- Next 16 = Turbopack; `middleware` convention is now `proxy`.
