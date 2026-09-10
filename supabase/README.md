# Database setup

Plain SQL files, applied in order. No Supabase CLI required.

## Apply the migrations

In the [Supabase dashboard](https://supabase.com/dashboard) → **SQL Editor → New query**,
paste and **Run** each file, in order:

1. [`migrations/0001_init.sql`](migrations/0001_init.sql) — core schema
2. [`migrations/0002_profile_relationships.sql`](migrations/0002_profile_relationships.sql) —
   repoints `time_entries` / `org_members` `user_id` FKs to `profiles` so PostgREST
   can embed profile data (fixes `PGRST200`)
3. [`migrations/0003_face_recognition.sql`](migrations/0003_face_recognition.sql) —
   face descriptor + selfie columns, and the private `attendance-selfies` Storage
   bucket with its RLS policies
4. [`migrations/0004_tasks_and_activity.sql`](migrations/0004_tasks_and_activity.sql) —
   `tasks`, `activity_sessions`, `screenshots`, and the private
   `activity-screenshots` bucket (used by the `desktop/` Python tracker); also
   lets plain members create projects/tasks
5. [`migrations/0005_superadmin.sql`](migrations/0005_superadmin.sql) —
   `profiles.is_superadmin` (full cross-org read) + `deactivated_at` (soft
   disable) + `email` (mirrored from `auth.users`); cross-org RLS grants and
   deactivated-write blocks

   Grant yourself super admin afterwards:
   `update public.profiles set is_superadmin = true where email = 'you@example.com';`

Each script is idempotent-ish (`if not exists` / `create or replace` /
`drop policy if exists` / `add column if not exists`), so re-running is safe.

## What it creates

| Object | Purpose |
| --- | --- |
| `profiles` | 1:1 with `auth.users`; auto-populated by the `on_auth_user_created` trigger |
| `organizations`, `org_members` | Multi-tenant workspaces with `owner` / `admin` / `member` roles |
| `invitations` | Pending invites, accepted via the `accept_invitation(token)` RPC |
| `projects` | Per-org projects that time entries can be tagged with |
| `time_entries` | Clock-in/out records (+ per-punch selfie path & face score); a partial unique index enforces one running entry per user |
| `breaks` | Optional breaks within an entry |
| `attendance-selfies` bucket | Private Storage; write to own `<uid>/…` folder, read own or as an org manager |
| `tasks` | Project-scoped; any member can create, managers edit/archive |
| `activity_sessions` + `screenshots` | Desktop tracker timeline + its uploaded screenshots (separate from `time_entries`) |
| `activity-screenshots` bucket | Private Storage; same folder-based RLS as selfies |
| `create_organization(name)` | `SECURITY DEFINER` RPC — creates an org and adds the caller as `owner` |
| RLS policies | Members see their org; managers (`owner`/`admin`) see all entries; users see their own |

## Auth settings

- **Email confirmation ON** (default): after sign-up the user must confirm before a
  session exists. The app shows a "check your inbox" notice and the profile row is
  still created by the trigger.
- **Email confirmation OFF**: sign-up logs the user straight in and routes to
  `/onboarding`.

Set the **Site URL** and add `…/update-password` to **Redirect URLs** under
*Authentication → URL Configuration* so password-reset links work.
