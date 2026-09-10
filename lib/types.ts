import type { OrgRole } from './constants'

export type { OrgRole }

export type EntrySource = 'web' | 'manual'
export type InviteStatus = 'pending' | 'accepted' | 'revoked'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  phone_number: string | null
  bio: string | null
  avatar_url: string | null
  /** Enrolled 128-d face descriptor, or null if not set up. */
  face_descriptor: number[] | null
  face_photo_path: string | null
  is_superadmin: boolean
  deactivated_at: string | null
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface OrgMember {
  org_id: string
  user_id: string
  role: OrgRole
  created_at: string
}

/** org_members joined with the member's profile — used in the Team screen. */
export interface OrgMemberWithProfile extends OrgMember {
  profile: Profile | null
}

export interface Invitation {
  id: string
  org_id: string
  email: string
  role: OrgRole
  status: InviteStatus
  token: string
  invited_by: string
  created_at: string
  accepted_at: string | null
}

export interface Project {
  id: string
  org_id: string
  name: string
  color: string
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  org_id: string
  project_id: string
  name: string
  archived: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ActivitySession {
  id: string
  org_id: string
  user_id: string
  project_id: string | null
  task_id: string | null
  started_at: string
  ended_at: string | null
  app_version: string | null
  created_at: string
  updated_at: string
}

export interface ActivitySessionDetailed extends ActivitySession {
  project: Pick<Project, 'id' | 'name' | 'color'> | null
  task: Pick<Task, 'id' | 'name'> | null
  profile: Pick<Profile, 'id' | 'full_name'> | null
  screenshot_count: number
}

export interface Screenshot {
  id: string
  org_id: string
  user_id: string
  session_id: string
  task_id: string | null
  captured_at: string
  storage_path: string
  width: number | null
  height: number | null
  created_at: string
}

export interface TimeEntry {
  id: string
  org_id: string
  user_id: string
  project_id: string | null
  started_at: string
  ended_at: string | null
  note: string | null
  source: EntrySource
  clock_in_photo_path: string | null
  clock_out_photo_path: string | null
  clock_in_face_score: number | null
  clock_out_face_score: number | null
  created_at: string
  updated_at: string
}

/** time_entries joined with its project and the owner's profile. */
export interface TimeEntryDetailed extends TimeEntry {
  project: Pick<Project, 'id' | 'name' | 'color'> | null
  profile: Pick<Profile, 'id' | 'full_name'> | null
}

/** The current user's membership context, resolved once per request. */
export interface Membership {
  org: Organization
  role: OrgRole
  isManager: boolean
  allOrgs: { id: string; name: string; role: OrgRole }[]
}
