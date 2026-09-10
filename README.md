# Jibble Clone

Time tracking &amp; attendance for teams — built with Next.js 16 (App Router,
Turbopack), Supabase (auth + Postgres + RLS), Tailwind v4, and Server Actions.

## Features

- **Clock in / out** — "I'm in / I'm out" toggle with a live running timer, optional project + note
- **Face recognition** — mandatory in-browser face match (face-api.js) on every clock in/out; per-user enrollment; selfies stored privately
- **Attendance** — weekly grid (members × days, Present/Absent/Off) and a monthly hours heatmap with CSV export
- **Timesheet** — weekly view with per-day and weekly totals, week navigation
- **Time entries** — manual add / edit / delete, 30-day history, day grouping
- **Organizations** — create a workspace, switch between workspaces
- **Team** — invite by email (shareable link), roles (`owner` / `admin` / `member`),
  change roles, remove members
- **Projects** — create, recolor, archive (managers only)
- **Reports** — hours grouped by member / project / day, date-range filter, CSV export
- **Profile** & password reset

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
```

Apply the database schema — see [`supabase/README.md`](supabase/README.md).

```bash
npm run dev            # http://localhost:3000
npm run dev -- -p 3001 # or a different port
```

## Project layout

```
app/
  (marketing)/         landing page
  (auth)/              login, register, forgot/update password
  (app)/               authenticated shell + feature pages
    dashboard/ timesheet/ entries/ projects/ team/ reports/ settings/
  onboarding/          create-workspace + invite acceptance
lib/
  supabase/            browser + server clients, proxy session refresh
  queries/             server-only read helpers
  actions/             'use server' mutations (zod-validated)
  time.ts              duration / week-boundary helpers
components/
  ui/ shell/ clock/ entries/ projects/ team/ reports/ settings/
proxy.ts               session refresh + auth redirects (Next 16 "proxy")
supabase/migrations/   0001_init.sql
```
