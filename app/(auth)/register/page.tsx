import { Suspense } from 'react'
import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth/AuthForm'
import { Spinner } from '@/components/ui/misc'

export const metadata: Metadata = { title: 'Create account' }

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><Spinner /></div>}>
      <AuthForm mode="register" />
    </Suspense>
  )
}
