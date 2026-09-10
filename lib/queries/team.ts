import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Invitation, OrgMemberWithProfile } from '@/lib/types'

export async function listMembers(
  orgId: string
): Promise<OrgMemberWithProfile[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('org_members')
    .select('*, profile:profiles(*)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as OrgMemberWithProfile[]
}

export async function listInvitations(orgId: string): Promise<Invitation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Invitation[]
}

export async function getInvitationByToken(
  token: string
): Promise<Invitation | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (error) throw error
  return (data as Invitation) ?? null
}
