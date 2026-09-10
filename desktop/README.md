# Jibble Tracker — desktop companion

A small CustomTkinter app that logs in with the same account as the website,
lets you pick / create a **project** and **task**, and on **Start** records an
**activity session** while uploading a **screenshot every N minutes**. Everything
shows up on the website under **Activity & Screenshots** (`/activity`).

Desktop sessions are a *separate* log — they do **not** appear in the website's
timesheet / attendance / reports (those are the browser clock-in/out with face
verification).

## Requirements

- Python 3.10+
- The database migrations through `0004_tasks_and_activity.sql` applied (creates
  `tasks`, `activity_sessions`, `screenshots`, and the `activity-screenshots`
  Storage bucket).

## Run

```bash
cd desktop
cp .env.example .env          # then fill in the Supabase URL + anon key
python -m venv .venv
# Windows (Git Bash):
source .venv/Scripts/activate
# Windows (PowerShell):  .venv\Scripts\Activate.ps1
# macOS/Linux:           source .venv/bin/activate

pip install -r requirements.txt
python run.py
```

Config is read from the environment, falling back to `desktop/.env`:

| Variable | Notes |
| --- | --- |
| `JIBBLE_SUPABASE_URL` | **required** — same as the website's `NEXT_PUBLIC_SUPABASE_URL` |
| `JIBBLE_SUPABASE_ANON_KEY` | **required** — the publishable key; safe in a client (RLS protects data), kept out of the repo |
| `JIBBLE_WEBSITE_URL` | optional, default `http://localhost:3001` — used by the "Website" button |

The app shows a "Backend is not configured" screen until the two required values
are set.

## How it works

| Step | What happens |
| --- | --- |
| Sign in | `sign_in_with_password`; the refresh token is saved to `%APPDATA%\jibble-tracker\session.json` if "Keep me signed in" is checked |
| Pick / add project & task | Direct inserts into `projects` / `tasks` — RLS lets any member create them |
| Start | Inserts one `activity_sessions` row (`started_at`, `project_id`, `task_id`, `app_version`). A background thread then captures all monitors as one JPEG and uploads to `activity-screenshots/<uid>/<org>/<uuid>.jpg` + a `screenshots` row, every N minutes (first shot ~8 s after start) |
| Stop | Sets `ended_at` on the session and stops the capture thread |
| Crash / relaunch | On login it finds any still-open session for you and resumes it |

Interval is configurable in-app (1–15 min) and remembered.

## Packaging (optional)

```bash
pip install pyinstaller
pyinstaller --noconfirm --windowed --name "JibbleTracker" run.py
```

`customtkinter` ships data files; if the build can't find its theme, add
`--collect-all customtkinter`.

## Notes / limits

- Screenshots are full-desktop captures, downscaled to 2560px wide, JPEG q55.
- No idle detection, no blur/redaction, no server-side verification — this is a
  straightforward tracker.
- `session.json` stores a refresh token in plain text under your user profile.
  For a hardened build, swap `store.py` for the `keyring` package.
