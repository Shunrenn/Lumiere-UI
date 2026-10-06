// Canonical derivation layer for Replenishment & Deficits.
// Connects real catalog low-stock alerts, event-bound shortages, and live requisitions.
import type { PortalEvent, DeficitStatus } from '@/lib/types'
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

export const CANONICAL_DEFICITS: DeficitLine[] = [
  {
    id: 'def-001',
    eventId: 'evt-01',
    eventTitle: 'Solstice Motors Electric SUV Reveal',
    itemName: 'CO2 Cryo Jet FX Unit',
    category: 'Special Effects',
    unit: 'units',
    triggerSource: 'Auto-Threshold',
    currentStock: 2,
    threshold: 4,
    costPerUnit: 48750,
    priority: 'High',
    status: 'Not Purchased',
    primaryVendorId: 'ven-03',
    quantityNeeded: 2,
  },
  {
    id: 'def-002',
    eventId: 'evt-02',
    eventTitle: 'Aura Luxe Autumn Gala 2026',
    itemName: 'Warm White Fairy Light Strand',
    category: 'Stockroom Assets',
    unit: 'strands',
    triggerSource: 'Canvas',
    currentStock: 14,
    threshold: 30,
    costPerUnit: 600,
    priority: 'Critical',
    status: 'In Procurement',
    primaryVendorId: 'ven-03',
    quantityNeeded: 16,
  },
  {
    id: 'def-003',
    eventId: 'evt-03',
    eventTitle: 'Apex Global Financial Leaders Summit',
    itemName: 'Safety Cable 3mm x 60cm Galvanized Steel',
    category: 'Stockroom Assets',
    unit: 'units',
    triggerSource: 'Batch Pahabol',
    currentStock: 6,
    threshold: 20,
    costPerUnit: 1200,
    priority: 'Medium',
    status: 'Not Purchased',
    primaryVendorId: 'ven-04',
    quantityNeeded: 14,
  },
  {
    id: 'def-004',
    eventId: 'evt-04',
    eventTitle: 'Vanguard Tech Keynote & Product Launch',
    itemName: 'Gaffer Tape Pro 50mm x 50m Black',
    category: 'Stockroom Assets',
    unit: 'rolls',
    triggerSource: 'Manual Audit',
    currentStock: 8,
    threshold: 24,
    costPerUnit: 850,
    priority: 'Medium',
    status: 'Not Purchased',
    primaryVendorId: 'ven-04',
    quantityNeeded: 16,
  },
  {
    id: 'def-005',
    itemName: 'Zip Ties Heavy Duty 300mm Pack of 100',
    category: 'Stockroom Assets',
    unit: 'packs',
    triggerSource: 'Auto-Threshold',
    currentStock: 5,
    threshold: 15,
    costPerUnit: 450,
    priority: 'Low',
    status: 'Not Purchased',
    primaryVendorId: 'ven-04',
    quantityNeeded: 10,
  },
]

const DEFICITS_STORAGE_KEY = 'lumiere_warehouse_deficits'

export function getStoredDeficits(): DeficitLine[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(DEFICITS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (e) {
      console.warn('Failed to load deficits from localStorage', e)
    }
  }
  return [...CANONICAL_DEFICITS]
}

export function saveStoredDeficits(lines: DeficitLine[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DEFICITS_STORAGE_KEY, JSON.stringify(lines))
    } catch (e) {
      console.warn('Failed to save deficits to localStorage', e)
    }
  }
}

export function getDeficitLines(events: PortalEvent[] = []): DeficitLine[] {
  void events
  return getStoredDeficits()
}

export function lineCost(line: DeficitLine): number {
  return (line.quantityNeeded || 0) * (line.costPerUnit || 0)
}

export function checkAndQueueDeficits(
  assets: CatalogAsset[] = getCatalogAssets(),
  existing: DeficitLine[] = [],
): DeficitLine[] {
  const result = [...existing]
  const existingItemNames = new Set(existing.map((e) => e.itemName.toLowerCase()))

  assets.forEach((asset) => {
    if (
      (asset.status === 'Low Stock' || asset.status === 'Critical Deficit') &&
      !existingItemNames.has(asset.name.toLowerCase())
    ) {
      const needed = Math.max(1, (asset.threshold ?? 5) - (asset.currentStock ?? 0))
      result.push({
        id: `def-auto-${asset.id}`,
        itemName: asset.name,
        category: asset.category,
        unit: asset.unit,
        triggerSource: 'Auto-Threshold',
        currentStock: asset.currentStock ?? 0,
        threshold: asset.threshold ?? 5,
        costPerUnit: asset.costPerUnit || asset.purchaseCost || 500,
        priority: asset.status === 'Critical Deficit' ? 'Critical' : 'High',
        status: 'Not Purchased',
        primaryVendorId: asset.primaryVendorId || '',
        quantityNeeded: needed,
      })
    }
  })

  return result
}
