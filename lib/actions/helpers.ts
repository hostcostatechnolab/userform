import 'server-only'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getMembership } from '@/lib/queries/org'
import type { Membership } from '@/lib/types'

export { ok, fail, toMessage, type ActionResult } from '@/lib/action-result'

export interface ActionContext {
  supabase: SupabaseClient
  user: User
  membership: Membership
}

/** Common setup for org-scoped actions: authed user + active membership. */
export async function getActionContext(): Promise<ActionContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in')

  const membership = await getMembership()
  if (!membership) throw new Error('You are not part of any organization')

  return { supabase, user, membership }
}

export function assertManager(ctx: ActionContext) {
  if (!ctx.membership.isManager) {
    throw new Error('Only owners and admins can do this')
  }
}
