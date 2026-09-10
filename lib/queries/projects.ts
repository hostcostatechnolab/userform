import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/lib/types'

export async function listProjects(
  orgId: string,
  { includeArchived = false }: { includeArchived?: boolean } = {}
): Promise<Project[]> {
  const supabase = await createClient()
  let query = supabase
    .from('projects')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true })

  if (!includeArchived) query = query.eq('archived', false)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Project[]
}
