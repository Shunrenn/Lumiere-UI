import {
  Boxes,
  CalendarClock,
  Hammer,
  PackageSearch,
  ShieldAlert,
  Store,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'

// The six operational modules a Warehouse Operations Manager drills into.
// Shared between the home-screen module row and the icon rail so both
// surfaces stay in lockstep as modules are filled in during later phases.
export type WarehouseModuleId =
  | 'assets'
  | 'replenishment'
  | 'vendors'
  | 'manpower'
  | 'dispatch'
  | 'production'
  | 'manning-sla'
  | 'incidents'

export interface WarehouseModule {
  id: WarehouseModuleId
  label: string
  icon: LucideIcon
  blurb: string
  previewPoints: string[]
}

export const WAREHOUSE_MODULES: WarehouseModule[] = [
  {
    id: 'assets',
    label: 'Asset Catalog',
    icon: Boxes,
    blurb: 'Category-specific asset views, stock levels, and condition tracking.',
    previewPoints: ['Category-specific asset layouts', 'Stock & threshold tracking', 'Condition and maintenance flags'],
  },
  {
    id: 'replenishment',
    label: 'Replenishment & Deficits',
    icon: PackageSearch,
    blurb: 'Deficit tracking, reorder requisitions, and procurement status.',
    previewPoints: ['Checkpoint-based deficit tracking', 'Reorder requisition routing', 'Purchase order status'],
  },
  {
    id: 'vendors',
    label: 'Vendor Management',
    icon: Store,
    blurb: 'Vendor directory, lead times, and preferred-supplier routing.',
    previewPoints: ['Vendor directory & ratings', 'Lead-time comparisons', 'Preferred-supplier routing'],
  },
  {
    id: 'manpower',
    label: 'Manpower & Crew',
    icon: Users,
    blurb: 'Crew roster, availability, and scheduling conflicts.',
    previewPoints: ['Crew roster & availability', 'Scheduling conflict flags', 'Task force deployment'],
  },
  {
    id: 'manning-sla',
    label: 'Manning & SLA Engine',
    icon: CalendarClock,
    blurb: 'Daily manning assignments, the 48h lead-confirmation SLA, and three-tier warnings.',
    previewPoints: ['Lead tagging & roster inheritance', '48h SLA with auto-escalation', 'Three-tier warning ledger'],
  },
  {
    id: 'incidents',
    label: 'Incident Reporting',
    icon: ShieldAlert,
    blurb: 'Crew-filed incident reports with a PIN-gated WOM review queue.',
    previewPoints: ['Categorised incident intake', 'PIN-gated WOM review', 'Resolve / dismiss with audit notes'],
  },
  {
    id: 'dispatch',
    label: 'Dispatch & Logistics',
    icon: Truck,
    blurb: 'Dispatch manifests, vehicle assignments, and transit checkpoints.',
    previewPoints: ['Dispatch manifests', 'Vehicle assignments', 'Transit checkpoint history'],
  },
  {
    id: 'production',
    label: 'Production & Fabrication',
    icon: Hammer,
    blurb: 'Fabrication queues, build timelines, and workshop capacity.',
    previewPoints: ['Fabrication queue', 'Build timelines', 'Workshop capacity'],
  },
]

export function getWarehouseModule(id: WarehouseModuleId) {
  return WAREHOUSE_MODULES.find((module) => module.id === id)
}
