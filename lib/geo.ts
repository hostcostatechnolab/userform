/** Great-circle distance between two lat/lng points, in metres. */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000 // Earth radius, metres
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function formatMeters(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`
}

export interface Geofence {
  lat: number
  lng: number
  radiusM: number
  label: string | null
}

export interface GeoResult {
  ok: boolean
  distanceM: number
  reason?: string
}

/** Is (lat,lng) inside the fence? Adds GPS accuracy as slack. */
export function checkGeofence(
  fence: Geofence,
  lat: number,
  lng: number,
  accuracyM = 0
): GeoResult {
  const distanceM = haversineMeters(fence.lat, fence.lng, lat, lng)
  const allowed = fence.radiusM + Math.min(accuracyM, 200)
  if (distanceM <= allowed) return { ok: true, distanceM }
  return {
    ok: false,
    distanceM,
    reason: `You're ${formatMeters(distanceM)} from ${
      fence.label || 'the work location'
    } — get within ${formatMeters(fence.radiusM)} to clock in.`,
  }
}
