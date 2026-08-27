'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/utils/supabase/client'
import { Mail, Loader2, ArrowLeft, Send } from 'lucide-react'

const forgotSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
})

type ForgotFormValues = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data: ForgotFormValues) => {
    setLoading(true)
    setMessage('')
    setErrorMsg('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      if (error) throw error

      setMessage('Password reset link sent to your email. Please check your inbox.')
    } catch (error: any) {
      setErrorMsg(error.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 space-y-6">
        
        {/* Header */}
        <div className="space-y-2">
          <Link href="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-black mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Forgot Password?</h1>
          <p className="text-gray-500 text-sm">
            Enter your registered email address and we will send you a link to reset your password.
          </p>
        </div>

        {/* Success/Error Alerts */}
        {message && (
          <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm text-center border border-green-100">
            {message}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center border border-red-100">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1">
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="email"
                placeholder="Email address"
                {...register('email')}
                className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition-all ${
                  errors.email ? 'border-red-500' : 'border-gray-200'
                }`}
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs pl-2">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-2xl font-medium hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? 'Sending link...' : 'Send Reset Link'}
          </button>
        </form>

      </div>
    </div>
  )
}