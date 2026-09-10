'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Mail, Lock, User, Phone, Loader2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input, FieldError } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'

const baseSchema = {
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
}

const loginSchema = z.object(baseSchema)
const registerSchema = z.object({
  ...baseSchema,
  full_name: z.string().min(2, { message: 'Full name is required' }),
  phone_number: z.string().min(6, { message: 'Phone number is required' }),
})

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const isLogin = mode === 'login'
  const router = useRouter()
  const search = useSearchParams()
  const redirectParam = search.get('redirect')
  const redirectTo = redirectParam || '/dashboard'
  const prefillEmail = search.get('email') || ''
  const supabase = createClient()

  // Preserve ?redirect / ?email when toggling between login and register.
  const toggleQuery = new URLSearchParams()
  if (redirectParam) toggleQuery.set('redirect', redirectParam)
  if (prefillEmail) toggleQuery.set('email', prefillEmail)
  const toggleHref =
    (isLogin ? '/register' : '/login') +
    (toggleQuery.toString() ? `?${toggleQuery.toString()}` : '')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [notice, setNotice] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof registerSchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver((isLogin ? loginSchema : registerSchema) as any),
    defaultValues: { email: prefillEmail },
  })

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true)
    setErrorMsg('')
    setNotice('')
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })
        if (error) throw error
        router.push(redirectTo)
        router.refresh()
      } else {
        const { data: signUp, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.full_name,
              phone_number: data.phone_number,
            },
          },
        })
        if (error) throw error

        // Email confirmation on: no session yet.
        if (!signUp.session) {
          setNotice(
            redirectParam
              ? 'Check your inbox to confirm your email, then open the invite link again.'
              : 'Check your inbox to confirm your email, then sign in.'
          )
          return
        }
        router.push(redirectParam || '/onboarding')
        router.refresh()
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Something went wrong. Try again.'
      )
    } finally {
      setLoading(false)
    }
  })

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-sm text-slate-500">
          {isLogin
            ? 'Sign in to keep tracking your time.'
            : 'Start tracking time in under a minute.'}
        </p>
      </div>

      {errorMsg && <Alert tone="red">{errorMsg}</Alert>}
      {notice && <Alert tone="green">{notice}</Alert>}

      <form onSubmit={onSubmit} className="space-y-4">
        {!isLogin && (
          <>
            <div>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
                <Input
                  className="pl-11"
                  placeholder="Full name"
                  {...register('full_name')}
                />
              </div>
              <FieldError>{errors.full_name?.message}</FieldError>
            </div>
            <div>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
                <Input
                  className="pl-11"
                  placeholder="Phone number"
                  {...register('phone_number')}
                />
              </div>
              <FieldError>{errors.phone_number?.message}</FieldError>
            </div>
          </>
        )}

        <div>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
            <Input
              className="pl-11"
              type="email"
              placeholder="Email address"
              autoComplete="email"
              {...register('email')}
            />
          </div>
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
            <Input
              className="pl-11"
              type="password"
              placeholder="Password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              {...register('password')}
            />
          </div>
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        {isLogin && (
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Forgot password?
            </Link>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition-all hover:from-blue-500 hover:to-blue-600 active:scale-[0.98] disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              {isLogin ? 'Sign in' : 'Create account'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slate-600">
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <Link
          href={toggleHref}
          className="font-semibold text-slate-900 hover:underline"
        >
          {isLogin ? 'Sign up' : 'Sign in'}
        </Link>
      </p>
    </div>
  )
}
