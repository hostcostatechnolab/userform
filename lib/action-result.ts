/** Shared result shape for server actions. Safe to import from client code. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

export function ok(): { ok: true }
export function ok<T>(data: T): { ok: true; data: T }
export function ok<T>(data?: T) {
  return data === undefined ? { ok: true as const } : { ok: true as const, data }
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error }
}

/** Turn an unknown thrown value into a user-safe message. */
export function toMessage(e: unknown, fallback = 'Something went wrong'): string {
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message) || fallback
  }
  return fallback
}
