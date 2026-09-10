'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LogIn,
  LogOut,
  ChevronDown,
  ScanFace,
  MapPin,
  Loader2,
} from 'lucide-react'
import { clockInAction, clockOutAction } from '@/lib/actions/time'
import { uploadSelfie } from '@/lib/face/upload'
import { checkGeofence } from '@/lib/geo'
import { useAction } from '@/components/ui/use-action'
import { Select, Input } from '@/components/ui/field'
import { Alert, ColorDot } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import { LiveTimer } from './LiveTimer'
import { formatTimeOfDay } from '@/lib/time'
import {
  FaceCaptureDialog,
  type CaptureResult,
} from '@/components/face/FaceCaptureDialog'
import type { Project, TimeEntryDetailed } from '@/lib/types'

interface GeofenceProp {
  enabled: boolean
  lat: number | null
  lng: number | null
  radiusM: number
  label: string | null
}

type Coords = { lat: number; lng: number; accuracy: number } | null

export function ClockCard({
  running,
  projects,
  faceDescriptor,
  userId,
  orgId,
  geofence,
}: {
  running: TimeEntryDetailed | null
  projects: Project[]
  faceDescriptor: number[] | null
  userId: string
  orgId: string
  geofence: GeofenceProp | null
}) {
  const router = useRouter()
  const { error, setError } = useAction()
  const [showDetails, setShowDetails] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [note, setNote] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const coordsRef = useRef<Coords>(null)

  const enrolled = Array.isArray(faceDescriptor) && faceDescriptor.length > 0
  const geoActive =
    !!geofence?.enabled && geofence.lat != null && geofence.lng != null

  function startPunch() {
    setError(null)
    coordsRef.current = null

    if (!geoActive) {
      setDialogOpen(true)
      return
    }
    if (!navigator.geolocation) {
      setError('This device can’t share its location, which is required here.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const { latitude, longitude, accuracy } = pos.coords
        const res = checkGeofence(
          {
            lat: geofence!.lat!,
            lng: geofence!.lng!,
            radiusM: geofence!.radiusM,
            label: geofence!.label,
          },
          latitude,
          longitude,
          accuracy
        )
        if (!res.ok) {
          setError(res.reason ?? 'You are outside the allowed area.')
          return
        }
        coordsRef.current = { lat: latitude, lng: longitude, accuracy }
        setDialogOpen(true)
      },
      (err) => {
        setLocating(false)
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access is required to clock in here. Allow it and try again.'
            : 'Couldn’t get your location. Move to an open area and try again.'
        )
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    )
  }

  async function handleCapture({ blob, distance }: CaptureResult) {
    const coords = coordsRef.current ?? {}
    if (running) {
      const photoPath = await uploadSelfie(blob, { userId, orgId, kind: 'out' })
      const res = await clockOutAction({
        photoPath,
        faceScore: distance ?? 0,
        ...coords,
      })
      if (res.ok === false) throw new Error(res.error)
    } else {
      const photoPath = await uploadSelfie(blob, { userId, orgId, kind: 'in' })
      const res = await clockInAction({
        photoPath,
        faceScore: distance ?? 0,
        projectId: projectId || null,
        note: note || null,
        ...coords,
      })
      if (res.ok === false) throw new Error(res.error)
      setNote('')
      setShowDetails(false)
    }
    coordsRef.current = null
    setDialogOpen(false)
    router.refresh()
  }

  if (!enrolled) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <ScanFace className="mx-auto h-8 w-8 text-amber-500" />
        <p className="mt-2 text-sm font-semibold text-amber-800">
          Face ID required
        </p>
        <p className="mt-1 text-sm text-amber-700">
          Set up your face before you can clock in or out.
        </p>
        <Link
          href="/settings/profile"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Set up Face ID
        </Link>
      </div>
    )
  }

  const punchBtn = (
    <button
      onClick={startPunch}
      disabled={locating}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold text-white transition-colors disabled:opacity-70',
        running
          ? 'bg-red-600 hover:bg-red-700'
          : 'bg-emerald-600 hover:bg-emerald-700'
      )}
    >
      {locating ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Checking location…
        </>
      ) : running ? (
        <>
          <LogOut className="h-5 w-5" />
          I&apos;m leaving — clock out
        </>
      ) : (
        <>
          <LogIn className="h-5 w-5" />
          I&apos;m in — clock in
        </>
      )}
    </button>
  )

  return (
    <>
      {running ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            You&apos;re clocked in
          </p>
          <p className="mt-2 font-mono text-5xl font-bold tabular-nums text-zinc-900">
            <LiveTimer startedAt={running.started_at} />
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Since {formatTimeOfDay(running.started_at)}
            {running.project && (
              <span className="ml-2 inline-flex items-center gap-1">
                <ColorDot color={running.project.color} />
                {running.project.name}
              </span>
            )}
          </p>
          {running.note && (
            <p className="mt-1 text-sm text-zinc-400">“{running.note}”</p>
          )}

          {geoActive && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-400">
              <MapPin className="h-3 w-3" />
              Must be at {geofence!.label || 'the work location'}
            </p>
          )}

          {error && (
            <div className="mt-4">
              <Alert tone="red">{error}</Alert>
            </div>
          )}

          <div className="mt-5">{punchBtn}</div>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Not clocked in
          </p>

          {geoActive && (
            <p className="mt-1 flex items-center justify-center gap-1 text-xs text-zinc-400">
              <MapPin className="h-3 w-3" />
              You must be at {geofence!.label || 'the work location'} (
              {geofence!.radiusM} m)
            </p>
          )}

          {error && (
            <div className="mt-4">
              <Alert tone="red">{error}</Alert>
            </div>
          )}

          <div className="mt-4">{punchBtn}</div>

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="mx-auto mt-3 flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-600"
          >
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform',
                showDetails && 'rotate-180'
              )}
            />
            Add project or note
          </button>

          {showDetails && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                aria-label="Project"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What are you working on?"
                maxLength={500}
              />
            </div>
          )}
        </div>
      )}

      <FaceCaptureDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        mode="verify"
        title={running ? 'Verify to clock out' : 'Verify to clock in'}
        referenceDescriptor={faceDescriptor}
        onCapture={handleCapture}
      />
    </>
  )
}
