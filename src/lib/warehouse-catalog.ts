// Deterministic seed + derivation layer for the Asset Catalog module.
// Every asset carries a universal lifecycle `status` (used by the shared
// status filter pills) plus category-specific fields that drive the
// stock-display line on each card — the two are intentionally decoupled so
// "Deployed" reads sensibly whether the underlying item is a stockroom SKU
// or a one-off bespoke build.
import { useSyncExternalStore } from 'react'
import { getWarehouseVendors } from '@/lib/warehouse-vendors'

import type { WarehouseZone } from '@/lib/warehouse-crew'

export type AssetCategory = 'Event Asset' | 'Bespoke' | 'Stockroom' | 'Rental' | 'Office Asset'

export type AssetStatus = 'Available' | 'Low Stock' | 'Critical Deficit' | 'Deployed' | 'Lost In Action' | 'In Maintenance'

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

  // Bespoke Simulation State (Asset Registry Part A)
  simulationHeadcount?: number // Default baseline: 1 worker
  simulationAttempts?: BespokeSimulationAttempt[]
  baseSingleWorkerTimeMinutes?: number // Auto-computed arithmetic mean of attempts

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
  itemCallName: string
  category: AssetCategory
  subCategory: string
  unit: string
  material: string
  colorType: 'mono' | 'multi' | 'changeable'
  colorPrimary: string
  colorSecondary?: string[]
  tags: string[]
  is_circular?: boolean
  shape?: string
  circumference?: string
}

