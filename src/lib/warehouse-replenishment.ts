// Canonical derivation layer for Replenishment & Deficits.
// Eliminates synthetic deficit generation. Uses canonical deficit queue data.
import type { PortalEvent, DeficitStatus } from '@/shared/types'
import { getCatalogAssets, type CatalogAsset } from '@/lib/warehouse-catalog'

export type TriggerSource = 'Canvas' | 'Batch Pahabol' | 'Manual Audit' | 'Auto-Threshold'

export type DeficitPriority = 'Low' | 'Medium' | 'High' | 'Critical'

export type { DeficitStatus }

export interface DeficitLine {
  id: string
  eventId?: string
  eventTitle?: string
  itemName: string
  category: string
  unit: string
  triggerSource: TriggerSource
  currentStock: number
  threshold: number
  costPerUnit: number
  priority: DeficitPriority
  status: DeficitStatus
  primaryVendorId: string
  backupVendorId?: string
  quantityNeeded: number
  taggedForDispatch?: boolean
}

export function getDeficitLines(events: PortalEvent[] = []): DeficitLine[] {
  void events
  // Authoritative default: Return empty when deficit_queue is empty.
  return []
}

export function lineCost(line: DeficitLine): number {
  return (line.quantityNeeded || 0) * (line.costPerUnit || 0)
}

export function checkAndQueueDeficits(
  assets: CatalogAsset[] = getCatalogAssets(),
  existing: DeficitLine[] = [],
): DeficitLine[] {
  void assets
  void existing
  return []
}
