'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Loader2, RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/misc'
import {
  loadFaceApi,
  detectSingleDescriptor,
  descriptorDistance,
  isMatch,
  captureJpeg,
  MATCH_THRESHOLD,
} from '@/lib/face'

type Phase = 'init' | 'ready' | 'busy' | 'blocked'

export interface CaptureResult {
  descriptor: number[]
  blob: Blob
  /** null in enroll mode; euclidean distance in verify mode */
  distance: number | null
}

export function FaceCaptureDialog({
  open,
  onClose,
  mode,
  title,
  referenceDescriptor,
  onCapture,
}: {
  open: boolean
  onClose: () => void
  mode: 'enroll' | 'verify'
  title: string
  referenceDescriptor?: number[] | null
  onCapture: (result: CaptureResult) => Promise<void> | void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<Phase>('init')
  const [status, setStatus] = useState('Loading face models…')
  const [error, setError] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false

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
          setError(
            e instanceof Error ? e.message : 'Could not start face verification.'
          )
        }
      }
    })()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [open, stopCamera])

  async function handleCapture() {
    const video = videoRef.current
    if (!video || phase === 'busy') return
    setPhase('busy')
    setError(null)
    setStatus('Checking your face…')

    try {
      const { descriptor } = await detectSingleDescriptor(video)

      let distance: number | null = null
      if (mode === 'verify') {
        if (!referenceDescriptor || referenceDescriptor.length === 0) {
          throw new Error('No enrolled face on file. Set up Face ID first.')
        }
        distance = descriptorDistance(referenceDescriptor, descriptor)
        if (!isMatch(distance)) {
          setPhase('ready')
          setError(
            `Face didn't match (score ${distance.toFixed(
              2
            )}, needs ≤ ${MATCH_THRESHOLD}). Face the camera in good light and try again.`
          )
          return
        }
      }

      const blob = await captureJpeg(video)
      setStatus('Saving…')
      await onCapture({ descriptor, blob, distance })
      stopCamera()
    } catch (e) {
      setPhase('ready')
      setError(e instanceof Error ? e.message : 'Capture failed. Try again.')
    }
  }

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
          ? 'Look at the camera to confirm it’s you.'
          : 'We’ll use this to recognise you at clock in.'
      }
    >
      <div className="space-y-4">
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
          <div className="pointer-events-none absolute inset-6 rounded-full border-2 border-white/40" />
        </div>

        {error && (
          <Alert tone="red">
            <span className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </span>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
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
          ) : (
            <Button
              type="button"
              onClick={handleCapture}
              loading={phase === 'busy'}
              disabled={phase !== 'ready'}
            >
              {mode === 'verify' ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {mode === 'verify' ? 'Verify & continue' : 'Capture'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