const SEED_ROWS: SeedRow[] = [
  // Event Asset — reservable stock, deployed per event
  {
    name: 'Tiffany Ceremony Chair',
    itemCallName: 'Tiffany Chair',
    category: 'Event Asset',
    subCategory: 'Furniture / Seating',
    unit: 'pcs',
    material: 'Resin & Hardwood',
    colorType: 'mono',
    colorPrimary: 'Metallic Gold',
    tags: ['Ceremony', 'Seating', 'Gala'],
  },
  {
    name: 'Gold Charger Plate Set',
    itemCallName: 'Gold Charger',
    category: 'Event Asset',
    subCategory: 'Tableware / Chargers',
    unit: 'sets',
    material: 'Lacquered Glass',
    colorType: 'mono',
    colorPrimary: 'Polished Gold',
    tags: ['Dining', 'Tableware'],
    is_circular: true,
    shape: 'Circular',
    circumference: '103 cm',
  },
  {
    name: 'Silk Table Runner — Ivory',
    itemCallName: 'Ivory Runner',
    category: 'Event Asset',
    subCategory: 'Linens / Textiles',
    unit: 'pcs',
    material: '100% Mulberry Silk',
    colorType: 'mono',
    colorPrimary: 'Ivory Cream',
    tags: ['Tablescape', 'Linens'],
  },
  {
    name: 'Crystal Votive Candle Holder',
    itemCallName: 'Crystal Votive',
    category: 'Event Asset',
    subCategory: 'Lighting / Accents',
    unit: 'pcs',
    material: 'Leaded Crystal Glass',
    colorType: 'mono',
    colorPrimary: 'Clear Crystal',
    tags: ['Centerpiece', 'Candlelit'],
    is_circular: true,
    shape: 'Cylindrical',
    circumference: '25 cm',
  },
  {
    name: 'Uplighting Fixture — Warm Amber',
    itemCallName: 'Amber Uplight',
    category: 'Event Asset',
    subCategory: 'AV & Lighting',
    unit: 'units',
    material: 'Aluminum Casing',
    colorType: 'changeable',
    colorPrimary: 'Warm Amber',
    colorSecondary: ['RGBW Spectrum'],
    tags: ['Stage', 'Ambience'],
  },
  {
    name: 'Floral Arch Frame — Round',
    itemCallName: 'Round Arch',
    category: 'Event Asset',
    subCategory: 'Structures / Arches',
    unit: 'units',
    material: 'Wrought Iron',
    colorType: 'mono',
    colorPrimary: 'Matte Brass',
    tags: ['Photo Op', 'Stage Arch'],
    is_circular: true,
    shape: 'Circular Arch',
    circumference: '754 cm',
  },

  // Bespoke — custom fabrication builds
  {
    name: 'Custom Monogram Backdrop',
    itemCallName: 'Monogram Wall',
    category: 'Bespoke',
    subCategory: 'Fabrication / Backdrops',
    unit: 'build',
    material: 'Plywood & Acrylic',
    colorType: 'multi',
    colorPrimary: 'Gilded Gold',
    colorSecondary: ['Matte White', 'Navy Accent'],
    tags: ['Stage', 'Custom Build'],
  },
  {
    name: 'Bespoke Ceiling Canopy Installation',
    itemCallName: 'Ceiling Canopy',
    category: 'Bespoke',
    subCategory: 'Fabrication / Hanging Decor',
    unit: 'build',
    material: 'Organza & Micro-LEDs',
    colorType: 'changeable',
    colorPrimary: 'Champagne Gold',
    tags: ['Hanging', 'Illuminated'],
  },
  {
    name: 'Client Crest Stage Panel',
    itemCallName: 'Crest Panel',
    category: 'Bespoke',
    subCategory: 'Fabrication / Stagecraft',
    unit: 'build',
    material: 'CNC Engraved MDF',
    colorType: 'mono',
    colorPrimary: 'Polished Brass',
    tags: ['Stagecraft', 'VIP Branding'],
  },
  {
    name: 'Bespoke Welcome Signage Stand',
    itemCallName: 'Welcome Stand',
    category: 'Bespoke',
    subCategory: 'Fabrication / Signage',
    unit: 'build',
    material: 'Frosted Acrylic & Steel',
    colorType: 'mono',
    colorPrimary: 'Rose Gold',
    tags: ['Entrance', 'Signage'],
  },
  {
    name: 'Custom Dessert Table Facade',
    itemCallName: 'Dessert Facade',
    category: 'Bespoke',
    subCategory: 'Fabrication / Furniture',
    unit: 'build',
    material: 'Fluted Molding & Marble Top',
    colorType: 'multi',
    colorPrimary: 'Parchment White',
    colorSecondary: ['Gold Fluting'],
    tags: ['Station', 'Custom Facade'],
  },

  // Stockroom — general consumable / reusable stock
  {
    name: 'Silver Flatware Set',
    itemCallName: 'Silver Flatware',
    category: 'Stockroom',
    subCategory: 'Consumables / Cutlery',
    unit: 'sets',
    material: 'Sterling Silver Plate',
    colorType: 'mono',
    colorPrimary: 'Polished Silver',
    tags: ['Dining', 'Cutlery'],
  },
  {
    name: 'Glassware — Coupe Set',
    itemCallName: 'Coupe Glassware',
    category: 'Stockroom',
    subCategory: 'Consumables / Glassware',
    unit: 'sets',
    material: 'Hand-blown Crystal',
    colorType: 'mono',
    colorPrimary: 'Crystal Clear',
    tags: ['Barware', 'Toast'],
    is_circular: true,
    shape: 'Circular Rim',
    circumference: '28 cm',
  },
  {
    name: 'Pillar Candle — Unscented',
    itemCallName: 'Pillar Candle',
    category: 'Stockroom',
    subCategory: 'Consumables / Candles',
    unit: 'pcs',
    material: 'Paraffin & Soy Wax',
    colorType: 'mono',
    colorPrimary: 'Pure Ivory',
    tags: ['Ambience', 'Consumable'],
    is_circular: true,
    shape: 'Cylindrical',
    circumference: '22 cm',
  },
  {
    name: 'Silk Napkin — Champagne',
    itemCallName: 'Silk Napkin',
    category: 'Stockroom',
    subCategory: 'Consumables / Napkins',
    unit: 'pcs',
    material: 'Satin Silk',
    colorType: 'mono',
    colorPrimary: 'Champagne Satin',
    tags: ['Dining', 'Textile'],
  },
  {
    name: 'String Lights — Warm White 10m',
    itemCallName: 'String Lights',
    category: 'Stockroom',
    subCategory: 'Consumables / Wiring',
    unit: 'coils',
    material: 'Copper & PVC Wiring',
    colorType: 'changeable',
    colorPrimary: 'Warm Yellow',
    tags: ['Lighting', 'Wiring'],
  },

  // Rental — sourced from external vendor
  {
    name: 'Crystal Chandelier — Grand',
    itemCallName: 'Grand Chandelier',
    category: 'Rental',
    subCategory: 'External Rental / Lighting',
    unit: 'units',
    material: 'K9 Austrian Crystal',
    colorType: 'mono',
    colorPrimary: 'Sparkling Clear',
    tags: ['Rental', 'Overhead'],
    is_circular: true,
    shape: 'Tiered Circular',
    circumference: '376 cm',
  },
  {
    name: 'Velvet Lounge Sofa',
    itemCallName: 'Velvet Sofa',
    category: 'Rental',
    subCategory: 'External Rental / Seating',
    unit: 'pcs',
    material: 'Plush Emerald Velvet',
    colorType: 'mono',
    colorPrimary: 'Deep Emerald',
    tags: ['Rental', 'Lounge'],
  },
  {
    name: 'Vintage Candelabra Set',
    itemCallName: 'Vintage Candelabra',
    category: 'Rental',
    subCategory: 'External Rental / Tabletop',
    unit: 'sets',
    material: 'Antiqued Bronze',
    colorType: 'mono',
    colorPrimary: 'Antique Bronze',
    tags: ['Rental', 'Table Decor'],
  },
  {
    name: 'Dance Floor Panel — Glossy White',
    itemCallName: 'Dance Panel',
    category: 'Rental',
    subCategory: 'External Rental / Staging',
    unit: 'panels',
    material: 'High-Gloss Vinyl',
    colorType: 'mono',
    colorPrimary: 'Gloss White',
    tags: ['Rental', 'Dance Floor'],
  },

  // Office Asset — operational equipment
  {
    name: 'Warehouse Forklift Unit',
    itemCallName: 'Forklift #1',
    category: 'Office Asset',
    subCategory: 'Equipment / Logistics',
    unit: 'unit',
    material: 'Heavy Industrial Steel',
    colorType: 'mono',
    colorPrimary: 'Safety Yellow',
    tags: ['Office Asset', 'Heavy Machinery'],
  },
  {
    name: 'Field Radio Set',
    itemCallName: 'Walkie-Talkie Set',
    category: 'Office Asset',
    subCategory: 'Equipment / Comms',
    unit: 'sets',
    material: 'Polycarbonate Shell',
    colorType: 'mono',
    colorPrimary: 'Matte Black',
    tags: ['Office Asset', 'Communications'],
  },
  {
    name: 'Site Survey Tablet',
    itemCallName: 'Survey iPad Pro',
    category: 'Office Asset',
    subCategory: 'Equipment / Electronics',
    unit: 'unit',
    material: 'Anodized Aluminum',
    colorType: 'mono',
    colorPrimary: 'Space Gray',
    tags: ['Office Asset', 'Surveying'],
  },
  {
    name: 'Loading Bay Pallet Jack',
    itemCallName: 'Pallet Jack #2',
    category: 'Office Asset',
    subCategory: 'Equipment / Hydraulics',
    unit: 'unit',
    material: 'Reinforced Alloy Steel',
    colorType: 'mono',
    colorPrimary: 'Industrial Red',
    tags: ['Office Asset', 'Hydraulics'],
  },
]

