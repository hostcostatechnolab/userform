-- =============================================================================
-- 0011 — Only managers / super admins may edit or delete time entries
--
-- Members previously had UPDATE/DELETE on their own rows. Now:
--   * UPDATE  → managers + super admins only
--   * DELETE  → managers + super admins only
--   * INSERT  → unchanged (own row for clock-in, or a manager for a member)
--
-- Clock-out is an UPDATE, so it moves to a SECURITY DEFINER RPC that closes the
-- caller's own running entry.
--
-- Run in the Supabase SQL editor AFTER 0010.
-- =============================================================================

drop policy if exists "entries: update own or manager" on public.time_entries;
create policy "entries: managers update" on public.time_entries
  for update using (
    (public.is_org_manager(org_id) or public.is_superadmin()) and public.is_active()
  )
  with check (
    (public.is_org_manager(org_id) or public.is_superadmin()) and public.is_active()
  );

drop policy if exists "entries: delete own or manager" on public.time_entries;
create policy "entries: managers delete" on public.time_entries
  for delete using (
    public.is_org_manager(org_id) or public.is_superadmin()
  );

-- ---- Clock-out RPC: member closes their own running entry ----------------
create or replace function public.close_my_entry(
  p_photo_path   text,
  p_face_score   double precision,
  p_lat          double precision default null,
  p_lng          double precision default null,
  p_accuracy_m   double precision default null
)
returns public.time_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.time_entries;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row
  from public.time_entries
  where user_id = auth.uid() and ended_at is null
  order by started_at desc
  limit 1
  for update;

  if v_row.id is null then
    raise exception 'You are not clocked in';
  end if;

  if p_photo_path is null or position((auth.uid()::text || '/') in p_photo_path) <> 1 then
    raise exception 'Invalid verification photo';
  end if;

  update public.time_entries
  set ended_at             = now(),
      clock_out_photo_path = p_photo_path,
      clock_out_face_score = p_face_score,
      clock_out_lat        = p_lat,
      clock_out_lng        = p_lng,
      clock_out_accuracy_m = p_accuracy_m,
      updated_at           = now()
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.close_my_entry(text, double precision, double precision, double precision, double precision)
  to authenticated;

notify pgrst, 'reload schema';
