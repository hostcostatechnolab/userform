'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fail, ok, toMessage, type ActionResult } from './helpers'

const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  phone_number: z
    .string()
    .trim()
    .min(6, 'Enter a valid phone number')
    .max(20, 'Phone number is too long'),
  bio: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v ? v.trim().slice(0, 200) : null)),
})

export async function updateProfileAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail('You must be signed in')

    const parsed = profileSchema.safeParse({
      full_name: formData.get('full_name'),
      phone_number: formData.get('phone_number'),
      bio: formData.get('bio'),
    })
    if (!parsed.success) return fail(parsed.error.issues[0].message)

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    if (error) return fail(toMessage(error))

    revalidatePath('/settings/profile')
    revalidatePath('/', 'layout')
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}
