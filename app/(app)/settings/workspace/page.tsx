import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/queries/org'
import { WorkspaceForm } from '@/components/settings/WorkspaceForm'
import type { Organization } from '@/lib/types'

export const metadata: Metadata = { title: 'Workspace settings' }

export default async function WorkspaceSettingsPage() {
  const { org } = await requireManager()

  const supabase = await createClient()
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', org.id)
    .single<Organization>()

  return <WorkspaceForm org={data ?? org} />
}
