import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Task } from '@/lib/types'

export async function listTasks(
  orgId: string,
  opts: { projectId?: string; includeArchived?: boolean } = {}
): Promise<Task[]> {
  const supabase = await createClient()
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true })

  if (opts.projectId) query = query.eq('project_id', opts.projectId)
  if (!opts.includeArchived) query = query.eq('archived', false)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Task[]
}
