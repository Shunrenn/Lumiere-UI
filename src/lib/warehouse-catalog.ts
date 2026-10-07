// Canonical data layer for the Asset Catalog module.
// Renders authoritative backend/database-backed asset records.
// Fallback state preserves the existing canonical catalog.
import { useEffect, useSyncExternalStore } from 'react'
import { createAssetApi, fetchAssetsApi, updateAssetApi } from '@/features/inventory/api/assetsApi'

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

export const CANONICAL_CATALOG_ASSETS: CatalogAsset[] = [
  // EVENT ASSETS
  {
    id: '22222222-2222-2222-2222-222222222224', assetId: 'LM-EV-001',
    name: 'Custom Modular Velvet Stage Platform 4x8', itemCallName: 'Velvet Stage Platform',
    category: 'Event Assets', subCategory: 'Staging',
    description: 'Modular 4x8 ft carpeted stage platform with adjustable leg risers.',
    status: 'Available', image: '/assets/inventory/velvet-chair.png', unit: 'panels',
    dimensions: { height: '30 cm', width: '244 cm', depth: '122 cm', weight: '28 kg' },
    material: 'Plywood + Velvet Upholstery', colorType: 'mono', colorPrimary: 'Midnight Black',
    tags: ['Staging', 'Event', 'Modular'],
    purchaseCost: 85000, costPerUnit: 4250, dateAdded: '2026-02-14', primaryVendorId: 'ven-01',
    currentStock: 20, threshold: 8, lifeSpan: '36 months', damageReplacementCost: 5000,
    bespokeStage: 'Ready', bespokeCrew: 'Fab Team',
  },
  {
    id: '22222222-2222-2222-2222-222222222223', assetId: 'LM-EV-002',
    name: 'L-Acoustics K2 Line Array Speaker Module', itemCallName: 'K2 Line Array',
    category: 'Event Assets', subCategory: 'Audio Equipment',
    description: 'Professional line array speaker element, 12-inch woofer + HF compression driver.',
    status: 'Available', image: '/images/decor/uplighting.png', unit: 'units',
    dimensions: { height: '57 cm', width: '56 cm', depth: '40 cm', weight: '42 kg' },
    material: 'Composite Enclosure', colorType: 'mono', colorPrimary: 'Matte Black',
    tags: ['Audio', 'Line Array', 'FOH'],
    purchaseCost: 980000, costPerUnit: 98000, dateAdded: '2026-01-20', primaryVendorId: 'ven-02',
    currentStock: 16, threshold: 8, lifeSpan: '60 months', damageReplacementCost: 120000,
  },
  {
    id: '22222222-2222-2222-2222-222222222222', assetId: 'LM-EV-003',
    name: 'Arri SkyPanel S60-C LED Softlight', itemCallName: 'SkyPanel S60-C',
    category: 'Event Assets', subCategory: 'Lighting',
    description: 'Full-colour RGBA-W LED softlight panel with integrated yoke. Ideal for stage wash.',
    status: 'Available', image: '/images/decor/uplighting.png', unit: 'units',
    dimensions: { height: '33 cm', width: '66 cm', depth: '17 cm', weight: '9.5 kg' },
    material: 'Aluminium Housing', colorType: 'changeable', colorPrimary: 'RGBA-W Full Spectrum',
    tags: ['Lighting', 'LED', 'Softlight'],
    purchaseCost: 420000, costPerUnit: 42000, dateAdded: '2026-02-01', primaryVendorId: 'ven-03',
    currentStock: 12, threshold: 4, lifeSpan: '48 months', damageReplacementCost: 55000,
  },
  {
    id: 'evt-ast-004', assetId: 'LM-EV-004',
    name: 'Chauvet Rogue R2X Beam Moving Head', itemCallName: 'Rogue R2X Beam',
    category: 'Event Assets', subCategory: 'Lighting',
    description: '440 W discharge beam moving head. 14 dichroic colours, 17 rotating gobos, CMY mixing.',
    status: 'Available', image: '/images/decor/string-lights.png', unit: 'units',
    dimensions: { height: '68 cm', width: '41 cm', depth: '34 cm', weight: '27 kg' },
    material: 'Steel & Polycarbonate', colorType: 'changeable', colorPrimary: 'CMY Beam',
    tags: ['Lighting', 'Moving Head', 'Beam'],
    purchaseCost: 310000, costPerUnit: 31000, dateAdded: '2026-03-05', primaryVendorId: 'ven-03',
    currentStock: 8, threshold: 4, lifeSpan: '36 months', damageReplacementCost: 40000,
  },
  {
    id: 'evt-ast-005', assetId: 'LM-EV-005',
    name: 'CO2 Cryo Jet FX Unit', itemCallName: 'Cryo Jet',
    category: 'Event Assets', subCategory: 'Special Effects',
    description: 'Dual-nozzle CO2 cryo-jet for burst and sustained fog effects. DMX 512 controllable.',
    status: 'Low Stock', image: '/images/elements/led-strip-roll.png', unit: 'units',
    dimensions: { height: '120 cm', width: '30 cm', depth: '30 cm', weight: '18 kg' },
    material: 'Anodised Aluminium', colorType: 'mono', colorPrimary: 'Brushed Silver',
    tags: ['SFX', 'Cryo', 'CO2', 'DMX'],
    purchaseCost: 195000, costPerUnit: 48750, dateAdded: '2026-04-10', primaryVendorId: 'ven-04',
    currentStock: 2, threshold: 4, lifeSpan: '24 months', damageReplacementCost: 60000,
  },
  // PRODUCTION ASSETS
  {
    id: 'prod-ast-001', assetId: 'LM-PR-001',
    name: 'Flower Wall - Blush Peony and Rose Arrangement', itemCallName: 'Blush Flower Wall',
    category: 'Production Assets', subCategory: 'Fabrication / Backdrops',
    description: 'Hand-assembled 8x8 ft floral backdrop using premium silk peony and rose heads on a steel grid frame.',
    status: 'Available', image: '/assets/inventory/floral-arch.png', unit: 'panels',
    dimensions: { height: '244 cm', width: '244 cm', depth: '12 cm', weight: '35 kg' },
    material: 'Silk Florals on Steel Grid', colorType: 'multi', colorPrimary: 'Blush Pink',
    colorSecondary: ['Ivory', 'Champagne'],
    tags: ['Backdrop', 'Floral', 'Bespoke'],
    purchaseCost: 65000, costPerUnit: 65000, dateAdded: '2026-03-01', primaryVendorId: 'ven-01',
    bespokeStage: 'Ready', bespokeCrew: 'Fab Team', manCount: 3, finishTimeMinutes: 240, revisionTimeMinutes: 60,
  },
  {
    id: 'prod-ast-002', assetId: 'LM-PR-002',
    name: 'Gold Geometric Arch - Double Hexagon', itemCallName: 'Gold Hex Arch',
    category: 'Production Assets', subCategory: 'Fabrication / Backdrops',
    description: 'Powder-coated gold steel double-hexagon arch, 7 ft tall x 5 ft wide. Bolt-together assembly.',
    status: 'Available', image: '/images/decor/string-lights.png', unit: 'sets',
    dimensions: { height: '213 cm', width: '152 cm', depth: '5 cm', weight: '22 kg' },
    material: 'Powder-Coated Steel', colorType: 'mono', colorPrimary: 'Champagne Gold',
    tags: ['Arch', 'Metal', 'Geometric', 'Backdrop'],
    purchaseCost: 48000, costPerUnit: 48000, dateAdded: '2026-02-20', primaryVendorId: 'ven-01',
    bespokeStage: 'Ready', bespokeCrew: 'Fab Team', manCount: 2, finishTimeMinutes: 90, revisionTimeMinutes: 30,
  },
  {
    id: 'prod-ast-003', assetId: 'LM-PR-003',
    name: 'Crystal Birdcage Chandelier 36in', itemCallName: 'Crystal Birdcage Chandelier',
    category: 'Production Assets', subCategory: 'Fabrication / Hanging Decor',
    description: 'Hand-strung crystal bead birdcage chandelier with warm LED filament globe. Rigging ready.',
    status: 'Available', image: '/assets/inventory/banquet-table.png', unit: 'units',
    dimensions: { height: '91 cm', width: '91 cm', depth: '91 cm', weight: '14 kg' },
    is_circular: true, circumference: '286 cm',
    material: 'Crystal Beads and Steel Frame', colorType: 'mono', colorPrimary: 'Clear Crystal',
    tags: ['Chandelier', 'Crystal', 'Hanging', 'Decor'],
    purchaseCost: 38500, costPerUnit: 38500, dateAdded: '2026-01-28', primaryVendorId: 'ven-01',
    bespokeStage: 'Ready', bespokeCrew: 'Fab Team', manCount: 2, finishTimeMinutes: 180, revisionTimeMinutes: 45,
  },
  {
    id: 'prod-ast-004', assetId: 'LM-PR-004',
    name: 'Custom LED Neon Calligraphy Sign', itemCallName: 'Custom Neon Sign',
    category: 'Production Assets', subCategory: 'Fabrication / Signage',
    description: 'LED neon flex custom calligraphy sign on acrylic backing. Up to 60 cm wide. Warm white or gold.',
    status: 'Available', image: '/images/items/brass-plinths.png', unit: 'units',
    dimensions: { height: '40 cm', width: '60 cm', depth: '3 cm', weight: '1.8 kg' },
    material: 'LED Neon Flex + Acrylic', colorType: 'changeable', colorPrimary: 'Warm White',
    colorSecondary: ['Gold', 'Rose Gold'],
    tags: ['Signage', 'Neon', 'Custom', 'LED'],
    purchaseCost: 12000, costPerUnit: 12000, dateAdded: '2026-04-05', primaryVendorId: 'ven-01',
    bespokeStage: 'Prepping', bespokeCrew: 'Fab Team', manCount: 1, finishTimeMinutes: 120, revisionTimeMinutes: 30,
  },
  // STOCKROOM ASSETS
  {
    id: 'mat-inv-1', assetId: 'LM-MAT-001',
    name: 'Plywood sheet 4x8', itemCallName: 'Plywood Sheet',
    category: 'Stockroom Assets', subCategory: 'Raw Materials & Hardware',
    description: '3/4 inch exterior grade hardwood plywood sheet.',
    status: 'Available', image: '', unit: 'sheets',
    dimensions: { height: '244 cm', width: '122 cm', depth: '1.9 cm', weight: '25.0 kg' },
    material: 'Hardwood Plywood', colorType: 'mono', colorPrimary: 'Natural Wood',
    tags: ['Raw Materials', 'Carpentry', 'Stockroom'],
    purchaseCost: 45000, costPerUnit: 1800, dateAdded: '2026-01-10', primaryVendorId: 'ven-01',
    currentStock: 25, threshold: 50, criticalThreshold: 20, ceilingCap: 50,
  },
  {
    id: 'mat-inv-2', assetId: 'LM-MAT-002',
    name: 'Steel frame tubing 2x2in', itemCallName: 'Steel Tubing',
    category: 'Stockroom Assets', subCategory: 'Raw Materials & Hardware',
    description: 'Square hollow steel tubing 2x2 inch.',
    status: 'Available', image: '', unit: 'meters',
    dimensions: { height: '600 cm', width: '5 cm', depth: '5 cm', weight: '12.0 kg' },
    material: 'Steel', colorType: 'mono', colorPrimary: 'Raw Steel',
    tags: ['Raw Materials', 'Metalwork', 'Stockroom'],
    purchaseCost: 36000, costPerUnit: 1200, dateAdded: '2026-01-10', primaryVendorId: 'ven-02',
    currentStock: 30, threshold: 60, criticalThreshold: 25, ceilingCap: 60,
  },
  {
    id: 'mat-inv-3', assetId: 'LM-MAT-003',
    name: 'Acrylic panel clear 4x8', itemCallName: 'Acrylic Panel',
    category: 'Stockroom Assets', subCategory: 'Raw Materials & Hardware',
    description: '4mm clear cast acrylic panel 4x8.',
    status: 'Available', image: '', unit: 'panels',
    dimensions: { height: '244 cm', width: '122 cm', depth: '0.4 cm', weight: '14.0 kg' },
    material: 'Cast Acrylic', colorType: 'mono', colorPrimary: 'Clear',
    tags: ['Raw Materials', 'Signage', 'Stockroom'],
    purchaseCost: 52500, costPerUnit: 3500, dateAdded: '2026-01-10', primaryVendorId: 'ven-03',
    currentStock: 15, threshold: 30, criticalThreshold: 10, ceilingCap: 30,
  },
  {
    id: 'mat-inv-4', assetId: 'LM-MAT-004',
    name: 'Stretch fabric matte white 60in wide', itemCallName: 'Stretch Fabric White',
    category: 'Stockroom Assets', subCategory: 'Fabric & Textile',
    description: 'Spandex-blend stretch fabric roll, 60 in wide, matte white. Ideal for projection screens.',
    status: 'Available', image: '', unit: 'meters',
    dimensions: { height: '—', width: '152 cm', depth: '—', weight: '0.3 kg/m' },
    material: 'Spandex Blend', colorType: 'mono', colorPrimary: 'Matte White',
    tags: ['Fabric', 'Draping', 'Projection'],
    purchaseCost: 28000, costPerUnit: 280, dateAdded: '2026-03-15', primaryVendorId: 'ven-02',
    currentStock: 80, threshold: 50, criticalThreshold: 20, ceilingCap: 200,
  },
  {
    id: 'mat-inv-5', assetId: 'LM-MAT-005',
    name: 'Rigging hardware kit assorted', itemCallName: 'Rigging Hardware Kit',
    category: 'Stockroom Assets', subCategory: 'Rigging & Hardware',
    description: 'Assorted shackles, carabiners, cable ties, and zip ties. 200 pcs per kit.',
    status: 'Low Stock', image: '', unit: 'kits',
    dimensions: { height: '30 cm', width: '20 cm', depth: '15 cm', weight: '2.5 kg' },
    material: 'Stainless Steel & Nylon', colorType: 'mono', colorPrimary: 'Mixed',
    tags: ['Rigging', 'Hardware', 'Safety'],
    purchaseCost: 12000, costPerUnit: 1200, dateAdded: '2026-04-01', primaryVendorId: 'ven-04',
    currentStock: 6, threshold: 20, criticalThreshold: 5, ceilingCap: 50,
  },
  // RENTAL ASSETS
  {
    id: 'rent-ast-001', assetId: 'LM-RN-001',
    name: 'Chiavari Chair Gold Lot of 50', itemCallName: 'Gold Chiavari Chair',
    category: 'Rental Assets', subCategory: 'Furniture',
    description: 'Premium gold-finished Chiavari chairs with ivory cushion pads. Lot of 50, stackable.',
    status: 'Available', image: '/assets/inventory/tiffany-chair.png', unit: 'lots',
    dimensions: { height: '93 cm', width: '43 cm', depth: '43 cm', weight: '85 kg' },
    material: 'Resin & Aluminium', colorType: 'mono', colorPrimary: 'Champagne Gold',
    tags: ['Furniture', 'Chair', 'Rental'],
    purchaseCost: 0, costPerUnit: 18000, dateAdded: '2026-02-28', primaryVendorId: 'ven-05',
    supplierDetails: 'Legazpi Party Rentals', supplierContact: '+63 917 555 0011',
    lengthOfRent: '3 days per event', overduePenaltyFee: 2500, onLoanDueDate: '',
    rentalVendorName: 'Legazpi Party Rentals',
  },
  {
    id: 'rent-ast-002', assetId: 'LM-RN-002',
    name: 'Round Banquet Table 60in Lot of 10', itemCallName: '60in Banquet Table',
    category: 'Rental Assets', subCategory: 'Furniture',
    description: '60-inch round folding banquet table. Seats 8-10 guests. White laminate top. Lot of 10.',
    status: 'Available', image: '/assets/inventory/banquet-table.png', unit: 'lots',
    dimensions: { height: '76 cm', width: '152 cm', depth: '152 cm', weight: '110 kg' },
    is_circular: true, circumference: '478 cm',
    material: 'Laminate & Aluminium', colorType: 'mono', colorPrimary: 'White',
    tags: ['Furniture', 'Table', 'Rental', 'Banquet'],
    purchaseCost: 0, costPerUnit: 12000, dateAdded: '2026-02-28', primaryVendorId: 'ven-05',
    supplierDetails: 'Legazpi Party Rentals', supplierContact: '+63 917 555 0011',
    lengthOfRent: '3 days per event', overduePenaltyFee: 1500, onLoanDueDate: '',
    rentalVendorName: 'Legazpi Party Rentals',
  },
  {
    id: 'rent-ast-003', assetId: 'LM-RN-003',
    name: 'Generator 50 kVA Silent Diesel', itemCallName: '50kVA Generator',
    category: 'Rental Assets', subCategory: 'Power Equipment',
    description: 'Silent diesel generator, 50 kVA continuous. Soundproof canopy, AVR. Distribution board included.',
    status: 'Available', image: '/images/decor/uplighting.png', unit: 'units',
    dimensions: { height: '135 cm', width: '220 cm', depth: '90 cm', weight: '1200 kg' },
    material: 'Steel Canopy', colorType: 'mono', colorPrimary: 'Yellow & Grey',
    tags: ['Power', 'Generator', 'Rental'],
    purchaseCost: 0, costPerUnit: 25000, dateAdded: '2026-03-10', primaryVendorId: 'ven-06',
    supplierDetails: 'Bicol Power Rental Services', supplierContact: '+63 912 888 4400',
    lengthOfRent: 'Per event day', overduePenaltyFee: 5000, onLoanDueDate: '',
    rentalVendorName: 'Bicol Power Rental Services',
  },
  // ADMINISTRATIVE ASSETS
  {
    id: 'adm-ast-001', assetId: 'LM-AD-001',
    name: 'Apple MacBook Pro 14in M3 Pro', itemCallName: 'MacBook Pro 14in',
    category: 'Administrative Assets', subCategory: 'IT Equipment',
    description: 'MacBook Pro 14-inch, M3 Pro chip, 36 GB RAM, 1 TB SSD. Primary design workstation.',
    status: 'Available', image: '/images/decor/chateau-ballroom.png', unit: 'units',
    dimensions: { height: '1.55 cm', width: '31.26 cm', depth: '22.12 cm', weight: '1.61 kg' },
    material: 'Aluminium Unibody', colorType: 'mono', colorPrimary: 'Space Black',
    tags: ['IT', 'Laptop', 'Apple', 'Admin'],
    purchaseCost: 142000, costPerUnit: 142000, dateAdded: '2026-01-05', primaryVendorId: 'ven-07',
    custodian: 'Creative Director', vendorDetails: 'Apple Authorized Reseller',
    deviceModel: 'MacBook Pro 14in M3 Pro', serialNumber: 'C02ZQ1F2MD6V',
    deviceSpecs: 'Apple M3 Pro - 36 GB RAM - 1 TB SSD - macOS Sonoma',
  },
  {
    id: 'adm-ast-002', assetId: 'LM-AD-002',
    name: 'Canon EOS R5 Camera Body', itemCallName: 'Canon EOS R5',
    category: 'Administrative Assets', subCategory: 'Photography Equipment',
    description: '45 MP full-frame mirrorless camera. 8K RAW internal recording, IBIS, Dual Pixel AF.',
    status: 'Available', image: '/images/decor/crystal-chandelier.png', unit: 'units',
    dimensions: { height: '9.77 cm', width: '13.84 cm', depth: '8.82 cm', weight: '0.74 kg' },
    material: 'Magnesium Alloy', colorType: 'mono', colorPrimary: 'Matte Black',
    tags: ['Camera', 'Photography', 'Documentation'],
    purchaseCost: 225000, costPerUnit: 225000, dateAdded: '2026-02-10', primaryVendorId: 'ven-07',
    custodian: 'Creative Director', vendorDetails: 'Canon Philippines',
    deviceModel: 'Canon EOS R5 Body', serialNumber: 'R5-082649',
    deviceSpecs: '45 MP - 8K RAW - IBIS - Dual Pixel CMOS AF II',
  },
  // DEMO INVENTORY: image-backed records for the catalog gallery when no API catalog is available.
  {
    id: 'evt-demo-001', assetId: 'LM-EV-006', name: 'Crystal Candelabra Centrepiece', itemCallName: 'Crystal Candelabra',
    category: 'Event Assets', subCategory: 'Table Styling', description: 'Five-arm crystal centrepiece for formal dinner tables.', status: 'Available', image: '/images/items/candelabra.png', unit: 'pieces',
    dimensions: { height: '58 cm', width: '34 cm', depth: '34 cm', weight: '3.2 kg' }, material: 'Crystal and Brass', colorType: 'mono', colorPrimary: 'Clear', tags: ['Table Styling', 'Dinner'], purchaseCost: 18000, costPerUnit: 1800, dateAdded: '2026-05-12', primaryVendorId: 'ven-01', currentStock: 18, threshold: 8,
  },
  {
    id: 'evt-demo-002', assetId: 'LM-EV-007', name: 'Champagne Gold Plinth Set', itemCallName: 'Gold Plinth Set',
    category: 'Event Assets', subCategory: 'Display Furniture', description: 'Three-piece display plinth set for cakes, florals, and product reveals.', status: 'Available', image: '/images/items/brass-plinths.png', unit: 'sets',
    dimensions: { height: '90 cm', width: '35 cm', depth: '35 cm', weight: '15 kg' }, material: 'Brushed Metal', colorType: 'mono', colorPrimary: 'Champagne Gold', tags: ['Display', 'Plinth'], purchaseCost: 24000, costPerUnit: 8000, dateAdded: '2026-05-18', primaryVendorId: 'ven-01', currentStock: 9, threshold: 4,
  },
  {
    id: 'prod-demo-001', assetId: 'LM-PR-005', name: 'Suspended Crystal Canopy', itemCallName: 'Crystal Canopy',
    category: 'Production Assets', subCategory: 'Fabrication / Hanging Decor', description: 'Modular suspended canopy with crystal strands for entrance installations.', status: 'Available', image: '/images/elements/chandelier.png', unit: 'sets',
    dimensions: { height: '180 cm', width: '300 cm', depth: '300 cm', weight: '32 kg' }, material: 'Acrylic Crystal and Steel', colorType: 'mono', colorPrimary: 'Clear', tags: ['Ceiling', 'Crystal', 'Bespoke'], purchaseCost: 72000, costPerUnit: 72000, dateAdded: '2026-06-01', primaryVendorId: 'ven-01', bespokeStage: 'Prepping', bespokeCrew: 'Fab Team', manCount: 3, finishTimeMinutes: 360,
  },
  {
    id: 'prod-demo-002', assetId: 'LM-PR-006', name: 'Garden Ceremony Arch', itemCallName: 'Garden Arch',
    category: 'Production Assets', subCategory: 'Fabrication / Backdrops', description: 'Reusable arched frame dressed for garden-inspired ceremonies.', status: 'Available', image: '/assets/inventory/floral-arch.png', unit: 'sets',
    dimensions: { height: '260 cm', width: '220 cm', depth: '55 cm', weight: '26 kg' }, material: 'Steel Frame and Silk Florals', colorType: 'multi', colorPrimary: 'Ivory', colorSecondary: ['Sage', 'Blush'], tags: ['Arch', 'Ceremony', 'Floral'], purchaseCost: 56000, costPerUnit: 56000, dateAdded: '2026-06-03', primaryVendorId: 'ven-01', bespokeStage: 'Ready', bespokeCrew: 'Fab Team', manCount: 2, finishTimeMinutes: 210,
  },
  {
    id: 'stock-demo-001', assetId: 'LM-MAT-006', name: 'Ivory Satin Ribbon Roll', itemCallName: 'Ivory Ribbon',
    category: 'Stockroom Assets', subCategory: 'Fabric & Textile', description: 'Wide satin ribbon for bouquet wraps, menus, and finishing details.', status: 'Available', image: '/images/elements/ivory-satin.png', unit: 'rolls',
    dimensions: { height: '10 cm', width: '10 cm', depth: '10 cm', weight: '0.2 kg' }, material: 'Satin', colorType: 'mono', colorPrimary: 'Ivory', tags: ['Ribbon', 'Finishing'], purchaseCost: 9600, costPerUnit: 480, dateAdded: '2026-06-05', primaryVendorId: 'ven-02', currentStock: 48, threshold: 24, criticalThreshold: 12, ceilingCap: 100,
  },
  {
    id: 'stock-demo-002', assetId: 'LM-MAT-007', name: 'Warm White Fairy Light Strand', itemCallName: 'Fairy Lights',
    category: 'Stockroom Assets', subCategory: 'Electrical', description: 'Ten-metre warm white LED fairy-light strand for styling and draping.', status: 'Low Stock', image: '/images/elements/fairy-light-strand.png', unit: 'strands',
    dimensions: { height: '1000 cm', width: '1 cm', depth: '1 cm', weight: '0.4 kg' }, material: 'Copper Wire and LED', colorType: 'mono', colorPrimary: 'Warm White', tags: ['Lighting', 'Electrical'], purchaseCost: 12000, costPerUnit: 600, dateAdded: '2026-06-05', primaryVendorId: 'ven-03', currentStock: 14, threshold: 30, criticalThreshold: 10, ceilingCap: 80,
  },
  {
    id: 'rent-demo-001', assetId: 'LM-RN-004', name: 'Tiffany Chair White Lot of 50', itemCallName: 'White Tiffany Chair',
    category: 'Rental Assets', subCategory: 'Furniture', description: 'White Tiffany chairs with padded seats for ceremony and dinner setups.', status: 'Available', image: '/assets/inventory/tiffany-chair.png', unit: 'lots',
    dimensions: { height: '92 cm', width: '40 cm', depth: '43 cm', weight: '85 kg' }, material: 'Resin', colorType: 'mono', colorPrimary: 'White', tags: ['Chair', 'Rental', 'Ceremony'], purchaseCost: 0, costPerUnit: 16000, dateAdded: '2026-06-08', primaryVendorId: 'ven-05', supplierDetails: 'Legazpi Party Rentals', supplierContact: '+63 917 555 0011', lengthOfRent: '3 days per event', overduePenaltyFee: 2000, onLoanDueDate: '', rentalVendorName: 'Legazpi Party Rentals',
  },
  {
    id: 'rent-demo-002', assetId: 'LM-RN-005', name: 'Farmhouse Banquet Table Lot of 10', itemCallName: 'Farmhouse Table',
    category: 'Rental Assets', subCategory: 'Furniture', description: 'Natural wood banquet tables for long-table receptions.', status: 'Deployed', image: '/assets/inventory/banquet-table.png', unit: 'lots',
    dimensions: { height: '76 cm', width: '244 cm', depth: '91 cm', weight: '220 kg' }, material: 'Solid Wood', colorType: 'mono', colorPrimary: 'Natural Oak', tags: ['Table', 'Rental', 'Reception'], purchaseCost: 0, costPerUnit: 22000, dateAdded: '2026-06-08', primaryVendorId: 'ven-05', supplierDetails: 'Legazpi Party Rentals', supplierContact: '+63 917 555 0011', lengthOfRent: '3 days per event', overduePenaltyFee: 3000, onLoanDueDate: '2026-10-08', rentalVendorName: 'Legazpi Party Rentals',
  },
  {
    id: 'admin-demo-001', assetId: 'LM-AD-003', name: 'Operations iPad Pro 13in', itemCallName: 'Operations iPad',
    category: 'Administrative Assets', subCategory: 'IT Equipment', description: 'Tablet used for client check-ins, run sheets, and onsite sign-off.', status: 'Available', image: '/images/decor/minimalist-table.png', unit: 'units',
    dimensions: { height: '28 cm', width: '22 cm', depth: '0.5 cm', weight: '0.6 kg' }, material: 'Aluminium and Glass', colorType: 'mono', colorPrimary: 'Space Grey', tags: ['IT', 'Operations'], purchaseCost: 68000, costPerUnit: 68000, dateAdded: '2026-06-10', primaryVendorId: 'ven-07', custodian: 'Operations Desk', vendorDetails: 'Apple Authorized Reseller', deviceModel: 'iPad Pro 13in', serialNumber: 'LM-OPS-IPAD-03', deviceSpecs: '13-inch display · Wi-Fi + cellular',
  },
  {
    id: 'admin-demo-002', assetId: 'LM-AD-004', name: 'Portable Label Printer', itemCallName: 'Label Printer',
    category: 'Administrative Assets', subCategory: 'Logistics Equipment', description: 'Portable thermal printer for crate, shelf, and dispatch labels.', status: 'In Maintenance', image: '/images/elements/led-strip-roll.png', unit: 'units',
    dimensions: { height: '12 cm', width: '14 cm', depth: '7 cm', weight: '0.8 kg' }, material: 'ABS Plastic', colorType: 'mono', colorPrimary: 'Black', tags: ['Logistics', 'Labels'], purchaseCost: 8500, costPerUnit: 8500, dateAdded: '2026-06-10', primaryVendorId: 'ven-07', custodian: 'Warehouse Desk', vendorDetails: 'Office Equipment Supplier', deviceModel: 'Brother QL Series', serialNumber: 'LM-OPS-LBL-04', deviceSpecs: 'Thermal label printer',
  },
]


