-- =============================================================================
-- 0009 — Geofenced clock in / out
--
-- One location per organization. When geofence_enabled, the web clock requires
-- the member's device to be within geofence_radius_m of (lat, lng). Enforced
-- server-side in clockInAction / clockOutAction; coordinates are stored on the
-- time entry.
--
-- Run in the Supabase SQL editor AFTER 0008.
-- =============================================================================

alter table public.organizations
  add column if not exists geofence_enabled  boolean not null default false;
alter table public.organizations
  add column if not exists geofence_lat       double precision;
alter table public.organizations
  add column if not exists geofence_lng       double precision;
alter table public.organizations
  add column if not exists geofence_radius_m  integer not null default 150;
alter table public.organizations
  add column if not exists geofence_label     text;

alter table public.organizations
  add constraint organizations_geofence_radius_chk
  check (geofence_radius_m between 20 and 5000) not valid;

-- Per-punch coordinates
alter table public.time_entries
  add column if not exists clock_in_lat          double precision;
alter table public.time_entries
  add column if not exists clock_in_lng          double precision;
alter table public.time_entries
  add column if not exists clock_in_accuracy_m   double precision;
alter table public.time_entries
  add column if not exists clock_out_lat         double precision;
alter table public.time_entries
  add column if not exists clock_out_lng         double precision;
alter table public.time_entries
  add column if not exists clock_out_accuracy_m  double precision;

notify pgrst, 'reload schema';
