'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScanFace, ShieldCheck, Trash2 } from 'lucide-react'
import { enrollFaceAction, clearFaceAction } from '@/lib/actions/face'
import { uploadSelfie } from '@/lib/face/upload'
import { useAction } from '@/components/ui/use-action'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/misc'
import { Card, CardContent } from '@/components/ui/card'
import { FaceCaptureDialog, type CaptureResult } from './FaceCaptureDialog'

export function FaceEnrollCard({
  enrolled,
  photoUrl,
  userId,
  orgId,
}: {
  enrolled: boolean
  photoUrl: string | null
  userId: string
  orgId: string
}) {
  const router = useRouter()
  const { pending, error, run } = useAction()
  const [open, setOpen] = useState(false)

  async function handleCapture(result: CaptureResult) {
    if (result.kind !== 'enroll') return
    const photoPath = await uploadSelfie(result.blob, {
      userId,
      orgId,
      kind: 'enroll',
    })
    const res = await enrollFaceAction({
      descriptors: result.descriptors,
      photoPath,
    })
    if (res.ok === false) throw new Error(res.error)
    setOpen(false)
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
            <ScanFace className="h-5 w-5 text-zinc-700" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-zinc-900">
              Face ID for clock in
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500">
              Required. You&apos;ll capture your face from a few angles; it&apos;s
              matched against the closest one every time you clock in or out.
            </p>
          </div>
          {enrolled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Set up
            </span>
          )}
        </div>

        {error && <Alert tone="red">{error}</Alert>}

        <div className="flex items-center gap-4">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="Enrolled face"
              className="h-20 w-20 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-zinc-300 text-zinc-300">
              <ScanFace className="h-7 w-7" />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setOpen(true)} loading={pending}>
              {enrolled ? 'Re-enroll face' : 'Set up Face ID'}
            </Button>
            {enrolled && (
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  run(() => clearFaceAction(), {
                    onSuccess: () => router.refresh(),
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <FaceCaptureDialog
        open={open}
        onClose={() => setOpen(false)}
        mode="enroll"
        title={enrolled ? 'Re-enroll your face' : 'Set up Face ID'}
        onCapture={handleCapture}
      />
    </Card>
  )
}
