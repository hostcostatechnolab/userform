import Link from 'next/link'
import type { Metadata } from 'next'
import { Clock, MailWarning } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signOutAction } from '@/lib/actions/auth'
import { APP_NAME, ROLE_LABELS } from '@/lib/constants'
import type { OrgRole } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { AcceptInvite } from '@/components/onboarding/AcceptInvite'

export const metadata: Metadata = { title: 'Join workspace' }

interface Preview {
  org_name: string
  role: OrgRole
  email: string
  status: 'pending' | 'accepted' | 'revoked'
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Clock className="h-5 w-5" />
        {APP_NAME}
      </div>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {children}
      </div>
    </div>
  )
}

export default async function InvitePage({
  params,
}: PageProps<'/onboarding/invite/[token]'>) {
  const { token } = await params
  const inviteHref = `/onboarding/invite/${token}`

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: rows } = await supabase.rpc('invitation_preview', {
    p_token: token,
  })
  const preview = (Array.isArray(rows) ? rows[0] : rows) as Preview | undefined

  if (!preview || preview.status !== 'pending') {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-slate-900">
          This invitation isn&apos;t valid
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          It may have been revoked or already used. Ask an admin to send a new
          one.
        </p>
      </Shell>
    )
  }

  const roleLabel = ROLE_LABELS[preview.role]

  // Not signed in — offer sign in / sign up with the invited address.
  if (!user) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-slate-900">You&apos;ve been invited</h1>
        <p className="mt-2 text-sm text-slate-500">
          Join <span className="font-medium text-slate-800">{preview.org_name}</span>{' '}
          as <span className="font-medium text-slate-800">{roleLabel}</span>.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Sign in or create an account with{' '}
          <span className="font-medium text-slate-800">{preview.email}</span> to
          accept.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href={`/register?redirect=${encodeURIComponent(
              inviteHref
            )}&email=${encodeURIComponent(preview.email)}`}
          >
            <Button className="w-full">Create account</Button>
          </Link>
          <Link
            href={`/login?redirect=${encodeURIComponent(inviteHref)}`}
          >
            <Button variant="secondary" className="w-full">
              I already have an account
            </Button>
          </Link>
        </div>
      </Shell>
    )
  }

  // Signed in with the wrong address.
  if (user.email?.toLowerCase() !== preview.email.toLowerCase()) {
    return (
      <Shell>
        <MailWarning className="mx-auto h-8 w-8 text-amber-500" />
        <h1 className="mt-3 text-xl font-bold text-slate-900">Wrong account</h1>
        <p className="mt-2 text-sm text-slate-500">
          This invitation was sent to{' '}
          <span className="font-medium text-slate-800">{preview.email}</span>, but
          you&apos;re signed in as{' '}
          <span className="font-medium text-slate-800">{user.email}</span>.
        </p>
        <form action={signOutAction} className="mt-6">
          <Button type="submit" variant="secondary" className="w-full">
            Sign out and switch account
          </Button>
        </form>
      </Shell>
    )
  }

  // Signed in with the right address — accept.
  return (
    <Shell>
      <h1 className="text-xl font-bold text-slate-900">You&apos;ve been invited</h1>
      <p className="mt-2 text-sm text-slate-500">
        Join <span className="font-medium text-slate-800">{preview.org_name}</span>{' '}
        as <span className="font-medium text-slate-800">{roleLabel}</span>.
        Accepting adds this workspace to your account.
      </p>
      <div className="mt-6">
        <AcceptInvite token={token} />
      </div>
    </Shell>
  )
}
