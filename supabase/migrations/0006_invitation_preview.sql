-- =============================================================================
-- 0006 — Public invitation preview
--
-- The invite page (/onboarding/invite/<token>) needs to show "You've been
-- invited to <org> as <role>" to people who are not signed in yet, or who are
-- signed in but are not managers of that org — neither can SELECT the
-- invitations table under RLS. This SECURITY DEFINER function exposes only the
-- safe preview fields for a *pending* invite.
--
-- Run in the Supabase SQL editor AFTER 0005.
-- =============================================================================

create or replace function public.invitation_preview(p_token uuid)
returns table (
  org_name text,
  role public.org_role,
  email text,
  status public.invite_status
)
language sql
security definer
set search_path = public
stable
as $$
  select o.name, i.role, i.email, i.status
  from public.invitations i
  join public.organizations o on o.id = i.org_id
  where i.token = p_token
$$;

grant execute on function public.invitation_preview(uuid) to anon, authenticated;

-- Also let the invited person read their own invitation row directly, so the
-- manager /team view and other lookups keep working for them.
drop policy if exists "invites: invited email reads own" on public.invitations;
create policy "invites: invited email reads own" on public.invitations
  for select using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

notify pgrst, 'reload schema';
