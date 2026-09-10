import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Clock } from 'lucide-react'
import { getMembership } from '@/lib/queries/org'
import { APP_NAME } from '@/lib/constants'
import { CreateOrgForm } from '@/components/onboarding/CreateOrgForm'

export const metadata: Metadata = { title: 'Create your workspace' }

export default async function OnboardingPage() {
  // Already in an org? Skip onboarding.
  const membership = await getMembership()
  if (membership) redirect('/dashboard')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Clock className="h-5 w-5" />
        {APP_NAME}
      </div>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Create your workspace
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          This is where your team&apos;s projects and timesheets live. You can
          rename it later.
        </p>
        <div className="mt-6">
          <CreateOrgForm />
        </div>
      </div>
    </div>
  )
}
