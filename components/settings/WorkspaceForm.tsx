'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Crosshair, Save } from 'lucide-react'
import { updateGeofenceAction } from '@/lib/actions/org'
import { useAction } from '@/components/ui/use-action'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import { GeofenceMap } from './GeofenceMap'
import type { Organization } from '@/lib/types'

export function WorkspaceForm({ org }: { org: Organization }) {
  const router = useRouter()
  const { pending, error, success, run } = useAction()

  const [enabled, setEnabled] = useState(org.geofence_enabled)
  const [lat, setLat] = useState<number | null>(org.geofence_lat)
  const [lng, setLng] = useState<number | null>(org.geofence_lng)
  const [radius, setRadius] = useState(org.geofence_radius_m)
  const [label, setLabel] = useState(org.geofence_label ?? '')
  const [locating, setLocating] = useState(false)

  function useMyLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function submit() {
    const fd = new FormData()
    if (enabled) fd.set('enabled', 'on')
    if (lat != null) fd.set('lat', String(lat))
    if (lng != null) fd.set('lng', String(lng))
    fd.set('radius_m', String(radius))
    fd.set('label', label)
    run(() => updateGeofenceAction(fd), { onSuccess: () => router.refresh() })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900">
              Require members to be at a location to clock in
            </span>
            <span className="block text-sm text-slate-500">
              When on, the website clock checks the member&apos;s GPS and blocks
              clock in / out from outside the circle below.
            </span>
          </span>
        </label>
      </div>

      {error && <Alert tone="red">{error}</Alert>}
      {success && <Alert tone="green">Location settings saved.</Alert>}

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <MapPin className="h-4 w-4" /> Work location
          </h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={locating}
            onClick={useMyLocation}
          >
            <Crosshair className="h-4 w-4" />
            Use my location
          </Button>
        </div>

        <GeofenceMap
          lat={lat}
          lng={lng}
          radiusM={radius}
          onPick={(la, ln) => {
            setLat(la)
            setLng(ln)
          }}
        />
        <p className="text-xs text-slate-400">
          {lat != null && lng != null
            ? `Pin: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
            : 'Click the map to drop a pin, or use your location.'}
        </p>

        <div>
          <Label htmlFor="radius">Radius — {radius} m</Label>
          <input
            id="radius"
            type="range"
            min={20}
            max={2000}
            step={10}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        <div>
          <Label htmlFor="label">Location name (optional)</Label>
          <Input
            id="label"
            value={label}
            maxLength={120}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Head office"
          />
        </div>
      </div>

      <Button onClick={submit} loading={pending}>
        <Save className="h-4 w-4" />
        Save location settings
      </Button>
    </div>
  )
}
