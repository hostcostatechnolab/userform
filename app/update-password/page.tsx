'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/utils/supabase/client'
import { Lock, Loader2, KeyRound } from 'lucide-react'

const updateSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
})

type UpdateFormValues = z.infer<typeof updateSchema>

export default function UpdatePasswordPage() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
  })

  const onSubmit = async (data: UpdateFormValues) => {
    setLoading(true)
    setErrorMsg('')

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })
      if (error) throw error

      alert('Password updated successfully!')
      router.push('/profile')
      router.refresh()
    } catch (error: any) {
      setErrorMsg(error.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 space-y-6">
        
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Set New Password</h1>
          <p className="text-gray-500 text-sm">Please enter your new secure password below.</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center border border-red-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="password"
                placeholder="New Password"
                {...register('password')}
                className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition-all ${
                  errors.password ? 'border-red-500' : 'border-gray-200'
                }`}
              />
            </div>
            {errors.password && <p className="text-red-500 text-xs pl-2">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-2xl font-medium hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

      </div>
    </div>
  )
}