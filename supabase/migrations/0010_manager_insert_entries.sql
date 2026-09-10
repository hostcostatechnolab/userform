-- =============================================================================
-- 0010 — Let managers insert time entries on behalf of a member
--
-- The `entries: insert own` policy required user_id = auth.uid(), so the
-- "Add entry → Team member" flow failed with:
--   new row violates row-level security policy for table "time_entries"
--
-- Now: insert allowed when it's your own row, OR you're a manager of the org
-- and the target user is a member of that same org. Deactivated users still
-- cannot insert.
--
-- Run in the Supabase SQL editor AFTER 0009.
-- =============================================================================

drop policy if exists "entries: insert own" on public.time_entries;
drop policy if exists "entries: insert own or manager" on public.time_entries;

create policy "entries: insert own or manager" on public.time_entries
  for insert with check (
    public.is_active()
    and public.is_org_member(org_id)
    and (
      user_id = auth.uid()
      or (
        public.is_org_manager(org_id)
        and exists (
          select 1 from public.org_members m
          where m.org_id = time_entries.org_id
            and m.user_id = time_entries.user_id
        )
      )
    )
  );

notify pgrst, 'reload schema';
