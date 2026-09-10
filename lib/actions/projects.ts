'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { PROJECT_COLORS } from '@/lib/constants'
import {
  assertManager,
  fail,
  getActionContext,
  ok,
  toMessage,
  type ActionResult,
} from './helpers'

const projectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name is too long'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color')
    .default(PROJECT_COLORS[0]),
})

export async function createProjectAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const ctx = await getActionContext()
    assertManager(ctx)

    const parsed = projectSchema.safeParse({
      name: formData.get('name'),
      color: formData.get('color') || PROJECT_COLORS[0],
    })
    if (!parsed.success) return fail(parsed.error.issues[0].message)

    const { error } = await ctx.supabase.from('projects').insert({
      org_id: ctx.membership.org.id,
      name: parsed.data.name,
      color: parsed.data.color,
    })
    if (error) return fail(toMessage(error))

    revalidatePath('/projects')
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}

export async function updateProjectAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const ctx = await getActionContext()
    assertManager(ctx)

    const id = formData.get('id')
    if (typeof id !== 'string' || !z.string().uuid().safeParse(id).success) {
      return fail('Invalid project')
    }
    const parsed = projectSchema.safeParse({
      name: formData.get('name'),
      color: formData.get('color') || PROJECT_COLORS[0],
    })
    if (!parsed.success) return fail(parsed.error.issues[0].message)

    const { error } = await ctx.supabase
      .from('projects')
      .update({ name: parsed.data.name, color: parsed.data.color })
      .eq('id', id)
      .eq('org_id', ctx.membership.org.id)
    if (error) return fail(toMessage(error))

    revalidatePath('/projects')
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}

export async function setProjectArchivedAction(
  id: string,
  archived: boolean
): Promise<ActionResult> {
  try {
    const ctx = await getActionContext()
    assertManager(ctx)

    const { error } = await ctx.supabase
      .from('projects')
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
