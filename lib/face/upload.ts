import { createClient } from '@/lib/supabase/client'

export const SELFIE_BUCKET = 'attendance-selfies'

/**
 * Uploads a selfie to `<userId>/<orgId>/<kind>-<uuid>.jpg` and returns the
 * object path (not a URL). Storage RLS restricts writes to the user's own folder.
 */
export async function uploadSelfie(
  blob: Blob,
  opts: { userId: string; orgId: string; kind: 'enroll' | 'in' | 'out' }
): Promise<string> {
  const supabase = createClient()
  const path = `${opts.userId}/${opts.orgId}/${opts.kind}-${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from(SELFIE_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(error.message)
  return path
}
