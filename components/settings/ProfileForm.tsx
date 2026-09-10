'use client'

import { useRouter } from 'next/navigation'
import { User, Phone, FileText, Save } from 'lucide-react'
import { updateProfileAction } from '@/lib/actions/profile'
import { useAction } from '@/components/ui/use-action'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Label } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import type { Profile } from '@/lib/types'

export function ProfileForm({
  profile,
  email,
}: {
  profile: Profile | null
  email: string | null
}) {
  const router = useRouter()
  const { pending, error, success, run } = useAction()

  return (
    <form
      action={(fd) =>
        run(() => updateProfileAction(fd), { onSuccess: () => router.refresh() })
      }
      className="space-y-4"
    >
      {error && <Alert tone="red">{error}</Alert>}
      {success && <Alert tone="green">Profile saved.</Alert>}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email ?? ''} disabled />
      </div>

      <div>
        <Label htmlFor="full_name">Full name</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-zinc-400" />
          <Input
            id="full_name"
            name="full_name"
            className="pl-11"
            defaultValue={profile?.full_name ?? ''}
            placeholder="Your name"
            required
            minLength={2}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="phone_number">Phone number</Label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-zinc-400" />
          <Input
            id="phone_number"
            name="phone_number"
            className="pl-11"
            defaultValue={profile?.phone_number ?? ''}
            placeholder="+1 555 000 0000"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-zinc-400" />
          <Textarea
            id="bio"
            name="bio"
            rows={3}
            className="pl-11"
            defaultValue={profile?.bio ?? ''}
            maxLength={200}
            placeholder="A little about you (optional)"
          />
        </div>
      </div>

      <Button type="submit" loading={pending}>
        <Save className="h-4 w-4" />
        Save profile
      </Button>
    </form>
  )
}
