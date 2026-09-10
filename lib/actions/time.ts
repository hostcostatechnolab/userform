'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  assertManager,
  fail,
  getActionContext,
  ok,
  toMessage,
  type ActionResult,
} from './helpers'
import { checkGeofence } from '@/lib/geo'
import type { Organization } from '@/lib/types'

function revalidateTimeViews() {
  revalidatePath('/dashboard')
  revalidatePath('/timesheet')
  revalidatePath('/entries')
  revalidatePath('/reports')
  revalidatePath('/attendance')
  revalidatePath('/monthly')
}

/** Selfie is mandatory on every live clock in / out (face recognition). */
const punchPhotoSchema = z.object({
  photoPath: z.string().min(1, 'A verification photo is required'),
  faceScore: z.number().finite(),
})

const coordsSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  accuracy: z.number().nonnegative().optional(),
})

/** Server-side geofence gate. Returns an error string, or null when allowed. */
function geofenceError(
  org: Organization,
  lat?: number,
  lng?: number,
  accuracy?: number
): string | null {
  if (!org.geofence_enabled) return null
  if (org.geofence_lat == null || org.geofence_lng == null) return null
  if (lat == null || lng == null) {
    return 'Location is required to clock in here — enable location access and try again.'
  }
  const res = checkGeofence(
    {
      lat: org.geofence_lat,
      lng: org.geofence_lng,
      radiusM: org.geofence_radius_m,
      label: org.geofence_label,
    },
    lat,
    lng,
    accuracy ?? 0
  )
  return res.ok ? null : res.reason ?? 'You are outside the allowed area.'
}

const optionalUuid = z
  .union([z.string().uuid(), z.literal(''), z.null(), z.undefined()])
  .transform((v) => (v ? v : null))

const noteSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v ? v.trim().slice(0, 500) : null))

