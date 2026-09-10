import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_ORG_COOKIE, MANAGER_ROLES } from '@/lib/constants'
import type { Membership, Organization, OrgRole } from '@/lib/types'

/** Returns the signed-in user or redirects to /login. */
export async function requireUser(): Promise<User> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

type MemberOrgRow = {
  role: OrgRole
  org: Organization | null
}

/**
 * Resolves the current user's active organization from the `active_org` cookie,
 * falling back to their first membership. Returns null when the user belongs to
 * no organization (caller should send them to /onboarding).
 */
export async function getMembership(): Promise<Membership | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('org_members')
    .select('role, org:organizations(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as unknown as MemberOrgRow[]
  const memberships = rows.filter((r): r is MemberOrgRow & { org: Organization } => r.org != null)
  if (memberships.length === 0) return null

  const cookieStore = await cookies()
  const preferredId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value
  const active =
    memberships.find((m) => m.org.id === preferredId) ?? memberships[0]

  return {
    org: active.org,
    role: active.role,
    isManager: MANAGER_ROLES.includes(active.role),
    allOrgs: memberships.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      role: m.role,
    })),
  }
}

/** Like getMembership but redirects to /onboarding when there's no org. */
export async function requireMembership(): Promise<Membership> {
  const membership = await getMembership()
  if (!membership) redirect('/onboarding')
  return membership
}

/** For manager-only pages: 404-style redirect to dashboard for plain members. */
export async function requireManager(): Promise<Membership> {
  const membership = await requireMembership()
  if (!membership.isManager) redirect('/dashboard')
  return membership
}
