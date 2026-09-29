// Canonical data layer for the Asset Catalog module.
// Renders authoritative backend/database-backed asset records.
// Fallback state preserves only the 3 canonical DB assets with zero synthesized fixture state.
import { useEffect, useSyncExternalStore } from 'react'
import { createAssetApi, fetchAssetsApi, updateAssetApi } from './assetsApi'

import type { WarehouseZone } from '@/lib/warehouse-crew'

export type AssetCategory =
  | 'Event Assets'
  | 'Production Assets'
  | 'Stockroom Assets'
  | 'Rental Assets'
  | 'Administrative Assets'

export type AssetStatus =
  | 'Available'
  | 'Low Stock'
  | 'Critical Deficit'
  | 'Deployed'
  | 'Lost In Action'
  | 'In Maintenance'

export type BespokeStage = 'Unprepped' | 'Prepping' | 'Ready'

export interface AssetDimensions {
  height: string
  width: string
  depth: string
  weight: string
}

export type LedgerEntryType =
  | 'Registered'
  | 'Reserved'
  | 'Packed'
  | 'Dispatched'
  | 'Returned'
  | 'Damaged'
  | 'Repaired'
  | 'Reconciled'
  | 'Retired'

export type ReconciliationTag = 'Matched' | 'Short' | 'Pahabol'

export interface CatalogLedgerEntry {
  id: string
  timestamp: string
  type: LedgerEntryType
  note: string
  declaredBy: string
  linkedBatchRef?: string
  reconciliationTag?: ReconciliationTag
}

export type StockHealthState = 'Low Stock' | 'Healthy Stock' | 'Over Stock'

/**
 * Smart Duration Formatting Helper
 * - Under 1 hour (< 60 mins): "Xm" (e.g. "2m", "45m")
 * - 1 hour to under 1 day (60 to 1439 mins): "Xh Ym" (e.g. "1h 20m", "2h 15m")
 * - 1 day+ (>= 1440 mins): "Xd Yh" (e.g. "2d 3h")
 */