const CUSTODIANS = ['Marco Villareal', 'Dennis Pineda', 'Joy ABREGO', 'Trisha Domingo', 'Warehouse Pool']
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
      itemCallName: row.itemCallName,
      category: row.category,
      subCategory: row.subCategory,
      description: `Premium ${row.material.toLowerCase()} piece curated for high-profile luxury event staging.`,
      status: 'Available',
      image,
      unit: row.unit,
      dimensions: dimsFor(seed),
      is_circular: row.is_circular,
      shape: row.shape,
      circumference: row.circumference,
      material: row.material,
      colorType: row.colorType,
      colorPrimary: row.colorPrimary,
      colorSecondary: row.colorSecondary,
      tags: row.tags,
      purchaseCost: 4500 + ((seed * 37) % 60000),
      costPerUnit: 150 + ((seed * 11) % 3200),
      dateAdded: dateFromSeed(seed, -200),
      primaryVendorId: primaryVendor.id,
      backupVendorId: backupVendor.id !== primaryVendor.id ? backupVendor.id : undefined,
    }

    if (row.category === 'Event Asset') {
      const threshold = 40 + (seed % 160)
      const ratioRoll = seed % 10
      const ratio = ratioRoll < 5 ? 0.6 + ((seed % 40) / 100) : ratioRoll < 8 ? 0.25 + ((seed % 20) / 100) : (seed % 12) / 100
      const currentStock = Math.max(0, Math.round(threshold * ratio))
      const status: AssetStatus = currentStock === 0 ? 'Critical Deficit' : currentStock / threshold < 0.2 ? 'Critical Deficit' : currentStock / threshold < 0.5 ? 'Low Stock' : 'Available'
      return {
        ...base,
        currentStock,
        threshold,
        status,
        lifeSpan: `${3 + (seed % 4)} Years`,
        damageReplacementCost: Math.round(base.costPerUnit * 1.4),
      }
    }

    if (row.category === 'Stockroom') {
      const criticalThreshold = 30 + (seed % 50)
      const ceilingCap = 180 + (seed % 120)
      const roll = seed % 10
      const currentStock = roll < 3 ? criticalThreshold - 12 : roll < 7 ? criticalThreshold + 40 : ceilingCap + 35
      const status: AssetStatus = currentStock < criticalThreshold ? 'Low Stock' : 'Available'
      return {
        ...base,
        currentStock,
        criticalThreshold,
        ceilingCap,
        threshold: criticalThreshold,
        status,
        pricePerPack: Math.round(base.costPerUnit * 12),
        lifeSpan: '24 Months',
      }
    }

    if (row.category === 'Bespoke') {
      const stages: BespokeStage[] = ['Unprepped', 'Prepping', 'Ready']
      const status = statusFor(row.category, seed)
      const bespokeStage: BespokeStage = status === 'Deployed' ? 'Ready' : stages[seed % stages.length]
      const finishTimeMinutes = 45 + ((seed * 17) % 3600) // Ranges from 45 mins to ~60 hours
      const revisionTimeMinutes = 15 + ((seed * 7) % 180)

      // Seed initial 5 simulation attempts with baseline headcount = 1
      const baseSeedMinutes = [42, 50, 45, 55, 48].map((m) => Math.round(m * (1 + (seed % 5) * 0.08)))
      const simulationAttempts: BespokeSimulationAttempt[] = baseSeedMinutes.map((dur, i) => ({
        id: `att-${seed}-${i + 1}`,
        attemptNumber: i + 1,
        durationMinutes: dur,
        rawInput: `${dur} min`,
        loggedAt: dateFromSeed(seed, -(20 - i * 3)),
        loggedBy: CREW_LEADS[(seed + i) % CREW_LEADS.length],
      }))
      const meanTime = Math.round(
        simulationAttempts.reduce((acc, curr) => acc + curr.durationMinutes, 0) / simulationAttempts.length,
      )

      return {
        ...base,
        status,
        bespokeStage,
        bespokeCrew: CREW_LEADS[seed % CREW_LEADS.length],
        rawMaterials: ['Plywood 3/4"', 'Acrylic Panel', 'Gold Leaf Coating', 'Steel Bracing'],
        manCount: 2 + (seed % 5),
        finishTimeMinutes,
        revisionTimeMinutes,
        simulationHeadcount: 1,
        simulationAttempts,
        baseSingleWorkerTimeMinutes: meanTime,
      }
    }

    if (row.category === 'Rental') {
      const status = statusFor(row.category, seed)
      const dueDate = dateFromSeed(seed, 5 + (seed % 25))
      return {
        ...base,
        status,
        onLoanDueDate: status === 'Deployed' ? dueDate : undefined,
        rentalVendorName: primaryVendor.name,
        supplierDetails: `${primaryVendor.name} (Acct Ref: SUP-${1000 + (seed % 800)})`,
        supplierContact: primaryVendor.contactName || primaryVendor.phone || 'Vendor Rep',
        lengthOfRent: `${7 + (seed % 14)} Days`,
        overduePenaltyFee: 1500 + ((seed * 23) % 4000),
      }
    }

    // Office Asset
    const status = statusFor(row.category, seed)
    const assigned = seed % 3 !== 0
    return {
      ...base,
      status,
      custodian: assigned ? CUSTODIANS[seed % CUSTODIANS.length] : undefined,
      vendorDetails: `${primaryVendor.name} — Direct Purchase`,
      lifeSpan: '5 Years Warranty',
    }
  })

  return cachedCatalog
}

export function getCatalogAssetById(id: string): CatalogAsset | undefined {
  return getCatalogAssets().find((asset) => asset.id === id)
}

// ---------- Live catalog store ----------
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

  return target
}
