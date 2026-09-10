'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  assertManager,
  fail,
  getActionContext,
  ok,
  toMessage,
  type ActionResult,
} from './helpers'

const taskSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
})

export async function createTaskAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const ctx = await getActionContext()
    const parsed = taskSchema.safeParse({
      project_id: formData.get('project_id'),
      name: formData.get('name'),
    })
    if (!parsed.success) return fail(parsed.error.issues[0].message)

    const { error } = await ctx.supabase.from('tasks').insert({
      org_id: ctx.membership.org.id,
      project_id: parsed.data.project_id,
      name: parsed.data.name,
      created_by: ctx.user.id,
    })
    if (error) return fail(toMessage(error))

    revalidatePath('/projects')
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}

export async function setTaskArchivedAction(
  id: string,
  archived: boolean
): Promise<ActionResult> {
  try {
    const ctx = await getActionContext()
    assertManager(ctx)

    const { error } = await ctx.supabase
      .from('tasks')
      .update({ archived })
      .eq('id', id)
      .eq('org_id', ctx.membership.org.id)
    if (error) return fail(toMessage(error))

    revalidatePath('/projects')
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}
