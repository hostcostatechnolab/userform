'use server'

import { getSessionScreenshots } from '@/lib/queries/activity'
import { fail, ok, toMessage, type ActionResult } from './helpers'
import type { Screenshot } from '@/lib/types'

export async function loadSessionScreenshotsAction(
  sessionId: string
): Promise<ActionResult<(Screenshot & { url: string | null })[]>> {
  try {
    const { screenshots } = await getSessionScreenshots(sessionId)
    return ok(screenshots)
  } catch (e) {
    return fail(toMessage(e))
  }
}
