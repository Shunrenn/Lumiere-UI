import { LayoutGrid, ClipboardList, ClipboardCheck, Boxes, ListFilter, PenTool, Palette, type LucideIcon } from 'lucide-react'
import type { Route } from '@/lib/types'

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

export interface SharedRailDestination {
  id: string
  label: string
  icon: LucideIcon
  route: Route
}

export const PLANNER_RAIL_DESTINATIONS: readonly SharedRailDestination[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, route: 'dashboard' },
  { id: 'design-projects', label: 'Design Projects', icon: PenTool, route: 'design-projects' },
  { id: 'mood-boards', label: 'Mood Boards', icon: Palette, route: 'mood-boards' },
  { id: 'inventory', label: 'Asset Catalog', icon: Boxes, route: 'inventory' },
]

export const PLANNER_RAIL_IDENTITY = {
  roleLabel: 'EVENT PLANNER',
  getName: (sessionName: string | undefined) => sessionName || 'Event Planner',
} as const

export const EXECUTIVE_DESTINATIONS: ExecutiveDestination[] = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutGrid },
  { id: 'inventory', label: 'Asset Inventory', icon: Boxes },
  { id: 'registry', label: 'Event Operations', icon: ClipboardList },
  { id: 'damage', label: 'Damage Validation', icon: ClipboardCheck },
  { id: 'logs', label: 'System Audit Trail & Security Logs', icon: ListFilter },
]

export function getExecutiveDestination(id: ExecutiveDestinationId) {
  return EXECUTIVE_DESTINATIONS.find((destination) => destination.id === id)
}
