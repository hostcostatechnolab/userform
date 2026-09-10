'use client'

import { ArrowRight } from 'lucide-react'
import { createOrganizationAction } from '@/lib/actions/org'
import { useAction } from '@/components/ui/use-action'
import { Input, Label, FieldError } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

export function CreateOrgForm() {
  const { pending, error, run } = useAction()

  return (
    <form
      action={(formData) => run(() => createOrganizationAction(formData))}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="name">Workspace name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Acme Inc."
          autoFocus
          required
          minLength={2}
          maxLength={80}
        />
        <FieldError>{error}</FieldError>
      </div>
      <Button type="submit" size="lg" loading={pending} className="w-full">
        Continue
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  )
}
