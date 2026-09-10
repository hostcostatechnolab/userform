import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { SELFIE_BUCKET } from '@/lib/face/upload'

export const SCREENSHOT_BUCKET = 'activity-screenshots'

/**
 * Batch-signs object paths in a bucket into temporary URLs the browser can load.
 * Unreadable / missing paths are simply omitted from the result.
 */
export async function signPaths(
  bucket: string,
  paths: (string | null | undefined)[],
  expiresInSeconds = 60 * 30
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))]
  if (unique.length === 0) return {}

  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(unique, expiresInSeconds)

  if (error || !data) return {}

  const map: Record<string, string> = {}
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl
  }
  return map
}

export function signSelfies(paths: (string | null | undefined)[]) {
  return signPaths(SELFIE_BUCKET, paths)
}

export function signScreenshots(paths: (string | null | undefined)[]) {
  return signPaths(SCREENSHOT_BUCKET, paths)
}
