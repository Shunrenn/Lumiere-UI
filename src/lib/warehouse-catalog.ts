// Deterministic seed + derivation layer for the Asset Catalog module.
// Every asset carries a universal lifecycle `status` (used by the shared
// status filter pills) plus category-specific fields that drive the
// stock-display line on each card — the two are intentionally decoupled so
// "Deployed" reads sensibly whether the underlying item is a stockroom SKU
// or a one-off bespoke build.
import { useSyncExternalStore } from 'react'
import { getWarehouseVendors } from '@/lib/warehouse-vendors'

export type AssetCategory = 'Event Asset' | 'Bespoke' | 'Stockroom' | 'Rental' | 'Office Asset'

export type AssetStatus = 'Available' | 'Low Stock' | 'Critical Deficit' | 'Deployed' | 'Lost In Action'

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

export interface CatalogAsset {
  id: string
  assetId: string
  name: string
  category: AssetCategory
  status: AssetStatus
  image: string
  unit: string
  // Stockroom / Event Asset
  currentStock?: number
  threshold?: number
  // Bespoke
  bespokeStage?: BespokeStage
  bespokeCrew?: string
  // Rental
  onLoanDueDate?: string
  rentalVendorName?: string
  // Office Asset
  custodian?: string
  // Detailed tab
  dimensions: AssetDimensions
  purchaseCost: number
  costPerUnit: number
  dateAdded: string
  primaryVendorId: string
  backupVendorId?: string
}

function hashOf(value: string) {
  return Math.abs(value.split('').reduce((sum, char) => sum + char.charCodeAt(0) * 31, 7))
}

const DECOR_IMAGES = [
  '/images/decor/tiffany-chair.png',
  '/images/decor/crystal-chandelier.png',
  '/images/decor/dinner-table.png',
  '/images/decor/gold-charger.png',
  '/images/decor/silk-runner.png',
  '/images/decor/pillar-candles.png',
  '/images/decor/floral-arch.png',
  '/images/decor/glassware.png',
  '/images/decor/candelabra.png',
  '/images/decor/velvet-sofa.png',
  '/images/decor/string-lights.png',
  '/images/decor/silver-flatware.png',
  '/images/decor/uplighting.png',
  '/images/decor/silk-napkin.png',
  '/images/decor/minimalist-table.png',
]

interface SeedRow {
  name: string
  category: AssetCategory
  unit: string
}

const SEED_ROWS: SeedRow[] = [
  // Event Asset — reservable stock, deployed per event
  { name: 'Tiffany Ceremony Chair', category: 'Event Asset', unit: 'pcs' },
  { name: 'Gold Charger Plate Set', category: 'Event Asset', unit: 'sets' },
  { name: 'Silk Table Runner — Ivory', category: 'Event Asset', unit: 'pcs' },
  { name: 'Crystal Votive Candle Holder', category: 'Event Asset', unit: 'pcs' },
  { name: 'Uplighting Fixture — Warm Amber', category: 'Event Asset', unit: 'units' },
  { name: 'Floral Arch Frame — Round', category: 'Event Asset', unit: 'units' },
  // Bespoke — one-off custom builds, no fraction
  { name: 'Custom Monogram Backdrop', category: 'Bespoke', unit: 'build' },
  { name: 'Bespoke Ceiling Installation', category: 'Bespoke', unit: 'build' },
  { name: 'Client Crest Stage Panel', category: 'Bespoke', unit: 'build' },
  { name: 'Bespoke Welcome Signage', category: 'Bespoke', unit: 'build' },
  { name: 'Custom Dessert Table Facade', category: 'Bespoke', unit: 'build' },
  // Stockroom — general warehouse consumables / reusable stock
  { name: 'Silver Flatware Set', category: 'Stockroom', unit: 'sets' },
  { name: 'Glassware — Coupe Set', category: 'Stockroom', unit: 'sets' },
  { name: 'Pillar Candle — Unscented', category: 'Stockroom', unit: 'pcs' },
  { name: 'Silk Napkin — Champagne', category: 'Stockroom', unit: 'pcs' },
  { name: 'String Lights — Warm White 10m', category: 'Stockroom', unit: 'coils' },
  // Rental — sourced from an outside vendor, tracked on loan
  { name: 'Crystal Chandelier — Grand', category: 'Rental', unit: 'units' },
  { name: 'Velvet Lounge Sofa', category: 'Rental', unit: 'pcs' },
  { name: 'Vintage Candelabra Set', category: 'Rental', unit: 'sets' },
  { name: 'Dance Floor Panel — Glossy White', category: 'Rental', unit: 'panels' },
  // Office Asset — internal operational equipment
  { name: 'Warehouse Forklift Unit', category: 'Office Asset', unit: 'unit' },
  { name: 'Field Radio Set', category: 'Office Asset', unit: 'sets' },
  { name: 'Site Survey Tablet', category: 'Office Asset', unit: 'unit' },
  { name: 'Loading Bay Pallet Jack', category: 'Office Asset', unit: 'unit' },
]

