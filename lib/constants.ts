export const APP_NAME = 'Jibble Clone'
export const APP_DESCRIPTION = 'Time tracking & attendance for teams'

/** Cookie that remembers which organization the user is currently viewing. */
export const ACTIVE_ORG_COOKIE = 'active_org'

export const ORG_ROLES = ['owner', 'admin', 'member'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

export const MANAGER_ROLES: OrgRole[] = ['owner', 'admin']

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

export const PROJECT_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#64748b',
]

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/timesheet', label: 'Timesheet', icon: 'CalendarDays' },
  { href: '/entries', label: 'Time Entries', icon: 'ListChecks' },
  { href: '/attendance', label: 'Attendance', icon: 'ClipboardCheck', managerOnly: true },
  { href: '/monthly', label: 'Monthly', icon: 'CalendarRange', managerOnly: true },
  { href: '/activity', label: 'Activity', icon: 'Monitor' },
  { href: '/projects', label: 'Projects', icon: 'FolderKanban', managerOnly: true },
  { href: '/team', label: 'Team', icon: 'Users', managerOnly: true },
  { href: '/reports', label: 'Reports', icon: 'BarChart3', managerOnly: true },
] as const
