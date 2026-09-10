'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogIn, LogOut, ChevronDown, ScanFace } from 'lucide-react'
import { clockInAction, clockOutAction } from '@/lib/actions/time'
import { uploadSelfie } from '@/lib/face/upload'
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

export function ClockCard({
  running,
  projects,
  faceDescriptor,
  userId,
  orgId,
}: {
  running: TimeEntryDetailed | null
  projects: Project[]
  faceDescriptor: number[] | null
  userId: string
  orgId: string
}) {
  const router = useRouter()
  const { error, setError } = useAction()
  const [showDetails, setShowDetails] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [note, setNote] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const enrolled = Array.isArray(faceDescriptor) && faceDescriptor.length > 0

  async function handleCapture({ descriptor, blob, distance }: CaptureResult) {
    void descriptor
    if (running) {
      const photoPath = await uploadSelfie(blob, { userId, orgId, kind: 'out' })
      const res = await clockOutAction({
        photoPath,
        faceScore: distance ?? 0,
      })
      if (res.ok === false) throw new Error(res.error)
    } else {
      const photoPath = await uploadSelfie(blob, { userId, orgId, kind: 'in' })
      const res = await clockInAction({
        photoPath,
        faceScore: distance ?? 0,
        projectId: projectId || null,
        note: note || null,
      })
      if (res.ok === false) throw new Error(res.error)
      setNote('')
      setShowDetails(false)
    }
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

          {error && (
            <div className="mt-4">
              <Alert tone="red">{error}</Alert>
            </div>
          )}

          <button
            onClick={() => {
              setError(null)
              setDialogOpen(true)
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-red-700"
          >
            <LogOut className="h-5 w-5" />
            I&apos;m leaving — clock out
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Not clocked in
          </p>

          {error && (
            <div className="mt-4">
              <Alert tone="red">{error}</Alert>
            </div>
          )}

          <button
            onClick={() => {
              setError(null)
              setDialogOpen(true)
            }}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <LogIn className="h-5 w-5" />
            I&apos;m in — clock in
          </button>

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
