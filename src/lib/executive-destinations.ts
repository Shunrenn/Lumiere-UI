import { LayoutGrid, ClipboardList, Boxes, ListFilter, type LucideIcon } from 'lucide-react'

// Executive console destinations.
// Reconciled to client-presented authority:
// Executive Dashboard, Asset Inventory (conditional permission),
// Event Operations, and System Audit Trail & Security Logs.
export type ExecutiveDestinationId = 'dashboard' | 'inventory' | 'registry' | 'damage' | 'logs'

export interface ExecutiveDestination {
  id: ExecutiveDestinationId
  label: string
  icon: LucideIcon
}

export const EXECUTIVE_DESTINATIONS: ExecutiveDestination[] = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutGrid },
  { id: 'inventory', label: 'Asset Inventory', icon: Boxes },
  { id: 'registry', label: 'Event Operations', icon: ClipboardList },
  { id: 'logs', label: 'System Audit Trail & Security Logs', icon: ListFilter },
]

export function getExecutiveDestination(id: ExecutiveDestinationId) {
  return EXECUTIVE_DESTINATIONS.find((destination) => destination.id === id)
}
