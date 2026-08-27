'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/utils/supabase/client'
import { User, Phone, FileText, LogOut, Loader2, Save, ShieldCheck } from 'lucide-react'

const profileSchema = z.object({
  full_name: z.string().min(2, { message: 'Full name must be at least 2 characters' }),
  phone_number: z.string().min(10, { message: 'Please enter a valid phone number' }),
  bio: z.string().max(200, { message: 'Bio cannot exceed 200 characters' }).optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setValue('full_name', data.full_name || '')
        setValue('phone_number', data.phone_number || '')
        setValue('bio', data.bio || '')
      }
      setLoading(false)
    }

    getProfile()
  }, [router, supabase, setValue])

  const onSubmit = async (data: ProfileFormValues) => {
    setSaving(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const updates = {
        id: user.id,
        full_name: data.full_name,
        phone_number: data.phone_number,
        bio: data.bio,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('profiles').upsert(updates)
      if (error) throw error

      setMessage('Profile updated successfully!')
    } catch (error: any) {
      setMessage('Error updating profile: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 py-8 px-4 flex flex-col items-center pb-24">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white/20 p-8 space-y-6">
        
        {/* Profile Header Avatar & Logout */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-black/10">
              U
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Account Settings</h1>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified Account
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-10 h-10 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all active:scale-95"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {message && (
          <div className={`p-3.5 rounded-2xl text-xs font-medium text-center border animate-fade-in ${message.includes('success') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {message}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Enter your full name"
                {...register('full_name')}
                className={`w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border rounded-2xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all ${
                  errors.full_name ? 'border-red-500' : 'border-gray-200'
                }`}
              />
            </div>
            {errors.full_name && <p className="text-red-500 text-xs pl-2 font-medium">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Enter phone number"
                {...register('phone_number')}
                className={`w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border rounded-2xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all ${
                  errors.phone_number ? 'border-red-500' : 'border-gray-200'
                }`}
              />
            </div>
            {errors.phone_number && <p className="text-red-500 text-xs pl-2 font-medium">{errors.phone_number.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Bio</label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
              <textarea
                rows={3}
                placeholder="Tell us a little about yourself..."
                {...register('bio')}
                className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all resize-none"
              />
            </div>
            {errors.bio && <p className="text-red-500 text-xs pl-2 font-medium">{errors.bio.message}</p>}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-black text-white py-4 rounded-2xl font-semibold text-sm shadow-xl shadow-black/10 hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-70 mt-4"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving changes...' : 'Save Profile'}
          </button>
        </form>

      </div>

      {/* App-like Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/60 py-3 px-6 flex justify-around items-center max-w-md mx-auto rounded-t-3xl shadow-lg md:hidden">
        <button className="flex flex-col items-center text-black font-semibold text-xs gap-1">
          <User className="h-5 w-5" />
          Profile
        </button>
        <button onClick={handleLogout} className="flex flex-col items-center text-gray-400 hover:text-red-600 font-medium text-xs gap-1 transition-colors">
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  )
}