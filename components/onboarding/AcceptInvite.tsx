'use client'

import { useRouter } from 'next/navigation'
import { acceptInvitationAction } from '@/lib/actions/org'
import { useAction } from '@/components/ui/use-action'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/misc'

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter()
  const { pending, error, run } = useAction()

  return (
    <div className="space-y-3">
      {error && <Alert tone="red">{error}</Alert>}
      <Button
        size="lg"
        loading={pending}
        className="w-full"
        onClick={() =>
          run(() => acceptInvitationAction(token), {
            onSuccess: () => {
              router.push('/dashboard')
              router.refresh()
            },
          })
        }
      >
        Accept invitation
      </Button>
    </div>
  )
}
