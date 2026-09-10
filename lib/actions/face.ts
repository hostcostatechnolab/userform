'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fail, ok, toMessage, type ActionResult } from './helpers'

const DESCRIPTOR_LENGTH = 128

const enrollSchema = z.object({
  descriptor: z
    .array(z.number().finite())
    .length(DESCRIPTOR_LENGTH, 'Invalid face data'),
  photoPath: z.string().min(1),
})

export async function enrollFaceAction(input: {
  descriptor: number[]
  photoPath: string
}): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail('You must be signed in')

    const parsed = enrollSchema.safeParse(input)
    if (!parsed.success) return fail(parsed.error.issues[0].message)

    // The photo must live in the caller's own storage folder.
    if (!parsed.data.photoPath.startsWith(`${user.id}/`)) {
      return fail('Invalid photo reference')
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        face_descriptor: parsed.data.descriptor,
        face_photo_path: parsed.data.photoPath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    if (error) return fail(toMessage(error))

    revalidatePath('/settings/profile')
    revalidatePath('/dashboard')
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}

export async function clearFaceAction(): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail('You must be signed in')

    const { error } = await supabase
      .from('profiles')
      .update({ face_descriptor: null, face_photo_path: null })
      .eq('id', user.id)
    if (error) return fail(toMessage(error))

    revalidatePath('/settings/profile')
    revalidatePath('/dashboard')
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}
