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
  | 'manning'
  | 'dispatch'
  | 'production'
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
    id: 'manning',
    label: 'Manning',
    icon: Users,
    blurb: 'Unified crew management: daily shift rosters, event schedules, 48h SLA tasks, and warning ledgers.',
    previewPoints: ['Daily shift grid (AM/PM/OFF)', 'Event schedule & squad assignments', '48h SLA & warning ledger'],
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
