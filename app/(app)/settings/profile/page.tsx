import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireMembership, requireUser } from '@/lib/queries/org'
import { signSelfies } from '@/lib/queries/photos'
import { ROLE_LABELS } from '@/lib/constants'
import { ProfileForm } from '@/components/settings/ProfileForm'
import { FaceEnrollCard } from '@/components/face/FaceEnrollCard'
import { Card, CardContent } from '@/components/ui/card'
import type { Profile } from '@/lib/types'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfileSettingsPage() {
  const user = await requireUser()
  const { org, role } = await requireMembership()

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>()

  const faceUrls = await signSelfies([profile?.face_photo_path])
  const facePhotoUrl = profile?.face_photo_path
    ? faceUrls[profile.face_photo_path] ?? null
    : null

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <ProfileForm profile={profile ?? null} email={user.email ?? null} />
        </CardContent>
      </Card>

      <FaceEnrollCard
        enrolled={Boolean(profile?.face_descriptor?.length)}
        photoUrl={facePhotoUrl}
        userId={user.id}
        orgId={org.id}
      />

      <Card>
        <CardContent className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Workspace <span className="font-medium text-slate-800">{org.name}</span>
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {ROLE_LABELS[role]}
          </span>
        </CardContent>
      </Card>
    </div>
  )
}
