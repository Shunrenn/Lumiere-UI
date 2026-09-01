import { LayoutGrid, ClipboardList, Boxes, ShieldAlert, ListFilter, type LucideIcon } from 'lucide-react'

// The five destinations pinned to the Executive icon rail — mirrors the
// Admin console's ADMIN_DESTINATIONS list/rail pattern exactly. Each maps to
// a real, already-built screen (unlike Admin's placeholder entries), so
// `ready` isn't needed here.
export type ExecutiveDestinationId = 'dashboard' | 'registry' | 'inventory' | 'damage' | 'logs'

export interface ExecutiveDestination {
  id: ExecutiveDestinationId
  label: string
  icon: LucideIcon
}

export const EXECUTIVE_DESTINATIONS: ExecutiveDestination[] = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutGrid },
  { id: 'registry', label: 'Event Operations', icon: ClipboardList },
  { id: 'inventory', label: 'Asset Inventory', icon: Boxes },
  { id: 'damage', label: 'Damage Validation', icon: ShieldAlert },
  { id: 'logs', label: 'Operational Audit Logs', icon: ListFilter },
]

export function getExecutiveDestination(id: ExecutiveDestinationId) {
  return EXECUTIVE_DESTINATIONS.find((destination) => destination.id === id)
}
