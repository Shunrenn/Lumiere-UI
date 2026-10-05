import {
  Boxes,
  Hammer,
  LayoutGrid,
  PackageSearch,
  ShieldAlert,
  Store,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Route } from '@/lib/types'
import type { SharedRailDestination } from '@/lib/executive-destinations'

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
    label: 'Manning Delegation',
    icon: Users,
    blurb: 'Unified crew management: daily shift rosters, event schedules, deployment rosters, and warning ledgers.',
    previewPoints: ['Daily shift grid (AM/PM/OFF)', 'Event schedule & squad assignments', 'Crew deployment rosters & warning ledger'],
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

/** Canonical desktop destinations for Warehouse Operations. Keep this as the
 * single source for dashboard tiles, sidebar order, icons, and active routes. */
export const WAREHOUSE_MODULE_ROUTES: Record<WarehouseModuleId, Route> = {
  assets: 'inventory',
  replenishment: 'replenishment',
  vendors: 'vendors',
  manning: 'crew',
  dispatch: 'dispatch',
  production: 'production',
}

export const WAREHOUSE_DESTINATIONS: readonly SharedRailDestination[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutGrid, route: 'overview' },
  ...WAREHOUSE_MODULES.map((module) => ({
    id: module.id,
    label: module.label,
    icon: module.icon,
    route: WAREHOUSE_MODULE_ROUTES[module.id],
  })),
  { id: 'damage', label: 'Damage Validation', icon: ShieldAlert, route: 'damage' },
]
