import { LayoutGrid, Users, ScrollText, ShieldCheck, type LucideIcon } from 'lucide-react'

// The four destinations pinned to the Admin icon rail. Only System Dashboard
// renders real content today; the other three resolve to placeholder screens
// built out in later phases. Kept in one list so the rail and the router stay
// in lockstep as those screens land.
export type AdminDestinationId = 'system-dashboard' | 'workforce' | 'security-audit' | 'rbac'

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
  { id: 'rbac', label: 'Roles & Sub-Roles', icon: ShieldCheck, ready: true },
  { id: 'security-audit', label: 'Security Audit Logs', icon: ScrollText, ready: true },
]

export function getAdminDestination(id: AdminDestinationId) {
  return ADMIN_DESTINATIONS.find((destination) => destination.id === id)
}
