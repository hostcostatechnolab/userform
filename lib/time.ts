/**
 * Time helpers. All timestamps are stored as UTC ISO strings; formatting here
 * renders them in the runtime's local timezone (browser or server).
 */

export const MS_PER_HOUR = 3_600_000
export const MS_PER_MINUTE = 60_000

/** Milliseconds an entry has run. Open entries are measured up to `now`. */
export function entryDurationMs(
  startedAt: string,
  endedAt: string | null,
  now: number = Date.now()
): number {
  const start = new Date(startedAt).getTime()
  const end = endedAt ? new Date(endedAt).getTime() : now
  return Math.max(0, end - start)
}

/** "2h 05m" — compact, for tables and summaries. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / MS_PER_MINUTE)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

/** "02:05:37" — for the live running timer. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

/** Decimal hours to 2dp — for CSV export and payroll-style reports. */
export function toDecimalHours(ms: number): number {
  return Math.round((ms / MS_PER_HOUR) * 100) / 100
}

export function formatTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateRange(startISO: string, endISO: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const start = new Date(startISO).toLocaleDateString(undefined, opts)
  const end = new Date(endISO).toLocaleDateString(undefined, opts)
  return `${start} – ${end}`
}

/** Local YYYY-MM-DD key for grouping entries by calendar day. */
export function localDayKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Monday 00:00 local time for the week containing `ref`. */
export function startOfWeek(ref: Date = new Date()): Date {
  const d = new Date(ref)
  d.setHours(0, 0, 0, 0)
  const day = (d.getDay() + 6) % 7 // 0 = Monday
  d.setDate(d.getDate() - day)
  return d
}

export function endOfWeek(ref: Date = new Date()): Date {
  const start = startOfWeek(ref)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return end
}

export function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

/** Local YYYY-MM-DD for a Date (no UTC round-trip). */
export function dayKeyOf(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function startOfDay(ref: Date = new Date()): Date {
  const d = new Date(ref)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(ref: Date = new Date()): Date {
  const d = new Date(ref)
  d.setHours(23, 59, 59, 999)
  return d
}

/** The seven Date objects (Mon–Sun) of the week containing `ref`. */
export function weekDays(ref: Date = new Date()): Date[] {
  const start = startOfWeek(ref)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

/** For `<input type="datetime-local">` — local time, no timezone suffix. */
export function toDatetimeLocalValue(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}
