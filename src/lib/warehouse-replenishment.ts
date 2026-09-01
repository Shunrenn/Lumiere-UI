// Deterministic seed + derivation layer for Replenishment & Deficits.
// Deficit lines are generated against the live event roster so the
// Event-Grouped view always reflects the events actually in the portal;
// a handful of lines are left event-less to represent general stockroom
// shortages that only ever surface in the Consolidated view.
import type { PortalEvent } from '@/lib/types'
import { getCatalogAssets, getLowStockAssets, type CatalogAsset } from '@/lib/warehouse-catalog'
import { getWarehouseVendors } from '@/lib/warehouse-vendors'

export type TriggerSource = 'Canvas' | 'Batch Pahabol' | 'Manual Audit' | 'Auto-Threshold'

export type DeficitPriority = 'Low' | 'Medium' | 'High' | 'Critical'

export type DeficitStatus = 'Flagged' | 'PO Drafted' | 'PO Sent' | 'Resolved'

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

function hashOf(value: string) {
  return Math.abs(value.split('').reduce((sum, char) => sum + char.charCodeAt(0) * 31, 7))
}

const TRIGGER_SOURCES: TriggerSource[] = ['Canvas', 'Batch Pahabol', 'Manual Audit']
const PRIORITIES: DeficitPriority[] = ['Low', 'Medium', 'High', 'Critical']
const STATUSES: DeficitStatus[] = ['Flagged', 'Flagged', 'PO Drafted', 'PO Sent']

let cache: { key: string; lines: DeficitLine[] } | null = null

export function getDeficitLines(events: PortalEvent[]): DeficitLine[] {
  const key = events.map((e) => e.id).join(',')
  if (cache && cache.key === key) return cache.lines

  const assets = getCatalogAssets().filter((a) => a.category === 'Event Asset' || a.category === 'Stockroom')
  const vendors = getWarehouseVendors()
  const lines: DeficitLine[] = []

  // One or two deficit lines per event, drawn from the deficit-prone assets.
  events.forEach((event, eventIndex) => {
    const seed = hashOf(event.refId)
    const lineCount = 1 + (seed % 2)
    for (let i = 0; i < lineCount; i += 1) {
      const asset = assets[(seed + i * 5 + eventIndex) % assets.length]
      const assetSeed = hashOf(`${event.id}-${asset.id}-${i}`)
      const threshold = asset.threshold ?? 60
      const currentStock = Math.max(0, Math.round(threshold * (0.05 + ((assetSeed % 30) / 100))))
      const primaryVendor = vendors[assetSeed % vendors.length]
      const backupVendor = vendors[(assetSeed + 3) % vendors.length]
      const priority: DeficitPriority = currentStock / threshold < 0.15 ? 'Critical' : currentStock / threshold < 0.35 ? 'High' : PRIORITIES[assetSeed % 2]
      lines.push({
        id: `def-${event.id}-${i}`,
        eventId: event.id,
        eventTitle: event.title,
        itemName: asset.name,
        category: asset.category,
        unit: asset.unit,
        triggerSource: TRIGGER_SOURCES[assetSeed % TRIGGER_SOURCES.length],
        currentStock,
        threshold,
        costPerUnit: asset.costPerUnit,
        priority,
        status: STATUSES[assetSeed % STATUSES.length],
        primaryVendorId: primaryVendor.id,
        backupVendorId: backupVendor.id !== primaryVendor.id ? backupVendor.id : undefined,
        quantityNeeded: Math.max(4, threshold - currentStock),
      })
    }
  })

  // A few event-less stockroom-wide shortages, only visible when consolidated.
  const generalCount = Math.min(4, assets.length)
  for (let i = 0; i < generalCount; i += 1) {
    const asset = assets[(assets.length - 1 - i + assets.length) % assets.length]
    const seed = hashOf(`general-${asset.id}`)
    const threshold = asset.threshold ?? 60
    const currentStock = Math.max(0, Math.round(threshold * (0.05 + ((seed % 25) / 100))))
    const primaryVendor = vendors[seed % vendors.length]
    const backupVendor = vendors[(seed + 3) % vendors.length]
    lines.push({
      id: `def-general-${asset.id}`,
      itemName: asset.name,
      category: asset.category,
      unit: asset.unit,
      triggerSource: 'Manual Audit',
      currentStock,
      threshold,
      costPerUnit: asset.costPerUnit,
      priority: currentStock / threshold < 0.15 ? 'Critical' : 'Medium',
      status: 'Flagged',
      primaryVendorId: primaryVendor.id,
      backupVendorId: backupVendor.id !== primaryVendor.id ? backupVendor.id : undefined,
      quantityNeeded: Math.max(4, threshold - currentStock),
    })
  }

  // Automated threshold breaches, appended on first derivation so the hub
  // opens already in sync with the Asset Catalog.
  lines.push(...checkAndQueueDeficits(getCatalogAssets(), lines))

  cache = { key, lines }
  return lines
}

export function lineCost(line: DeficitLine): number {
  return line.quantityNeeded * line.costPerUnit
}

// ---------- Automated stock-below-threshold listener ----------
// Every Event Asset / Stockroom item whose available stock has fallen under
// its reorder threshold is queued as an `Auto-Threshold` deficit line.
// Deficit quantity = max(0, threshold - available stock).
// Items already represented in the hub (manual audit, canvas, pahabol, or a
// previous auto sweep) are skipped so the sweep is idempotent.
export function checkAndQueueDeficits(
  assets: CatalogAsset[] = getCatalogAssets(),
  existing: DeficitLine[] = [],
): DeficitLine[] {
  const vendors = getWarehouseVendors()
  if (vendors.length === 0) return []
  const covered = new Set(existing.map((line) => line.itemName.toLowerCase()))

  return getLowStockAssets(assets).flatMap((asset) => {
    const name = asset.name.toLowerCase()
    if (covered.has(name)) return []
    covered.add(name)

    const threshold = asset.threshold ?? 0
    const currentStock = asset.currentStock ?? 0
    const quantityNeeded = Math.max(0, threshold - currentStock)
    if (quantityNeeded === 0) return []

    const ratio = threshold > 0 ? currentStock / threshold : 0
    const priority: DeficitPriority = ratio < 0.15 ? 'Critical' : ratio < 0.35 ? 'High' : ratio < 0.6 ? 'Medium' : 'Low'
    const primaryVendor = vendors.find((v) => v.id === asset.primaryVendorId) ?? vendors[0]
    const backupVendor = vendors.find((v) => v.id === asset.backupVendorId)

    return [
      {
        id: `def-auto-${asset.id}`,
        itemName: asset.name,
        category: asset.category,
        unit: asset.unit,
        triggerSource: 'Auto-Threshold' as TriggerSource,
        currentStock,
        threshold,
        costPerUnit: asset.costPerUnit,
        priority,
        status: 'Flagged' as DeficitStatus,
        primaryVendorId: primaryVendor.id,
        backupVendorId: backupVendor && backupVendor.id !== primaryVendor.id ? backupVendor.id : undefined,
        quantityNeeded,
      },
    ]
  })
}
