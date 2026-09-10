-- =============================================================================
-- 0008 — Repair profiles -> auth.users FK so account deletion cascades
--
-- The `profiles` table existed before 0001 (from the original auth module), so
-- `create table if not exists` never applied the intended ON DELETE CASCADE.
-- Deleting an auth.users row then fails:
--   violates foreign key constraint "profiles_id_fkey" on table "profiles"
--
-- Run in the Supabase SQL editor AFTER 0007.
-- =============================================================================

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

-- Harden the delete RPC to clear the profile row explicitly first, so it works
-- even on databases where the FK repair above hasn't run yet.
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

  -- app data cascades from profiles; profile row itself is removed here
  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;

notify pgrst, 'reload schema';
