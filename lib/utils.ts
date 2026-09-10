export type ClassValue = string | number | false | null | undefined

/** Minimal classnames joiner. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}

export function initials(name: string | null | undefined, fallback = 'U'): string {
  if (!name) return fallback
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
