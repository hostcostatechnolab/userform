-- =============================================================================
-- 0007 — Super Admin: permanently delete an account
--
-- Deletes the auth.users row; everything else cascades:
--   profiles, org_members, time_entries, activity_sessions, screenshots,
--   invitations(invited_by), and the auth-schema sessions / refresh tokens.
--
-- Blocked when the target still OWNS an organization (organizations.owner_id is
-- ON DELETE RESTRICT) — reassign or delete those orgs first.
--
-- Storage objects (the user's selfies / screenshots under <uid>/...) are NOT
-- removed by the cascade; they're orphaned in the private buckets. Clean them
-- from Storage manually if needed.
--
-- Run in the Supabase SQL editor (as postgres) AFTER 0006. Irreversible.
-- =============================================================================

create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Not authorized';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own account';
  end if;

  if exists (
    select 1 from public.profiles
    where id = p_user_id and is_superadmin = true
  ) then
    raise exception 'Super admins cannot be deleted';
  end if;

  if exists (select 1 from public.organizations where owner_id = p_user_id) then
    raise exception
      'This user still owns one or more organizations — reassign or delete those first';
  end if;

  delete from auth.users where id = p_user_id;
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;

notify pgrst, 'reload schema';