const CUSTODIANS = ['Marco Villareal', 'Dennis Pineda', 'JoyABREGO', 'Trisha Domingo', 'Warehouse Pool']
const CREW_LEADS = ['Fab Team — Ronnie', 'Fab Team — Iris', 'Fab Team — Kean', 'Fab Team — Marge']
const DECLARANTS = ['Marco Villareal', 'Dennis Pineda', 'Joy Abrego', 'Trisha Domingo', 'Ronnie Cabrera', 'Iris Manalo']

function statusFor(category: AssetCategory, seed: number): AssetStatus {
  const roll = seed % 10
  if (category === 'Bespoke') {
    return roll < 6 ? 'Available' : roll < 9 ? 'Deployed' : 'Lost In Action'
  }
  if (category === 'Rental') {
    return roll < 5 ? 'Deployed' : roll < 9 ? 'Available' : 'Lost In Action'
  }
  if (category === 'Office Asset') {
    return roll < 7 ? 'Available' : roll < 9 ? 'Deployed' : 'Lost In Action'
  }
  // Event Asset / Stockroom — driven by stock ratio, computed by caller
  if (roll < 5) return 'Available'
  if (roll < 8) return 'Low Stock'
  return 'Critical Deficit'
}

function dimsFor(seed: number): AssetDimensions {
  const h = 20 + (seed % 160)
  const w = 15 + ((seed >> 2) % 140)
  const d = 10 + ((seed >> 4) % 90)
  const weight = 1 + ((seed >> 3) % 45)
  return { height: `${h} cm`, width: `${w} cm`, depth: `${d} cm`, weight: `${weight} kg` }
}

function dateFromSeed(seed: number, offsetDays = 0) {
  const base = new Date(2025, 0, 1)
  base.setDate(base.getDate() + (seed % 300) + offsetDays)
  return base.toISOString().slice(0, 10)
}

let cachedCatalog: CatalogAsset[] | null = null

export function getCatalogAssets(): CatalogAsset[] {
  if (cachedCatalog) return cachedCatalog
  const vendors = getWarehouseVendors()

  cachedCatalog = SEED_ROWS.map((row, index) => {
    const seed = hashOf(`${row.name}-${index}`)
    const image = DECOR_IMAGES[seed % DECOR_IMAGES.length]
    const primaryVendor = vendors[seed % vendors.length]
    const backupVendor = vendors[(seed + 3) % vendors.length]
    const assetId = `LM-${row.category.slice(0, 2).toUpperCase()}-${1000 + index}`

    const base: CatalogAsset = {
      id: `cat-${index}`,
      assetId,
      name: row.name,
      category: row.category,
      status: 'Available',
      image,
      unit: row.unit,
      dimensions: dimsFor(seed),
      purchaseCost: 4500 + ((seed * 37) % 60000),
      costPerUnit: 150 + ((seed * 11) % 3200),
      dateAdded: dateFromSeed(seed, -200),
      primaryVendorId: primaryVendor.id,
      backupVendorId: backupVendor.id !== primaryVendor.id ? backupVendor.id : undefined,
    }

    if (row.category === 'Event Asset' || row.category === 'Stockroom') {
      const threshold = 40 + (seed % 160)
      const ratioRoll = seed % 10
      const ratio = ratioRoll < 5 ? 0.6 + ((seed % 40) / 100) : ratioRoll < 8 ? 0.25 + ((seed % 20) / 100) : (seed % 12) / 100
      const currentStock = Math.max(0, Math.round(threshold * ratio))
      const status: AssetStatus = currentStock === 0 ? 'Critical Deficit' : currentStock / threshold < 0.2 ? 'Critical Deficit' : currentStock / threshold < 0.5 ? 'Low Stock' : 'Available'
      return { ...base, currentStock, threshold, status }
    }

    if (row.category === 'Bespoke') {
      const stages: BespokeStage[] = ['Unprepped', 'Prepping', 'Ready']
      const status = statusFor(row.category, seed)
      const bespokeStage: BespokeStage = status === 'Deployed' ? 'Ready' : stages[seed % stages.length]
      return { ...base, status, bespokeStage, bespokeCrew: CREW_LEADS[seed % CREW_LEADS.length] }
    }

    if (row.category === 'Rental') {
      const status = statusFor(row.category, seed)
      const dueDate = dateFromSeed(seed, 5 + (seed % 25))
      return { ...base, status, onLoanDueDate: status === 'Deployed' ? dueDate : undefined, rentalVendorName: primaryVendor.name }
    }

    // Office Asset
    const status = statusFor(row.category, seed)
    const assigned = seed % 3 !== 0
    return { ...base, status, custodian: assigned ? CUSTODIANS[seed % CUSTODIANS.length] : undefined }
  })

  return cachedCatalog
}

