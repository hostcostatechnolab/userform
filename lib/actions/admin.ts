'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getViewer } from '@/lib/queries/org'
import { fail, ok, toMessage, type ActionResult } from './helpers'

/** Super-admin only: soft deactivate / reactivate another account. */
export async function setUserDeactivatedAction(
  userId: string,
  deactivated: boolean
): Promise<ActionResult> {
  try {
    if (!z.string().uuid().safeParse(userId).success) {
      return fail('Invalid user')
    }

    const viewer = await getViewer()
    if (!viewer?.is_superadmin) return fail('Not authorized')
    if (userId === viewer.id) return fail("You can't deactivate your own account")

    const supabase = await createClient()

    // Never deactivate another super admin.
    const { data: target } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', userId)
      .maybeSingle<{ is_superadmin: boolean }>()
    if (target?.is_superadmin) {
      return fail("Super admins can't be deactivated")
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        deactivated_at: deactivated ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
    if (error) return fail(toMessage(error))

    revalidatePath('/admin/users')
    revalidatePath('/admin')
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}

/** Super-admin only: permanently delete an account (via SECURITY DEFINER RPC). */
export async function deleteUserAction(
  userId: string
): Promise<ActionResult> {
  try {
    if (!z.string().uuid().safeParse(userId).success) {
      return fail('Invalid user')
    }

    const viewer = await getViewer()
    if (!viewer?.is_superadmin) return fail('Not authorized')
    if (userId === viewer.id) return fail("You can't delete your own account")

    const supabase = await createClient()
    const { error } = await supabase.rpc('admin_delete_user', {
      p_user_id: userId,
    })
    if (error) return fail(toMessage(error))

    revalidatePath('/admin/users')
    revalidatePath('/admin')
    revalidatePath('/admin/organizations')
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}
