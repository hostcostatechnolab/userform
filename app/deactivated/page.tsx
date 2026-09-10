import type { Metadata } from 'next'
import { Ban } from 'lucide-react'
import { signOutAction } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/constants'

export const metadata: Metadata = { title: 'Account deactivated' }

export default function DeactivatedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 text-center">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
          <Ban className="h-6 w-6 text-red-500" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-zinc-900">
          Your account is deactivated
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Access to {APP_NAME} has been turned off for this account. If you think
          this is a mistake, contact your administrator.
        </p>
        <form action={signOutAction} className="mt-6">
          <Button type="submit" variant="secondary" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  )
}
