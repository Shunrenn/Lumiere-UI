import { LayoutGrid, Users, ScrollText, ShieldCheck, ShieldAlert, type LucideIcon } from 'lucide-react'

// The destinations pinned to the Admin icon rail.
export type AdminDestinationId = 'system-dashboard' | 'workforce' | 'security-audit' | 'rbac' | 'damage'

export interface AdminDestination {
  id: AdminDestinationId
  label: string
  icon: LucideIcon
  // Whether the destination has a real, built-out screen yet.
  ready: boolean
}

export const ADMIN_DESTINATIONS: AdminDestination[] = [
  { id: 'system-dashboard', label: 'System Dashboard', icon: LayoutGrid, ready: true },
  { id: 'workforce', label: 'Workforce Management', icon: Users, ready: true },
  { id: 'damage', label: 'Damage Validation', icon: ShieldAlert, ready: true },
  { id: 'rbac', label: 'Roles & Sub-Roles', icon: ShieldCheck, ready: true },
  { id: 'security-audit', label: 'Security Audit Logs', icon: ScrollText, ready: true },
]

export function getAdminDestination(id: AdminDestinationId) {
  return ADMIN_DESTINATIONS.find((destination) => destination.id === id)
}
