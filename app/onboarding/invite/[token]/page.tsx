import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getInvitationByToken } from '@/lib/queries/team'
import { APP_NAME, ROLE_LABELS } from '@/lib/constants'
import { AcceptInvite } from '@/components/onboarding/AcceptInvite'

export const metadata: Metadata = { title: 'Join workspace' }

export default async function InvitePage({
  params,
}: PageProps<'/onboarding/invite/[token]'>) {
  const { token } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?redirect=/onboarding/invite/${token}`)
  }

  const invite = await getInvitationByToken(token)

  const invalid =
    !invite ||
    invite.status !== 'pending' ||
    invite.email.toLowerCase() !== (user.email ?? '').toLowerCase()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4">
      <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <Clock className="h-5 w-5" />
        {APP_NAME}
      </div>
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        {invalid ? (
          <>
            <h1 className="text-xl font-bold text-zinc-900">
              This invitation isn&apos;t valid
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              It may have been revoked, already used, or sent to a different
              email address than the one you&apos;re signed in with.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-zinc-900">
              You&apos;ve been invited
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Join as{' '}
              <span className="font-medium text-zinc-700">
                {ROLE_LABELS[invite!.role]}
              </span>
              . Accepting adds this workspace to your account.
            </p>
            <div className="mt-6">
              <AcceptInvite token={token} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
