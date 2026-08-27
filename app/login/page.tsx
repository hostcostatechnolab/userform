'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/utils/supabase/client'
import { Mail, Lock, User, Phone, Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(
      z.object({
        email: z.string().email({ message: 'Please enter a valid email address' }),
        password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
        full_name: isLogin ? z.string().optional() : z.string().min(2, { message: 'Full name is required' }),
        phone_number: isLogin ? z.string().optional() : z.string().min(10, { message: 'Phone number is required' }),
      })
    ),
  })

  const onSubmit = async (data: any) => {
    setLoading(true)
    setErrorMsg('')

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })
        if (error) throw error
        router.push('/profile')
        router.refresh()
      } else {
        // 1. Supabase Auth માં સાઇન અપ કરો
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        })
        if (authError) throw authError

        // 2. જો યુઝર સફળતાપૂર્વક બની જાય, તો profiles ટેબલમાં નામ અને નંબર સેવ કરો
        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: authData.user.id,
              full_name: data.full_name,
              phone_number: data.phone_number,
              updated_at: new Date().toISOString(),
            })
          
          if (profileError) throw profileError
        }

        router.push('/profile')
        router.refresh()
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 space-y-6">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {isLogin ? 'Welcome Back!' : 'Create Account'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isLogin ? 'Enter your details to sign in to your account.' : 'Fill in your details to get started.'}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center border border-red-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Sign Up વખતે જ Full Name અને Phone Number દેખાશે */}
          {!isLogin && (
            <>
              <div className="space-y-1">
                <div className="relative">
                  <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    {...register('full_name')}
                    className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition-all ${
                      errors.full_name ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                </div>
                {errors.full_name && <p className="text-red-500 text-xs pl-2">{String(errors.full_name.message)}</p>}
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    {...register('phone_number')}
                    className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition-all ${
                      errors.phone_number ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                </div>
                {errors.phone_number && <p className="text-red-500 text-xs pl-2">{String(errors.phone_number.message)}</p>}
              </div>
            </>
          )}

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
            {errors.email && <p className="text-red-500 text-xs pl-2">{String(errors.email.message)}</p>}
          </div>

          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="password"
                placeholder="Password"
                {...register('password')}
                className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition-all ${
                  errors.password ? 'border-red-500' : 'border-gray-200'
                }`}
              />
            </div>
            {errors.password && <p className="text-red-500 text-xs pl-2">{String(errors.password.message)}</p>}
          </div>

          {isLogin && (
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-gray-500 hover:text-black font-medium">
                Forgot Password?
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-2xl font-medium hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-70 mt-2"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600 pt-2">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin)
              setErrorMsg('')
              reset()
            }}
            className="text-black font-semibold hover:underline focus:outline-none"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

      </div>
    </div>
  )
}