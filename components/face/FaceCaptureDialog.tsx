'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Camera,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Check,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import {
  loadFaceApi,
  detectSingleDescriptor,
  bestDistance,
  toSamples,
  isMatch,
  captureJpeg,
  MATCH_THRESHOLD,
  ENROLL_POSES,
} from '@/lib/face'

type Phase = 'init' | 'ready' | 'busy' | 'blocked'
type ScanState = 'searching' | 'match' | 'nomatch'

/** Live-scan cadence and how long a match must hold before auto-verifying. */
const SCAN_INTERVAL_MS = 450
const REQUIRED_STREAK = 2

export type CaptureResult =
  | { kind: 'enroll'; descriptors: number[][]; blob: Blob }
  | { kind: 'verify'; descriptor: number[]; blob: Blob; distance: number | null }

export function FaceCaptureDialog({
  open,
  onClose,
  mode,
  title,
  reference,
  onCapture,
}: {
  open: boolean
  onClose: () => void
  mode: 'enroll' | 'verify'
  title: string
  /** Stored face_descriptor — a single number[] or a number[][]. Verify only. */
  reference?: unknown
  onCapture: (result: CaptureResult) => Promise<void> | void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const samplesRef = useRef<number[][]>([])
  const frontalBlobRef = useRef<Blob | null>(null)

  // live-scan state
  const scanTimerRef = useRef<number | null>(null)
  const streakRef = useRef(0)
  const doneRef = useRef(false)
  const tickingRef = useRef(false)

  const [phase, setPhase] = useState<Phase>('init')
  const [status, setStatus] = useState('Loading face models…')
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(0) // enroll pose index
  const [scan, setScan] = useState<ScanState>('searching')

  const totalSteps = ENROLL_POSES.length
  const verifySamples = mode === 'verify' ? toSamples(reference) : []

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current != null) {
      window.clearTimeout(scanTimerRef.current)
      scanTimerRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const finishVerify = useCallback(
    async (descriptor: number[], distance: number) => {
      if (doneRef.current) return
      doneRef.current = true
      if (scanTimerRef.current != null) {
        window.clearTimeout(scanTimerRef.current)
        scanTimerRef.current = null
      }
      setPhase('busy')
      setStatus('Verified — saving…')
      try {
        const video = videoRef.current!
        const blob = await captureJpeg(video)
        await onCapture({ kind: 'verify', descriptor, blob, distance })
        stopCamera()
      } catch (e) {
        doneRef.current = false
        setPhase('ready')
        setError(e instanceof Error ? e.message : 'Capture failed. Try again.')
      }
    },
    [onCapture, stopCamera]
  )

  // --- verify: continuous scan loop ------------------------------------
  const runScanTick = useCallback(async () => {
    if (
      doneRef.current ||
      tickingRef.current ||
      phase !== 'ready' ||
      !videoRef.current
    ) {
      return
    }
    tickingRef.current = true
    try {
      const { descriptor } = await detectSingleDescriptor(videoRef.current)
      if (doneRef.current) return
      const distance = bestDistance(verifySamples, descriptor)
      if (isMatch(distance)) {
        setScan('match')
        streakRef.current += 1
        if (streakRef.current >= REQUIRED_STREAK) {
          await finishVerify(descriptor, distance)
          return
        }
      } else {
        setScan('nomatch')
        streakRef.current = 0
      }
    } catch {
      // NoFaceError / MultipleFacesError / transient
      setScan('searching')
      streakRef.current = 0
    } finally {
      tickingRef.current = false
      if (!doneRef.current && phase === 'ready') {
        scanTimerRef.current = window.setTimeout(runScanTick, SCAN_INTERVAL_MS)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, finishVerify])

  useEffect(() => {
    if (mode !== 'verify' || phase !== 'ready' || doneRef.current) return
    if (verifySamples.length === 0) {
      setError('No enrolled face on file. Set up Face ID first.')
      return
    }
    streakRef.current = 0
    scanTimerRef.current = window.setTimeout(runScanTick, 300)
    return () => {
      if (scanTimerRef.current != null) {
        window.clearTimeout(scanTimerRef.current)
        scanTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, phase])

  // --- camera + models bootstrap ----------------------------------
  useEffect(() => {
    if (!open) return
    let cancelled = false
    samplesRef.current = []
    frontalBlobRef.current = null
    doneRef.current = false
    streakRef.current = 0
    setStep(0)
    setScan('searching')

    ;(async () => {
      setPhase('init')
      setError(null)
      try {
        setStatus('Loading face models…')
        await loadFaceApi()
        if (cancelled) return

        setStatus('Starting camera…')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 480, height: 480 },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setPhase('ready')
      } catch (e) {
        if (cancelled) return
        setPhase('blocked')
        const name = e instanceof Error ? e.name : ''
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setError('Camera access was blocked. Allow the camera and try again.')
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setError('No camera found on this device.')
        } else {
          setError(e instanceof Error ? e.message : 'Could not start the camera.')
        }
      }
    })()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [open, stopCamera])

  // --- manual fallbacks -------------------------------------------
  async function handleVerifyManual() {
    const video = videoRef.current
    if (!video) return
    setPhase('busy')
    setError(null)
    setStatus('Checking your face…')
    try {
      const { descriptor } = await detectSingleDescriptor(video)
      const distance = bestDistance(verifySamples, descriptor)
      if (!isMatch(distance)) {
        setPhase('ready')
        setError(
          `Face didn't match (score ${distance.toFixed(2)}, needs ≤ ${MATCH_THRESHOLD}).`
        )
        return
      }
      await finishVerify(descriptor, distance)
    } catch (e) {
      setPhase('ready')
      setError(e instanceof Error ? e.message : 'Capture failed. Try again.')
    }
  }

  async function handleEnrollStep() {
    const video = videoRef.current
    if (!video) return
    setPhase('busy')
    setError(null)
    setStatus('Capturing…')
    try {
      const { descriptor } = await detectSingleDescriptor(video)
      samplesRef.current.push(descriptor)
      if (step === 0) frontalBlobRef.current = await captureJpeg(video)

      const next = step + 1
      if (next >= totalSteps) {
        setStatus('Saving…')
        await onCapture({
          kind: 'enroll',
          descriptors: samplesRef.current,
          blob: frontalBlobRef.current ?? (await captureJpeg(video)),
        })
        stopCamera()
        return
      }
      setStep(next)
      setPhase('ready')
    } catch (e) {
      setPhase('ready')
      setError(
        e instanceof Error
          ? e.message
          : 'Face not detected — hold still and try again.'
      )
    }
  }

  const pose = ENROLL_POSES[Math.min(step, totalSteps - 1)]
  const ringClass =
    mode === 'verify' && phase === 'ready'
      ? scan === 'match'
        ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.5)]'
        : scan === 'nomatch'
          ? 'border-red-400'
          : 'border-white/60'
      : 'border-white/40'

  const scanMessage =
    scan === 'match'
      ? 'Matched — hold still…'
      : scan === 'nomatch'
        ? 'That doesn’t match your Face ID'
        : 'Looking for your face…'

  return (
    <Modal
      open={open}
      onClose={() => {
        stopCamera()
        onClose()
      }}
      title={title}
      description={
        mode === 'verify'
          ? 'Look at the camera — it verifies automatically.'
          : 'Capture your face from a few angles so it recognises you reliably.'
      }
    >
      <div className="space-y-4">
        {mode === 'enroll' && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-center text-sm font-semibold text-zinc-900">
              {pose.label}
            </p>
            <div className="flex gap-1.5">
              {ENROLL_POSES.map((p, i) => (
                <span
                  key={p.key}
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    i < step
                      ? 'bg-emerald-500'
                      : i === step
                        ? 'bg-zinc-900'
                        : 'bg-zinc-200'
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-zinc-400">
              {step} of {totalSteps} captured
            </p>
          </div>
        )}

        <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-zinc-900">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full -scale-x-100 object-cover"
          />
          {phase === 'init' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-300">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">{status}</span>
            </div>
          )}
          {phase === 'busy' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          <div
            className={cn(
              'pointer-events-none absolute inset-6 rounded-full border-4 transition-colors duration-200',
              ringClass
            )}
          />
        </div>

        {mode === 'verify' && phase === 'ready' && !error && (
          <p
            className={cn(
              'text-center text-sm font-medium',
              scan === 'match'
                ? 'text-emerald-600'
                : scan === 'nomatch'
                  ? 'text-red-600'
                  : 'text-zinc-500'
            )}
          >
            {scanMessage}
          </p>
        )}

        {error && (
          <Alert tone="red">
            <span className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </span>
          </Alert>
        )}

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              stopCamera()
              onClose()
            }}
          >
            Cancel
          </Button>

          {phase === 'blocked' ? (
            <Button type="button" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          ) : mode === 'verify' ? (
            <button
              type="button"
              onClick={handleVerifyManual}
              disabled={phase !== 'ready'}
              className="text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline disabled:opacity-50"
            >
              Verify manually
            </button>
          ) : (
            <Button
              type="button"
              onClick={handleEnrollStep}
              loading={phase === 'busy'}
              disabled={phase !== 'ready'}
            >
              {step + 1 >= totalSteps ? (
                <>
                  <Check className="h-4 w-4" />
                  Capture &amp; finish
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Capture {step + 1} / {totalSteps}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