export function formatSmartDuration(minutes: number): string {
  if (isNaN(minutes) || minutes <= 0) return '0m'

  if (minutes < 60) {
    return `${Math.round(minutes)}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMins = Math.round(minutes % 60)

  if (hours < 24) {
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

export function computeStockHealth(
  currentStock = 0,
  criticalThreshold = 30,
  ceilingCap = 200,
): StockHealthState {
  if (currentStock < criticalThreshold) return 'Low Stock'
  if (currentStock > ceilingCap) return 'Over Stock'
  return 'Healthy Stock'
}

export interface BespokeSimulationAttempt {
  id: string
  attemptNumber: number
  durationMinutes: number
  rawInput: string
  loggedAt: string
  loggedBy?: string
}

export interface BespokeSubCategoryConfig {
  subCategory: string
  maxParallelWorkers: number
  description?: string
}

export interface CatalogAsset {
  id: string
  assetId: string
  name: string
  itemCallName?: string
  category: AssetCategory
  subCategory?: string
  description?: string
  status: AssetStatus
  image: string
  unit: string
  warehouseZone?: WarehouseZone

  // Shared Base Fields
  dimensions: AssetDimensions
  is_circular?: boolean
  shape?: string
  circumference?: string
  material?: string
  colorType?: 'mono' | 'multi' | 'changeable'
  colorPrimary?: string
  colorSecondary?: string[]
  colorNotes?: string
  tags?: string[]

  purchaseCost: number
  costPerUnit: number
  dateAdded: string
  primaryVendorId: string
  backupVendorId?: string

  // Event Asset Specific
  currentStock?: number
  threshold?: number
  lifeSpan?: string
  damageReplacementCost?: number

  // Bespoke Specific
  bespokeStage?: BespokeStage
  bespokeCrew?: string
  rawMaterials?: string[]
  manCount?: number
  finishTimeMinutes?: number
  revisionTimeMinutes?: number

  // Bespoke Simulation State
  simulationHeadcount?: number
  simulationAttempts?: BespokeSimulationAttempt[]
  baseSingleWorkerTimeMinutes?: number

  // Stockroom Specific
  criticalThreshold?: number
  ceilingCap?: number
  pricePerPack?: number

  // Rental Specific
  onLoanDueDate?: string
  rentalVendorName?: string
  supplierDetails?: string
  supplierContact?: string
  lengthOfRent?: string
  overduePenaltyFee?: number

  // Office Asset Specific
  custodian?: string
  vendorDetails?: string
  deviceModel?: string
  serialNumber?: string
  deviceSpecs?: string
}

/**
 * Authoritative 3 canonical database-backed asset rows.
 * Real inventory records from baseline database schema.
 */
export const CANONICAL_CATALOG_ASSETS: CatalogAsset[] = [
  {
    id: 'mat-inv-1',
    assetId: 'LM-MAT-001',
    name: 'Plywood sheet 4x8',
    itemCallName: 'Plywood Sheet',
    category: 'Stockroom Assets',
    subCategory: 'Raw Materials & Hardware',
    description: '3/4 inch exterior grade hardwood plywood sheet',
    status: 'Available',
    image: '',
    unit: 'sheets',
    dimensions: { height: '244 cm', width: '122 cm', depth: '1.9 cm', weight: '25.0 kg' },
    material: 'Hardwood Plywood',
    colorType: 'mono',
    colorPrimary: 'Natural Wood',
    tags: ['Raw Materials', 'Carpentry', 'Stockroom'],
    purchaseCost: 45000,
    costPerUnit: 1800,
    dateAdded: '2026-01-10',
    primaryVendorId: 'ven-01',
    currentStock: 25,
    threshold: 50,
    criticalThreshold: 20,
    ceilingCap: 50,
  },
  {
    id: 'mat-inv-2',
    assetId: 'LM-MAT-002',
    name: 'Steel frame tubing',
    itemCallName: 'Steel Tubing',
    category: 'Stockroom Assets',
    subCategory: 'Raw Materials & Hardware',
    description: 'Square hollow steel tubing 2x2 inch',
    status: 'Available',
    image: '',
    unit: 'meters',
    dimensions: { height: '600 cm', width: '5 cm', depth: '5 cm', weight: '12.0 kg' },
    material: 'Steel',
    colorType: 'mono',
    colorPrimary: 'Raw Steel',
    tags: ['Raw Materials', 'Metalwork', 'Stockroom'],
    purchaseCost: 36000,
    costPerUnit: 1200,
    dateAdded: '2026-01-10',
    primaryVendorId: 'ven-02',
    currentStock: 30,
    threshold: 60,
    criticalThreshold: 25,
    ceilingCap: 60,
  },
  {
    id: 'mat-inv-3',
    assetId: 'LM-MAT-003',
    name: 'Acrylic panel — clear',
    itemCallName: 'Acrylic Panel',
    category: 'Stockroom Assets',
    subCategory: 'Raw Materials & Hardware',
    description: '4mm clear cast acrylic panel 4x8',
    status: 'Available',
    image: '',
    unit: 'panels',
    dimensions: { height: '244 cm', width: '122 cm', depth: '0.4 cm', weight: '14.0 kg' },
    material: 'Cast Acrylic',
    colorType: 'mono',
    colorPrimary: 'Clear',
    tags: ['Raw Materials', 'Signage', 'Stockroom'],
    purchaseCost: 52500,
    costPerUnit: 3500,
    dateAdded: '2026-01-10',
    primaryVendorId: 'ven-03',
    currentStock: 15,
    threshold: 30,
    criticalThreshold: 10,
    ceilingCap: 30,
  },
]

let cachedCatalog: CatalogAsset[] | null = null

export function getCatalogAssets(): CatalogAsset[] {
  if (cachedCatalog) return cachedCatalog
  cachedCatalog = [...CANONICAL_CATALOG_ASSETS]
  return cachedCatalog
}

export function getCatalogAssetById(id: string): CatalogAsset | undefined {
  return getCatalogAssets().find((asset) => asset.id === id || asset.assetId === id)
}

// ---------- Live catalog store ----------
const listeners = new Set<() => void>()

function publishCatalog() {
  listeners.forEach((listener) => listener())
}

export function useCatalogAssets(): CatalogAsset[] {
  useEffect(() => {
    let active = true
    fetchAssetsApi().then((items) => {
      if (!active || !items.length) return
      const mapped: CatalogAsset[] = items.map((raw, idx) => ({
        id: raw.id || `cat-${idx}`,
        assetId: raw.assetId || `LM-AST-${1000 + idx}`,
        name: raw.name || 'Unnamed Asset',
        itemCallName: raw.itemCallName || raw.name || 'Asset',
        category: (raw.category as AssetCategory) || 'Stockroom Assets',
        subCategory: raw.subCategory || 'General',
        description: raw.description || '',
        status: (raw.status as AssetStatus) || 'Available',
        image: raw.image || '',
        unit: raw.unit || 'pcs',
        dimensions: raw.dimensions || { height: '—', width: '—', depth: '—', weight: '—' },
        material: raw.material || 'Standard',
        purchaseCost: raw.purchaseCost || 0,
        costPerUnit: raw.costPerUnit || 0,
        dateAdded: raw.dateAdded || new Date().toISOString().slice(0, 10),
        primaryVendorId: raw.primaryVendorId || '',
        currentStock: raw.currentStock,
        threshold: raw.threshold,
        criticalThreshold: raw.criticalThreshold,
        ceilingCap: raw.ceilingCap,
      }))
      cachedCatalog = mapped
      publishCatalog()
    })
    return () => {
      active = false
    }
  }, [])

  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => getCatalogAssets(),
    () => getCatalogAssets(),
  )
}

export function addCatalogAsset(asset: CatalogAsset): CatalogAsset {
  const existing = getCatalogAssets()
  cachedCatalog = [asset, ...existing]
  publishCatalog()
  void createAssetApi(asset)
  return asset
}

export function updateCatalogAsset(id: string, changes: Partial<Omit<CatalogAsset, 'id'>>) {
  const existing = getCatalogAssets()
  cachedCatalog = existing.map((asset) => (asset.id === id || asset.assetId === id ? { ...asset, ...changes } : asset))
  publishCatalog()
  void updateAssetApi(id, changes)
}

// Any Event Asset / Stockroom line sitting under its reorder threshold.
export function getLowStockAssets(assets: CatalogAsset[] = getCatalogAssets()): CatalogAsset[] {
  return assets.filter(
    (asset) =>
      (asset.category === 'Event Assets' || asset.category === 'Stockroom Assets') &&
      typeof asset.currentStock === 'number' &&
      typeof asset.threshold === 'number' &&
      asset.currentStock < asset.threshold,
  )
}

export function getAssetLedger(asset: CatalogAsset): CatalogLedgerEntry[] {
  void asset
  return []
}

export const DEFAULT_BESPOKE_SUBCATEGORY_CONFIGS: Record<string, BespokeSubCategoryConfig> = {
  'Fabrication / Backdrops': {
    subCategory: 'Fabrication / Backdrops',
    maxParallelWorkers: 3,
    description: 'Large planar frames & walls; diminishing returns beyond 3 carpenters.',
  },
  'Fabrication / Hanging Decor': {
    subCategory: 'Fabrication / Hanging Decor',
    maxParallelWorkers: 2,
    description: 'Delicate aerial rigging & floral installations; cramped physical workspace.',
  },
  'Fabrication / Stagecraft': {
    subCategory: 'Fabrication / Stagecraft',
    maxParallelWorkers: 4,
    description: 'Modular platform & risers; allows larger team parallel fabrication.',
  },
  'Fabrication / Signage': {
    subCategory: 'Fabrication / Signage',
    maxParallelWorkers: 2,
    description: 'Fine vinyl/acrylic lettering & signage stands; single station workflow.',
  },
  'Fabrication / Furniture': {
    subCategory: 'Fabrication / Furniture',
    maxParallelWorkers: 3,
    description: 'Custom tables & facades; bench carpentry.',
  },
}

let subCategoryConfigs: Record<string, BespokeSubCategoryConfig> = { ...DEFAULT_BESPOKE_SUBCATEGORY_CONFIGS }

export function getBespokeSubCategoryConfigs(): Record<string, BespokeSubCategoryConfig> {
  return subCategoryConfigs
}

export function updateBespokeSubCategoryConfig(subCategory: string, maxParallelWorkers: number) {
  const current = subCategoryConfigs[subCategory] || { subCategory, maxParallelWorkers: 3 }
  subCategoryConfigs = {
    ...subCategoryConfigs,
    [subCategory]: {
      ...current,
      maxParallelWorkers: Math.max(1, Math.min(10, maxParallelWorkers)),
    },
  }
}

export function updateAssetSimulation(
  assetId: string,
  attempts: BespokeSimulationAttempt[],
  headcount = 1,
): CatalogAsset | null {
  const assets = getCatalogAssets()
  const target = assets.find((a) => a.id === assetId || a.assetId === assetId)
  if (!target) return null

  const validAttempts = attempts.filter((a) => a.durationMinutes > 0)
  const meanTime =
    validAttempts.length > 0
      ? Math.round(validAttempts.reduce((sum, a) => sum + a.durationMinutes, 0) / validAttempts.length)
      : 0

  target.simulationHeadcount = headcount
  target.simulationAttempts = attempts
  target.baseSingleWorkerTimeMinutes = meanTime

  void updateAssetApi(target.id, {
    simulationHeadcount: headcount,
    simulationAttempts: attempts,
    baseSingleWorkerTimeMinutes: meanTime,
  })

  return target
}