/** Start a timer. Fails if one is already running (DB unique index also guards). */
export async function clockInAction(input: {
  photoPath: string
  faceScore: number
  projectId?: string | null
  note?: string | null
  lat?: number
  lng?: number
  accuracy?: number
}): Promise<ActionResult> {
  try {
    const ctx = await getActionContext()

    const photo = punchPhotoSchema.safeParse(input)
    if (!photo.success) return fail(photo.error.issues[0].message)
    if (!photo.data.photoPath.startsWith(`${ctx.user.id}/`)) {
      return fail('Invalid photo reference')
    }

    const coords = coordsSchema.safeParse(input)
    if (!coords.success) return fail('Invalid location')
    const geoErr = geofenceError(
      ctx.membership.org as Organization,
      coords.data.lat,
      coords.data.lng,
      coords.data.accuracy
    )
    if (geoErr) return fail(geoErr)

    const projectId = optionalUuid.parse(input?.projectId)
    const note = noteSchema.parse(input?.note)

    const { data: running } = await ctx.supabase
      .from('time_entries')
      .select('id')
      .eq('org_id', ctx.membership.org.id)
      .eq('user_id', ctx.user.id)
      .is('ended_at', null)
      .maybeSingle()

    if (running) return fail('You are already clocked in')

    const { error } = await ctx.supabase.from('time_entries').insert({
      org_id: ctx.membership.org.id,
      user_id: ctx.user.id,
      project_id: projectId,
      started_at: new Date().toISOString(),
      note,
      source: 'web',
      clock_in_photo_path: photo.data.photoPath,
      clock_in_face_score: photo.data.faceScore,
      clock_in_lat: coords.data.lat ?? null,
      clock_in_lng: coords.data.lng ?? null,
      clock_in_accuracy_m: coords.data.accuracy ?? null,
    })
    if (error) return fail(toMessage(error))

    revalidateTimeViews()
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}

/** Stop the running timer. Also requires a verification selfie. */
export async function clockOutAction(input: {
  photoPath: string
  faceScore: number
  lat?: number
  lng?: number
  accuracy?: number
}): Promise<ActionResult> {
  try {
    const ctx = await getActionContext()

    const photo = punchPhotoSchema.safeParse(input)
    if (!photo.success) return fail(photo.error.issues[0].message)
    if (!photo.data.photoPath.startsWith(`${ctx.user.id}/`)) {
      return fail('Invalid photo reference')
    }

    const coords = coordsSchema.safeParse(input)
    if (!coords.success) return fail('Invalid location')
    const geoErr = geofenceError(
      ctx.membership.org as Organization,
      coords.data.lat,
      coords.data.lng,
      coords.data.accuracy
    )
    if (geoErr) return fail(geoErr)

    const { data: running } = await ctx.supabase
      .from('time_entries')
      .select('id, started_at')
      .eq('org_id', ctx.membership.org.id)
      .eq('user_id', ctx.user.id)
      .is('ended_at', null)
      .maybeSingle()

    if (!running) return fail('You are not clocked in')

    const endedAt = new Date()
    if (endedAt.getTime() < new Date(running.started_at).getTime()) {
      return fail('Clock is out of sync — try again')
    }

    const { error } = await ctx.supabase
      .from('time_entries')
      .update({
        ended_at: endedAt.toISOString(),
        clock_out_photo_path: photo.data.photoPath,
        clock_out_face_score: photo.data.faceScore,
        clock_out_lat: coords.data.lat ?? null,
        clock_out_lng: coords.data.lng ?? null,
        clock_out_accuracy_m: coords.data.accuracy ?? null,
      })
      .eq('id', running.id)
    if (error) return fail(toMessage(error))

    revalidateTimeViews()
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}

const manualEntrySchema = z
  .object({
    started_at: z.string().min(1, 'Start time is required'),
    ended_at: z.string().min(1, 'End time is required'),
    project_id: optionalUuid,
    note: noteSchema,
    user_id: optionalUuid,
  })
  .refine(
    (v) => new Date(v.ended_at).getTime() > new Date(v.started_at).getTime(),
    { message: 'End time must be after start time', path: ['ended_at'] }
  )
  .refine((v) => new Date(v.started_at).getTime() <= Date.now(), {
    message: 'Start time cannot be in the future',
    path: ['started_at'],
  })

function parseLocalDatetime(value: string): string {
  // `datetime-local` gives "YYYY-MM-DDTHH:mm" in local time; normalise to UTC ISO.
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
  return d.toISOString()
}

export async function addManualEntryAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const ctx = await getActionContext()
    const parsed = manualEntrySchema.safeParse({
      started_at: formData.get('started_at'),
      ended_at: formData.get('ended_at'),
      project_id: formData.get('project_id'),
      note: formData.get('note'),
      user_id: formData.get('user_id'),
    })
    if (!parsed.success) return fail(parsed.error.issues[0].message)

    // Only managers may log time for someone else.
    let targetUser = ctx.user.id
    if (parsed.data.user_id && parsed.data.user_id !== ctx.user.id) {
      assertManager(ctx)
      targetUser = parsed.data.user_id
    }

    const { error } = await ctx.supabase.from('time_entries').insert({
      org_id: ctx.membership.org.id,
      user_id: targetUser,
      project_id: parsed.data.project_id,
      started_at: parseLocalDatetime(parsed.data.started_at),
      ended_at: parseLocalDatetime(parsed.data.ended_at),
      note: parsed.data.note,
      source: 'manual',
    })
    if (error) return fail(toMessage(error))

    revalidateTimeViews()
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}

const updateEntrySchema = z
  .object({
    id: z.string().uuid(),
    started_at: z.string().min(1),
    ended_at: z.string().min(1),
    project_id: optionalUuid,
    note: noteSchema,
  })
  .refine(
    (v) => new Date(v.ended_at).getTime() > new Date(v.started_at).getTime(),
    { message: 'End time must be after start time', path: ['ended_at'] }
  )

export async function updateEntryAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const ctx = await getActionContext()
    const parsed = updateEntrySchema.safeParse({
      id: formData.get('id'),
      started_at: formData.get('started_at'),
      ended_at: formData.get('ended_at'),
      project_id: formData.get('project_id'),
      note: formData.get('note'),
    })
    if (!parsed.success) return fail(parsed.error.issues[0].message)

    // RLS allows own-or-manager; scope the update by org for safety.
    const { error } = await ctx.supabase
      .from('time_entries')
      .update({
        started_at: parseLocalDatetime(parsed.data.started_at),
        ended_at: parseLocalDatetime(parsed.data.ended_at),
        project_id: parsed.data.project_id,
        note: parsed.data.note,
      })
      .eq('id', parsed.data.id)
      .eq('org_id', ctx.membership.org.id)
    if (error) return fail(toMessage(error))

    revalidateTimeViews()
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}

export async function deleteEntryAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await getActionContext()
    if (!z.string().uuid().safeParse(id).success) return fail('Invalid entry')

    const { error } = await ctx.supabase
      .from('time_entries')
      .delete()
      .eq('id', id)
      .eq('org_id', ctx.membership.org.id)
    if (error) return fail(toMessage(error))

    revalidateTimeViews()
    return ok()
  } catch (e) {
    return fail(toMessage(e))
  }
}
