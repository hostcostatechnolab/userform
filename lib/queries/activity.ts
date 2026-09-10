import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { signScreenshots } from './photos'
import type { ActivitySessionDetailed, Screenshot } from '@/lib/types'

const SESSION_SELECT =
  '*, project:projects(id,name,color), task:tasks(id,name), profile:profiles(id,full_name), screenshots(count)'

interface SessionQuery {
  orgId: string
  from: Date
  to: Date
  userId?: string
}

export async function listSessions({
  orgId,
  from,
  to,
  userId,
}: SessionQuery): Promise<ActivitySessionDetailed[]> {
  const supabase = await createClient()
  let query = supabase
    .from('activity_sessions')
    .select(SESSION_SELECT)
    .eq('org_id', orgId)
    .gte('started_at', from.toISOString())
    .lt('started_at', to.toISOString())
    .order('started_at', { ascending: false })

  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((row: Record<string, unknown>) => {
    const shots = row.screenshots as { count: number }[] | undefined
    const { screenshots: _drop, ...rest } = row
    void _drop
    return {
      ...(rest as unknown as ActivitySessionDetailed),
      screenshot_count: shots?.[0]?.count ?? 0,
    }
  })
}

export interface SessionShots {
  screenshots: (Screenshot & { url: string | null })[]
}

export async function getSessionScreenshots(
  sessionId: string
): Promise<SessionShots> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('screenshots')
    .select('*')
    .eq('session_id', sessionId)
    .order('captured_at', { ascending: true })

  if (error) throw error
  const rows = (data ?? []) as Screenshot[]

  const urls = await signScreenshots(rows.map((s) => s.storage_path))
  return {
    screenshots: rows.map((s) => ({ ...s, url: urls[s.storage_path] ?? null })),
  }
}