export function getCatalogAssetById(id: string): CatalogAsset | undefined {
  return getCatalogAssets().find((asset) => asset.id === id)
}

// ---------- Live catalog store ----------
// Assets registered through the Add Item flow live in the same store the
// seed occupies, so downstream consumers (Replenishment's automated
// threshold listener in particular) see them without a page reload.

const listeners = new Set<() => void>()

function publishCatalog() {
  listeners.forEach((listener) => listener())
}

export function useCatalogAssets(): CatalogAsset[] {
  getCatalogAssets()
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => cachedCatalog ?? [],
    () => cachedCatalog ?? [],
  )
}

export function addCatalogAsset(asset: CatalogAsset): CatalogAsset {
  const existing = getCatalogAssets()
  cachedCatalog = [asset, ...existing]
  publishCatalog()
  return asset
}

export function updateCatalogAsset(id: string, changes: Partial<Omit<CatalogAsset, 'id'>>) {
  const existing = getCatalogAssets()
  cachedCatalog = existing.map((asset) => (asset.id === id ? { ...asset, ...changes } : asset))
  publishCatalog()
}

// Any Event Asset / Stockroom line sitting under its reorder threshold.
export function getLowStockAssets(assets: CatalogAsset[] = getCatalogAssets()): CatalogAsset[] {
  return assets.filter(
    (asset) =>
      (asset.category === 'Event Asset' || asset.category === 'Stockroom') &&
      typeof asset.currentStock === 'number' &&
      typeof asset.threshold === 'number' &&
      asset.currentStock < asset.threshold,
  )
}

const LEDGER_SEQUENCE: LedgerEntryType[] = [
  'Registered',
  'Reserved',
  'Packed',
  'Dispatched',
  'Returned',
  'Reconciled',
]

export function getAssetLedger(asset: CatalogAsset): CatalogLedgerEntry[] {
  const seed = hashOf(asset.id)
  const entryCount = 3 + (seed % 4)
  const entries: CatalogLedgerEntry[] = []
  for (let i = 0; i < entryCount; i += 1) {
    const type = LEDGER_SEQUENCE[(seed + i) % LEDGER_SEQUENCE.length]
    const declaredBy = DECLARANTS[(seed + i * 7) % DECLARANTS.length]
    const variant = (seed + i * 5) % 6
    const reconciliationTag: ReconciliationTag | undefined =
      type === 'Reconciled' ? (variant === 0 ? 'Short' : variant === 1 ? 'Pahabol' : 'Matched') : undefined
    entries.push({
      id: `${asset.id}-ledger-${i}`,
      timestamp: dateFromSeed(seed, i * 11),
      type,
      declaredBy,
      linkedBatchRef: type === 'Dispatched' || type === 'Returned' ? `BATCH-${100 + ((seed + i) % 900)}` : undefined,
      reconciliationTag,
      note: noteFor(type, asset),
    })
  }
  // Reverse-chronological — newest first, treating index order as time order.
  return entries.reverse()
}

function noteFor(type: LedgerEntryType, asset: CatalogAsset): string {
  switch (type) {
    case 'Registered':
      return `Added to the ${asset.category} registry.`
    case 'Reserved':
      return 'Reserved against an upcoming event allocation.'
    case 'Packed':
      return 'Packed into an outbound dispatch batch.'
    case 'Dispatched':
      return 'Left the warehouse on an outbound batch.'
    case 'Returned':
      return 'Returned from site and logged back into stock.'
    case 'Damaged':
      return 'Flagged with visible damage during intake inspection.'
    case 'Repaired':
      return 'Repaired and cleared for redeployment.'
    case 'Reconciled':
      return 'Counted against the dispatch manifest during reconciliation.'
    case 'Retired':
      return 'Retired from active circulation.'
    default:
      return ''
  }
}
