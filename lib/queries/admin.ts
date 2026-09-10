/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { startOfWeek } from '@/lib/time'
import type {
  ActivitySessionDetailed,
  Organization,
  OrgRole,
  Profile,
  TimeEntryDetailed,
} from '@/lib/types'

export interface AdminStats {
  organizations: number
  users: number
  deactivated: number
  superadmins: number
  sessionsThisWeek: number
  entriesThisWeek: number
}

async function count(table: string, mutate?: (q: any) => any): Promise<number> {
  const supabase = await createClient()
  let q = supabase.from(table).select('*', { count: 'exact', head: true })
  if (mutate) q = mutate(q)
  const { count: c } = await q
  return c ?? 0
}

export async function getAdminStats(): Promise<AdminStats> {
  const weekStart = startOfWeek().toISOString()
  const [organizations, users, deactivated, superadmins, sessionsThisWeek, entriesThisWeek] =
    await Promise.all([
      count('organizations'),
      count('profiles'),
      count('profiles', (q) => q.not('deactivated_at', 'is', null)),
      count('profiles', (q) => q.eq('is_superadmin', true)),
      count('activity_sessions', (q) => q.gte('started_at', weekStart)),
      count('time_entries', (q) => q.gte('started_at', weekStart)),
    ])
  return {
    organizations,
    users,
    deactivated,
    superadmins,
    sessionsThisWeek,
    entriesThisWeek,
  }
}

export interface AdminOrgRow extends Organization {
  member_count: number
  project_count: number
  owner_name: string | null
  owner_email: string | null
}

export async function listAllOrganizations(): Promise<AdminOrgRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('*, org_members(count), projects(count)')
    .order('created_at', { ascending: false })
  if (error) throw error

  const orgs = (data ?? []) as Record<string, any>[]
  const ownerIds = [...new Set(orgs.map((o) => o.owner_id))]
  const { data: owners } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', ownerIds.length ? ownerIds : ['00000000-0000-0000-0000-000000000000'])

  const ownerMap = new Map(
    (owners ?? []).map((p) => [p.id, p as Pick<Profile, 'id' | 'full_name' | 'email'>])
  )

  return orgs.map((o) => ({
    ...(o as Organization),
    member_count: o.org_members?.[0]?.count ?? 0,
    project_count: o.projects?.[0]?.count ?? 0,
    owner_name: ownerMap.get(o.owner_id)?.full_name ?? null,
    owner_email: ownerMap.get(o.owner_id)?.email ?? null,
  }))
}

export interface AdminUserRow {
  id: string
  email: string | null
  full_name: string | null
  is_superadmin: boolean
  deactivated_at: string | null
  created_at: string
  orgs: { id: string; name: string; role: OrgRole }[]
}

export async function listAllUsers(): Promise<AdminUserRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, full_name, is_superadmin, deactivated_at, created_at, org_members(role, org:organizations(id, name))'
    )
    .order('created_at', { ascending: true })
  if (error) throw error

  return (data ?? []).map((row: Record<string, any>) => ({
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    is_superadmin: row.is_superadmin,
    deactivated_at: row.deactivated_at,
    created_at: row.created_at,
    orgs: (row.org_members ?? [])
      .filter((m: any) => m.org)
      .map((m: any) => ({ id: m.org.id, name: m.org.name, role: m.role })),
  }))
}

export interface AdminOrgDetail {
  org: Organization
  members: {
    user_id: string
    role: OrgRole
    full_name: string | null
    email: string | null
    deactivated_at: string | null
  }[]
  entries: TimeEntryDetailed[]
  sessions: ActivitySessionDetailed[]
}

export async function getOrganizationDetail(
  orgId: string
): Promise<AdminOrgDetail | null> {
  const supabase = await createClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle<Organization>()
  if (!org) return null

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [membersRes, entriesRes, sessionsRes] = await Promise.all([
    supabase
      .from('org_members')
      .select('user_id, role, profile:profiles(full_name, email, deactivated_at)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true }),
    supabase
      .from('time_entries')
      .select(
        '*, project:projects(id,name,color), profile:profiles(id,full_name)'
      )
      .eq('org_id', orgId)
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(50),
    supabase
      .from('activity_sessions')
      .select(
        '*, project:projects(id,name,color), task:tasks(id,name), profile:profiles(id,full_name), screenshots(count)'
      )
      .eq('org_id', orgId)
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(50),
  ])

  const members = (membersRes.data ?? []).map((m: Record<string, any>) => ({
    user_id: m.user_id,
    role: m.role,
    full_name: m.profile?.full_name ?? null,
    email: m.profile?.email ?? null,
    deactivated_at: m.profile?.deactivated_at ?? null,
  }))

  const sessions = (sessionsRes.data ?? []).map((row: Record<string, any>) => {
    const { screenshots, ...rest } = row
    return {
      ...(rest as unknown as ActivitySessionDetailed),
      screenshot_count: screenshots?.[0]?.count ?? 0,
    }
  })

  return {
    org,
    members,
    entries: (entriesRes.data ?? []) as unknown as TimeEntryDetailed[],
    sessions,
  }
}
