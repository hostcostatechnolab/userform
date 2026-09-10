'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Lock, Loader2, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input, FieldError } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'

const schema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
})

export default function UpdatePasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true)
    setErrorMsg('')
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) throw error
      setDone(true)
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1200)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  })

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Set a new password
        </h1>
        <p className="text-sm text-zinc-500">Choose a strong password you&apos;ll remember.</p>
      </div>

      {errorMsg && <Alert tone="red">{errorMsg}</Alert>}
      {done && <Alert tone="green">Password updated. Redirecting…</Alert>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-zinc-400" />
            <Input
              className="pl-11"
              type="password"
              placeholder="New password"
              {...register('password')}
            />
          </div>
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <button
          type="submit"
          disabled={loading || done}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <KeyRound className="h-4 w-4" /> Update password
            </>
          )}
        </button>
      </form>
    </div>
  )
}
