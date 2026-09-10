import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { TimeEntry, TimeEntryDetailed } from '@/lib/types'

const DETAILED_SELECT =
  '*, project:projects(id, name, color), profile:profiles(id, full_name)'

/** The caller's currently running entry in this org, if any. */
export async function getRunningEntry(
  orgId: string,
  userId: string
): Promise<TimeEntryDetailed | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('time_entries')
    .select(DETAILED_SELECT)
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle()

  if (error) throw error
  return (data as unknown as TimeEntryDetailed) ?? null
}

interface EntryQuery {
  orgId: string
  from: Date
  to: Date
  /** Restrict to one member. Omit for "everyone" (managers only, enforced by RLS). */
  userId?: string
  projectId?: string
}

/** Entries overlapping [from, to), newest first. */
export async function getEntries({
  orgId,
  from,
  to,
  userId,
  projectId,
}: EntryQuery): Promise<TimeEntryDetailed[]> {
  const supabase = await createClient()
  let query = supabase
    .from('time_entries')
    .select(DETAILED_SELECT)
    .eq('org_id', orgId)
    .gte('started_at', from.toISOString())
    .lt('started_at', to.toISOString())
    .order('started_at', { ascending: false })

  if (userId) query = query.eq('user_id', userId)
  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as TimeEntryDetailed[]
}

export async function getEntryById(
  id: string
): Promise<TimeEntry | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as TimeEntry) ?? null
}
