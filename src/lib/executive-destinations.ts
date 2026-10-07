import { LayoutGrid, ClipboardList, ClipboardCheck, Boxes, ListFilter, PenTool, Palette, BriefcaseBusiness, CalendarRange, Layers3, type LucideIcon } from 'lucide-react'
import type { Route } from '@/lib/types'

// Executive console destinations.
// Reconciled to client-presented authority:
// Executive Dashboard, Asset Inventory, Event Operations, Damage Reports,
// and Operational Audit Logs.
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
  { id: 'dashboard', label: 'Event Planner Dashboard', icon: LayoutGrid, route: 'dashboard' },
  { id: 'design-projects', label: 'Design Projects', icon: PenTool, route: 'design-projects' },
  { id: 'mood-boards', label: 'Styling Templates', icon: Palette, route: 'mood-boards' },
  { id: 'inventory', label: 'Asset Inventory', icon: Boxes, route: 'inventory' },
]

export const PLANNER_RAIL_IDENTITY = {
  roleLabel: 'EVENT PLANNER',
  getName: (sessionName: string | undefined) => sessionName || 'Event Planner',
} as const

export const PROJECT_MANAGER_RAIL_DESTINATIONS: readonly SharedRailDestination[] = [
  { id: 'dashboard', label: 'Project Manager Dashboard', icon: LayoutGrid, route: 'project-manager' },
  { id: 'projects', label: 'Projects & Events', icon: BriefcaseBusiness, route: 'project-manager' },
  { id: 'calendar', label: 'Master Schedule', icon: CalendarRange, route: 'project-manager' },
  { id: 'pitches', label: 'Client Pitches & Briefs', icon: Layers3, route: 'project-manager' },
]

export const PROJECT_MANAGER_RAIL_IDENTITY = {
  roleLabel: 'PROJECT COMMAND',
  getName: (sessionName: string | undefined) => sessionName || 'Project Manager',
} as const

export const EXECUTIVE_DESTINATIONS: ExecutiveDestination[] = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutGrid },
  { id: 'inventory', label: 'Asset Inventory', icon: Boxes },
  { id: 'registry', label: 'Event Operations', icon: ClipboardList },
  { id: 'damage', label: 'Damage Reports', icon: ClipboardCheck },
  { id: 'logs', label: 'Operational Audit Logs', icon: ListFilter },
]

export function getExecutiveDestination(id: ExecutiveDestinationId) {
  return EXECUTIVE_DESTINATIONS.find((destination) => destination.id === id)
}

