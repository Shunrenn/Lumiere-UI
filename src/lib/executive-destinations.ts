import { LayoutGrid, ClipboardList, ShieldAlert, ListFilter, type LucideIcon } from 'lucide-react'

// The four destinations pinned to the Executive icon rail — mirrors the
// Admin console's ADMIN_DESTINATIONS list/rail pattern.
export type ExecutiveDestinationId = 'dashboard' | 'registry' | 'damage' | 'logs'

export interface ExecutiveDestination {
  id: ExecutiveDestinationId
  label: string
  icon: LucideIcon
}

export const EXECUTIVE_DESTINATIONS: ExecutiveDestination[] = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutGrid },
  { id: 'registry', label: 'Event Operations', icon: ClipboardList },
  { id: 'damage', label: 'Damage Validation', icon: ShieldAlert },
  { id: 'logs', label: 'Operational Audit Logs', icon: ListFilter },
]

export function getExecutiveDestination(id: ExecutiveDestinationId) {
  return EXECUTIVE_DESTINATIONS.find((destination) => destination.id === id)
}
