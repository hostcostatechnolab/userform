'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Mail, Loader2, ArrowLeft, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input, FieldError } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'

const schema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
})

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true)
    setMessage('')
    setErrorMsg('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      if (error) throw error
      setMessage('Password reset link sent. Check your inbox.')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  })

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Forgot password?
        </h1>
        <p className="text-sm text-zinc-500">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {message && <Alert tone="green">{message}</Alert>}
      {errorMsg && <Alert tone="red">{errorMsg}</Alert>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-zinc-400" />
            <Input
              className="pl-11"
              type="email"
              placeholder="Email address"
              {...register('email')}
            />
          </div>
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4" /> Send reset link
            </>
          )}
        </button>
      </form>
    </div>
  )
}