const CATALOG_STORAGE_KEY = '_lumiere_warehouse_catalog'
let cachedCatalog: CatalogAsset[] | null = null

export function getCatalogAssets(): CatalogAsset[] {
  if (cachedCatalog) return cachedCatalog
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(CATALOG_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedCatalog = parsed
          return cachedCatalog
        }
      }
    } catch {}
  }
  cachedCatalog = [...CANONICAL_CATALOG_ASSETS]
  return cachedCatalog
}

export function getCatalogAssetById(id: string): CatalogAsset | undefined {
  return getCatalogAssets().find((asset) => asset.id === id || asset.assetId === id)
}

// ---------- Live catalog store ----------
const listeners = new Set<() => void>()

function publishCatalog() {
  if (cachedCatalog && typeof window !== 'undefined') {
    try {
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(cachedCatalog))
    } catch {}
  }
  listeners.forEach((listener) => listener())
}

export function useCatalogAssets(): CatalogAsset[] {
  useEffect(() => {
    let active = true
    const loadAssets = () => {
      fetchAssetsApi({ pageSize: 500 }).then((items) => {
        if (!active || !items.length) return
        const mapped: CatalogAsset[] = items.map((raw: any, idx: number) => ({
          id: String(raw.id || raw.assetId || `cat-${idx}`),
          assetId: String(raw.assetId || `LM-${(raw.category || 'AS').slice(0, 2).toUpperCase()}-${1000 + idx}`),
          name: raw.name || 'Unnamed Asset',
          itemCallName: raw.itemCallName || raw.name || 'Asset',
          category: (raw.category as AssetCategory) || 'Stockroom Assets',
          subCategory: raw.subCategory || 'General',
          description: raw.description || '',
          status: (raw.assetState || raw.status || 'Available') as AssetStatus,
          image: raw.photoUrl || raw.catalogPhotoUrl || raw.image || '',
          unit: raw.unit || 'pcs',
          dimensions: raw.dimensions || { height: '—', width: '—', depth: '—', weight: '—' },
          material: raw.material || 'Standard',
          purchaseCost: raw.cost ?? raw.originalValue ?? raw.purchaseCost ?? 0,
          costPerUnit: raw.cost ?? raw.costPerUnit ?? 0,
          dateAdded: raw.dateAdded || raw.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          primaryVendorId: raw.primaryVendorId || '',
          currentStock: typeof raw.quantity === 'number' ? raw.quantity : (raw.currentStock ?? raw.baseCount ?? 0),
          threshold: raw.threshold ?? 5,
          criticalThreshold: raw.criticalThreshold ?? 2,
          ceilingCap: raw.ceilingCap ?? 100,
        }))

        // Smart merge: match by ID, or match by Name to adopt server GUID
        const current = getCatalogAssets()
        const byId = new Map(current.map((asset) => [asset.id, asset]))
        const byName = new Map(current.map((asset) => [asset.name.toLowerCase().trim(), asset]))

        mapped.forEach((serverAsset) => {
          if (byId.has(serverAsset.id)) {
            const prev = byId.get(serverAsset.id)!
            byId.set(serverAsset.id, { ...prev, ...serverAsset })
          } else if (byName.has(serverAsset.name.toLowerCase().trim())) {
            const prev = byName.get(serverAsset.name.toLowerCase().trim())!
            byId.delete(prev.id)
            byId.set(serverAsset.id, { ...prev, ...serverAsset, id: serverAsset.id })
          } else {
            byId.set(serverAsset.id, serverAsset)
          }
        })

        cachedCatalog = Array.from(byId.values())
        publishCatalog()
      }).catch((err) => {
        console.warn('[catalog] fetchAssetsApi failed:', err)
      })
    }

    loadAssets()
    const interval = setInterval(loadAssets, 30000)
    window.addEventListener('focus', loadAssets)

    return () => {
      active = false
      clearInterval(interval)
      window.removeEventListener('focus', loadAssets)
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

  createAssetApi(asset).then((res) => {
    if (res && ((res as any).assetId || (res as any).id)) {
      const serverId = String((res as any).assetId || (res as any).id)
      cachedCatalog = (cachedCatalog || existing).map((a) => (a.id === asset.id ? { ...a, id: serverId } : a))
      publishCatalog()
    }
  }).catch((err) => {
    console.error('Failed to create asset in backend:', err)
  })
  return asset
}

export function updateCatalogAsset(id: string, changes: Partial<Omit<CatalogAsset, 'id'>>) {
  const existing = getCatalogAssets()
  const target = existing.find((asset) => asset.id === id || asset.assetId === id)
  cachedCatalog = existing.map((asset) => (asset.id === id || asset.assetId === id ? { ...asset, ...changes } : asset))
  publishCatalog()

  if (target) {
    const updatedAsset = { ...target, ...changes }
    void updateAssetApi(target.id, updatedAsset).then(() => {
      if (updatedAsset.id !== target.id) {
        // If updateAssetApi adopted a new server GUID, update cache
        cachedCatalog = (cachedCatalog || existing).map((a) => (a.id === target.id ? { ...a, id: updatedAsset.id } : a))
        publishCatalog()
      }
    })
  }
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
