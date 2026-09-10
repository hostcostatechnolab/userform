'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_ORG_COOKIE, ORG_ROLES } from '@/lib/constants'
import {
  assertManager,
  fail,
  getActionContext,
  ok,
  toMessage,
  type ActionResult,
} from './helpers'

const COOKIE_OPTS = {
  path: '/',
  httpOnly: false,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 365,
}

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(80, 'Name is too long')

/** Create an org (via the SECURITY DEFINER RPC), select it, go to dashboard. */
export async function createOrganizationAction(formData: FormData) {
  const parsed = nameSchema.safeParse(formData.get('name'))
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase.rpc('create_organization', {
    p_name: parsed.data,
  })
  if (error) return fail(toMessage(error))

  const org = Array.isArray(data) ? data[0] : data
  if (org?.id) {
    const store = await cookies()
    store.set(ACTIVE_ORG_COOKIE, org.id, COOKIE_OPTS)
  }

  redirect('/dashboard')
}

export async function switchOrganizationAction(orgId: string): Promise<ActionResult> {
  try {
    const { membership } = await getActionContext()
    const target = membership.allOrgs.find((o) => o.id === orgId)
    if (!target) return fail('You are not a member of that organization')

    const store = await cookies()
    store.set(ACTIVE_ORG_COOKIE, orgId, COOKIE_OPTS)
    revalidatePath('/', 'layout')
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  role: z.enum(ORG_ROLES),
})

export async function inviteMemberAction(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await getActionContext()
    assertManager(ctx)

    const parsed = inviteSchema.safeParse({
      email: formData.get('email'),
      role: formData.get('role'),
    })
    if (!parsed.success) return fail(parsed.error.issues[0].message)

    const { error } = await ctx.supabase.from('invitations').upsert(
      {
        org_id: ctx.membership.org.id,
        email: parsed.data.email,
        role: parsed.data.role,
        status: 'pending',
        invited_by: ctx.user.id,
      },
      { onConflict: 'org_id,email' }
    )
    if (error) return fail(toMessage(error))

    revalidatePath('/team')
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}

export async function revokeInviteAction(inviteId: string): Promise<ActionResult> {
  try {
    const ctx = await getActionContext()
    assertManager(ctx)
    const { error } = await ctx.supabase
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', inviteId)
      .eq('org_id', ctx.membership.org.id)
    if (error) return fail(toMessage(error))
    revalidatePath('/team')
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}

const roleUpdateSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(ORG_ROLES),
})

export async function updateMemberRoleAction(
  userId: string,
  role: string
): Promise<ActionResult> {
  try {
    const ctx = await getActionContext()
    assertManager(ctx)

    const parsed = roleUpdateSchema.safeParse({ userId, role })
    if (!parsed.success) return fail(parsed.error.issues[0].message)

    if (parsed.data.userId === ctx.membership.org.owner_id) {
      return fail("The organization owner's role can't be changed")
    }

    const { error } = await ctx.supabase
      .from('org_members')
      .update({ role: parsed.data.role })
      .eq('org_id', ctx.membership.org.id)
      .eq('user_id', parsed.data.userId)
    if (error) return fail(toMessage(error))

    revalidatePath('/team')
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}

export async function removeMemberAction(userId: string): Promise<ActionResult> {
  try {
    const ctx = await getActionContext()
    assertManager(ctx)

    if (userId === ctx.membership.org.owner_id) {
      return fail("The organization owner can't be removed")
    }

    const { error } = await ctx.supabase
      .from('org_members')
      .delete()
      .eq('org_id', ctx.membership.org.id)
      .eq('user_id', userId)
    if (error) return fail(toMessage(error))

    revalidatePath('/team')
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}

/** Accept an invitation by token (used by /onboarding/invite/[token]). */
export async function acceptInvitationAction(token: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data, error } = await supabase.rpc('accept_invitation', {
      p_token: token,
    })
    if (error) return fail(toMessage(error))

    const member = Array.isArray(data) ? data[0] : data
    if (member?.org_id) {
      const store = await cookies()
      store.set(ACTIVE_ORG_COOKIE, member.org_id, COOKIE_OPTS)
    }
    revalidatePath('/', 'layout')
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}
