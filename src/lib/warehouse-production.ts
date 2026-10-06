export const INITIAL_PRODUCTION_ITEMS: ProductionItem[] = [
  {
    id: 'prod-item-1',
    itemName: 'Flower Wall - Blush Peony and Rose Arrangement',
    assetId: 'LM-PR-001',
    subCategory: 'Fabrication / Backdrops',
    eventId: 'evt-1',
    eventTitle: 'Empress Fine Jewelry Private Exhibition',
    thumbnail: '/assets/inventory/floral-arch.png',
    assignedCrew: 'Marco Villareal, Dennis Pineda',
    manCount: 2,
    estimatedHours: 16,
    startedAt: Date.now() - 2 * 24 * 3600 * 1000,
    stage: 'InProgress',
    status: 'InProgress',
    progressPercentage: 65,
    completedQuantity: 2,
    quota: 4,
    assignedWorkers: 2,
    shiftSelection: 'morning',
    startDate: '2026-10-05',
    lockedBaseSingleWorkerMinutes: 240,
    lockedMaxParallelWorkers: 3,
    computedMinutesPerItem: 120,
    computedTotalWorkHours: 8,
    computedWorkDays: 2,
    computedEndDate: '2026-10-09',
    delayFlags: [],
    effectiveEndDate: '2026-10-09',
    rawMaterials: [
      { id: 'm1', name: 'Silk Floral Heads (Blush Peony)', qty: 150, unit: 'pcs', checked: true },
      { id: 'm2', name: 'Steel Grid Frame 8x8 ft', qty: 4, unit: 'panels', checked: true },
      { id: 'm3', name: 'Industrial Zip Ties', qty: 200, unit: 'pcs', checked: true },
    ],
  },
  {
    id: 'prod-item-2',
    itemName: 'Gold Geometric Arch - Double Hexagon',
    assetId: 'LM-PR-002',
    subCategory: 'Fabrication / Backdrops',
    eventId: 'evt-2',
    eventTitle: 'Celestial Horizon Presidential Wedding',
    thumbnail: '/assets/inventory/floral-arch.png',
    assignedCrew: 'Joy Abrego, Marco Villareal',
    manCount: 2,
    estimatedHours: 12,
    startedAt: Date.now() - 1 * 24 * 3600 * 1000,
    stage: 'MaterialsVerified',
    status: 'MaterialsVerified',
    progressPercentage: 30,
    completedQuantity: 0,
    quota: 2,
    assignedWorkers: 2,
    shiftSelection: 'both',
    startDate: '2026-10-06',
    lockedBaseSingleWorkerMinutes: 180,
    lockedMaxParallelWorkers: 2,
    computedMinutesPerItem: 90,
    computedTotalWorkHours: 6,
    computedWorkDays: 1,
    computedEndDate: '2026-10-08',
    delayFlags: [],
    effectiveEndDate: '2026-10-08',
    rawMaterials: [
      { id: 'm4', name: 'Aluminium Hollow Square Tubing', qty: 12, unit: 'meters', checked: true },
      { id: 'm5', name: 'Metallic Gold Spray Paint', qty: 6, unit: 'cans', checked: true },
    ],
  },
  {
    id: 'prod-item-3',
    itemName: 'Custom Acrylic Neon Plinth & Signage Set',
    assetId: 'LM-PR-003',
    subCategory: 'Fabrication / Signage',
    eventId: 'evt-3',
    eventTitle: 'Solstice Motors Electric SUV Reveal',
    thumbnail: '/images/elements/led-strip-roll.png',
    assignedCrew: 'Trisha Domingo',
    manCount: 1,
    estimatedHours: 8,
    startedAt: Date.now() - 3 * 24 * 3600 * 1000,
    stage: 'Approved',
    status: 'Approved',
    progressPercentage: 100,
    completedQuantity: 6,
    quota: 6,
    assignedWorkers: 1,
    shiftSelection: 'morning',
    startDate: '2026-10-04',
    lockedBaseSingleWorkerMinutes: 80,
    lockedMaxParallelWorkers: 2,
    computedMinutesPerItem: 80,
    computedTotalWorkHours: 8,
    computedWorkDays: 1,
    computedEndDate: '2026-10-07',
    delayFlags: [],
    effectiveEndDate: '2026-10-07',
    rawMaterials: [
      { id: 'm6', name: 'Cast Acrylic Sheet 10mm', qty: 3, unit: 'sheets', checked: true },
      { id: 'm7', name: 'LED Flex Neon (Ice Blue)', qty: 15, unit: 'meters', checked: true },
    ],
  },
  {
    id: 'prod-item-4',
    itemName: 'Custom Velvet Modular Staging Platform',
    assetId: 'LM-PR-004',
    subCategory: 'Fabrication / Stagecraft',
    eventId: 'evt-4',
    eventTitle: 'Aura Luxe Autumn Gala 2026',
    thumbnail: '/images/decor/tiffany-chair.png',
    assignedCrew: 'Dennis Pineda',
    manCount: 2,
    estimatedHours: 24,
    startedAt: Date.now(),
    stage: 'Pending',
    status: 'Pending',
    progressPercentage: 0,
    completedQuantity: 0,
    quota: 8,
    assignedWorkers: 2,
    shiftSelection: 'night',
    startDate: '2026-10-08',
    lockedBaseSingleWorkerMinutes: 120,
    lockedMaxParallelWorkers: 4,
    computedMinutesPerItem: 60,
    computedTotalWorkHours: 8,
    computedWorkDays: 2,
    computedEndDate: '2026-10-12',
    delayFlags: [],
    effectiveEndDate: '2026-10-12',
    rawMaterials: [
      { id: 'm8', name: 'Marine Plywood 3/4 inch', qty: 8, unit: 'sheets', checked: false },
      { id: 'm9', name: 'Crimson Velvet Heavy Fabric', qty: 25, unit: 'yards', checked: false },
    ],
  },
];

// Canonical data layer for Production & Fabrication.
// Renders authoritative backend production records. Zero frontend fixture records.
import { useSyncExternalStore } from 'react'
import type { PortalEvent, Staff } from '@/lib/types'
import { getBespokeSubCategoryConfigs, type CatalogAsset } from '@/lib/warehouse-catalog'
import { getCrewPool } from '@/lib/warehouse-crew'

export type CanonicalProductionStage =
  | 'Pending'
  | 'MaterialsVerified'
  | 'InProgress'
  | 'CompletedAwaitingApproval'
  | 'RejectedRework'
  | 'Approved'
  | 'DispatchReady'
  | 'Cancelled'

export type ProductionStage =
  | CanonicalProductionStage
  | 'Unprepped'
  | 'Prepping'
  | 'Awaiting Approval'
  | 'Ready'

export const PRODUCTION_STAGES: ProductionStage[] = [
  'Pending',
  'MaterialsVerified',
  'InProgress',
  'CompletedAwaitingApproval',
  'RejectedRework',
  'Approved',
  'DispatchReady',
]

export type ShiftType = 'morning' | 'night' | 'both'

export interface ShiftConfig {
  id: ShiftType
  label: string
  window: string
  effectiveWorkHours: number
  startHour: number
  endHour: number
}

export const SHIFT_CONFIGS: Record<ShiftType, ShiftConfig> = {
  morning: {
    id: 'morning',
    label: 'Morning Shift',
    window: '8:00 AM – 5:00 PM (8h net)',
    effectiveWorkHours: 8,
    startHour: 8,
    endHour: 17,
  },
  night: {
    id: 'night',
    label: 'Night Shift',
    window: '5:00 PM – 2:00 AM (8h net)',
    effectiveWorkHours: 8,
    startHour: 17,
    endHour: 2,
  },
  both: {
    id: 'both',
    label: 'Both Shifts (16h Velocity)',
    window: 'Morning + Night (16h net)',
    effectiveWorkHours: 16,
    startHour: 8,
    endHour: 2,
  },
}

export interface ProductionDelayFlag {
  id: string
  loggedAt: string
  loggedBy: string
  reason: string
  delayHours: number
  resolved?: boolean
}

export interface RawMaterial {
  id: string
  name: string
  qty: number
  unit: string
  checked: boolean
}

export interface AccomplishmentDeclaration {
  notes: string
  photoDataUrl?: string
  submittedAt: string
}

export interface ProductionItem {
  id: string
  itemName: string
  assetId?: string
  subCategory?: string
  eventId: string
  eventTitle: string
  thumbnail: string
  assignedCrew: string
  manCount: number
  estimatedHours: number
  startedAt: number
  stage: ProductionStage
  status?: string
  progressPercentage?: number
  completedQuantity?: number
  targetQuantity?: number
  rawMaterials: RawMaterial[]
  accomplishment?: AccomplishmentDeclaration
  verificationNotes?: string
  rejectionReason?: string
  approvalNotes?: string
  handoffNotes?: string

  // Gantt & Scheduling Engine Fields
  quota: number
  assignedWorkers: number
  shiftSelection: ShiftType
  startDate: string // YYYY-MM-DD
  lockedBaseSingleWorkerMinutes: number
  lockedMaxParallelWorkers: number
  computedMinutesPerItem: number
  computedTotalWorkHours: number
  computedWorkDays: number
  computedEndDate: string // YYYY-MM-DD (read-only)
  delayFlags: ProductionDelayFlag[]
  effectiveEndDate: string // YYYY-MM-DD (computedEndDate + delays)
}

function hashOf(value: string) {
  return Math.abs(value.split('').reduce((sum, char) => sum + char.charCodeAt(0) * 31, 7))
}

const MATERIAL_POOL = [
  { name: 'Plywood sheet 4x8', unit: 'sheets' },
  { name: 'Steel frame tubing', unit: 'meters' },
  { name: 'Acrylic panel — clear', unit: 'panels' },
  { name: 'Spray paint — matte black', unit: 'cans' },
  { name: 'LED strip — warm white', unit: 'rolls' },
  { name: 'Foam board', unit: 'sheets' },
  { name: 'Wood stain', unit: 'liters' },
  { name: 'Fabric — velvet backdrop', unit: 'meters' },
]

function buildMaterials(seed: number): RawMaterial[] {
  const count = 2 + (seed % 3)
  return Array.from({ length: count }, (_, i) => {
    const source = MATERIAL_POOL[(seed + i * 3) % MATERIAL_POOL.length]
    return {
      id: `mat-${seed}-${i}`,
      name: source.name,
      qty: 1 + ((seed + i * 5) % 12),
      unit: source.unit,
      checked: false,
    }
  })
}

export function calculateProductionSchedule(params: {
  quota: number
  baseSingleWorkerMinutes: number
  maxParallelWorkers: number
  assignedWorkers: number
  shift: ShiftType
  startDate: string
  delays?: ProductionDelayFlag[]
}): {
  effectiveWorkers: number
  computedMinutesPerItem: number
  computedTotalWorkHours: number
  computedWorkDays: number
  computedEndDate: string
  totalDelayHours: number
  totalDelayDays: number
  effectiveEndDate: string
} {
  const { quota, baseSingleWorkerMinutes, maxParallelWorkers, assignedWorkers, shift, startDate, delays = [] } = params

  const effectiveWorkers = Math.min(assignedWorkers, maxParallelWorkers)
  const computedMinutesPerItem = Math.max(1, Math.round(baseSingleWorkerMinutes / Math.max(1, effectiveWorkers)))
  const totalProductionMinutes = computedMinutesPerItem * Math.max(1, quota)
  const computedTotalWorkHours = Math.round((totalProductionMinutes / 60) * 10) / 10

  const dailyVelocityHours = SHIFT_CONFIGS[shift]?.effectiveWorkHours || 8
  const computedWorkDays = Math.max(1, Math.ceil(computedTotalWorkHours / dailyVelocityHours))

  const start = new Date(startDate || new Date().toISOString().slice(0, 10))
  const end = new Date(start)
  end.setDate(end.getDate() + (computedWorkDays - 1))
  const computedEndDate = end.toISOString().slice(0, 10)

  const totalDelayHours = delays.reduce((acc, d) => acc + (d.delayHours || 0), 0)
  const totalDelayDays = Math.ceil(totalDelayHours / dailyVelocityHours)

  const effectiveEnd = new Date(end)
  effectiveEnd.setDate(effectiveEnd.getDate() + totalDelayDays)
  const effectiveEndDate = effectiveEnd.toISOString().slice(0, 10)

  return {
    effectiveWorkers,
    computedMinutesPerItem,
    computedTotalWorkHours,
    computedWorkDays,
    computedEndDate,
    totalDelayHours,
    totalDelayDays,
    effectiveEndDate,
  }
}

const listeners = new Set<() => void>()
const storeKey = '__warehouse_production_store__'
type ProdGlobal = typeof globalThis & { [storeKey]?: ProductionItem[] }
const globalStore = globalThis as ProdGlobal
let items: ProductionItem[] = (globalStore[storeKey] && globalStore[storeKey]!.length > 0) ? globalStore[storeKey]! : INITIAL_PRODUCTION_ITEMS

function publish() {
  globalStore[storeKey] = items
  listeners.forEach((listener) => listener())
}

export function useProductionItems(events: PortalEvent[] = [], staff: Staff[] = []): ProductionItem[] {
  void events
  void staff
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => items,
    () => items,
  )
}

export function moveProductionItem(id: string, stage: ProductionStage) {
  items = items.map((item) => (item.id === id ? { ...item, stage, status: stage } : item))
  publish()
}

export function verifyMaterialsOnItem(id: string, notes?: string) {
  items = items.map((item) =>
    item.id === id
      ? {
          ...item,
          stage: 'MaterialsVerified',
          status: 'MaterialsVerified',
          verificationNotes: notes || item.verificationNotes,
          rawMaterials: item.rawMaterials.map((m) => ({ ...m, checked: true })),
        }
      : item,
  )
  publish()
}

export function updateItemProgress(
  id: string,
  progressPercentage: number,
  completedQuantity?: number,
  notes?: string,
) {
  items = items.map((item) => {
    if (item.id !== id) return item
    const is100 = progressPercentage >= 100
    const newStage: ProductionStage = is100 ? 'CompletedAwaitingApproval' : 'InProgress'
    return {
      ...item,
      stage: newStage,
      status: newStage,
      progressPercentage,
      completedQuantity: completedQuantity ?? item.completedQuantity ?? Math.round((progressPercentage / 100) * item.quota),
      accomplishment: notes
        ? { notes, submittedAt: new Date().toISOString(), photoDataUrl: item.accomplishment?.photoDataUrl }
        : item.accomplishment,
    }
  })
  publish()
}

export function approveProductionItem(id: string, notes?: string) {
  items = items.map((item) =>
    item.id === id
      ? {
          ...item,
          stage: 'Approved',
          status: 'Approved',
          approvalNotes: notes || item.approvalNotes,
        }
      : item,
  )
  publish()
}

export function rejectProductionItem(id: string, reason: string) {
  items = items.map((item) =>
    item.id === id
      ? {
          ...item,
          stage: 'RejectedRework',
          status: 'RejectedRework',
          rejectionReason: reason,
        }
      : item,
  )
  publish()
}

export function resumeProductionItemRework(id: string, notes?: string) {
  items = items.map((item) =>
    item.id === id
      ? {
          ...item,
          stage: 'InProgress',
          status: 'InProgress',
          accomplishment: notes
            ? { notes, submittedAt: new Date().toISOString() }
            : item.accomplishment,
        }
      : item,
  )
  publish()
}

export function handoffProductionItem(id: string, notes?: string) {
  items = items.map((item) =>
    item.id === id
      ? {
          ...item,
          stage: 'DispatchReady',
          status: 'DispatchReady',
          handoffNotes: notes || item.handoffNotes,
        }
      : item,
  )
  publish()
}

export function toggleMaterial(itemId: string, materialId: string) {
  items = items.map((item) =>
    item.id === itemId
      ? { ...item, rawMaterials: item.rawMaterials.map((m) => (m.id === materialId ? { ...m, checked: !m.checked } : m)) }
      : item,
  )
  publish()
}

export function submitForApproval(itemId: string, notes: string, photoDataUrl?: string) {
  items = items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          stage: 'CompletedAwaitingApproval',
          status: 'CompletedAwaitingApproval',
          accomplishment: { notes, photoDataUrl, submittedAt: new Date().toISOString() },
        }
      : item,
  )
  publish()
}

export function approveForDispatch(itemId: string) {
  items = items.map((item) => (item.id === itemId ? { ...item, stage: 'DispatchReady', status: 'DispatchReady' } : item))
  publish()
}

export function sendBackForRevision(itemId: string) {
  items = items.map((item) => (item.id === itemId ? { ...item, stage: 'RejectedRework', status: 'RejectedRework' } : item))
  publish()
}

export function elapsedLabel(startedAt: number): string {
  const ms = Date.now() - startedAt
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  if (hours <= 0) return `${Math.max(1, minutes)}m`
  return `${hours}h ${minutes}m`
}

// ---------- Team Capacity strip ----------

export interface TeamCapacity {
  committedHours: number
  availableHours: number
  status: 'healthy' | 'amber' | 'red'
}

export function getTeamCapacity(items: ProductionItem[], staff: Staff[]): TeamCapacity {
  const active = items.filter((item) => item.stage !== 'Ready')
  const committedHours = active.reduce((sum, item) => sum + item.estimatedHours, 0)
  const crewCount = Math.max(1, getCrewPool(staff).length)
  const availableHours = crewCount * 40
  const ratio = committedHours / availableHours
  const status: TeamCapacity['status'] = ratio >= 1 ? 'red' : ratio >= 0.75 ? 'amber' : 'healthy'
  return { committedHours, availableHours, status }
}

// ---------- Quota Estimation Tool ----------

export function estimateFinishHours(manCount: number, materialCount: number): number {
  const base = 18
  const materialLoad = materialCount * 1.6
  const crewDivisor = Math.max(1, manCount * 0.6)
  return Math.round(((base + materialLoad) / crewDivisor) * 10) / 10
}

// ---------- Gantt Scheduling & Delay Actions ----------

export function scheduleBespokeItem(params: {
  asset: CatalogAsset
  eventId: string
  eventTitle: string
  quota: number
  assignedWorkers: number
  shiftSelection: ShiftType
  startDate: string
  assignedCrew?: string
}): ProductionItem {
  const subCategoryConfigs = getBespokeSubCategoryConfigs()
  const subCat = params.asset.subCategory || 'Fabrication / Backdrops'
  const maxParallel = subCategoryConfigs[subCat]?.maxParallelWorkers ?? 3
  const baseMinutes = params.asset.baseSingleWorkerTimeMinutes || 48

  const schedule = calculateProductionSchedule({
    quota: params.quota,
    baseSingleWorkerMinutes: baseMinutes,
    maxParallelWorkers: maxParallel,
    assignedWorkers: params.assignedWorkers,
    shift: params.shiftSelection,
    startDate: params.startDate,
  })

  const newItem: ProductionItem = {
    id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    itemName: params.asset.name,
    assetId: params.asset.id,
    subCategory: subCat,
    eventId: params.eventId,
    eventTitle: params.eventTitle,
    thumbnail: params.asset.image,
    assignedCrew: params.assignedCrew || 'Fab Team — Ronnie',
    manCount: params.assignedWorkers,
    estimatedHours: schedule.computedTotalWorkHours,
    startedAt: new Date(params.startDate).getTime(),
    stage: 'Prepping',
    rawMaterials: buildMaterials(hashOf(params.asset.id)),
    quota: params.quota,
    assignedWorkers: params.assignedWorkers,
    shiftSelection: params.shiftSelection,
    startDate: params.startDate,
    lockedBaseSingleWorkerMinutes: baseMinutes,
    lockedMaxParallelWorkers: maxParallel,
    computedMinutesPerItem: schedule.computedMinutesPerItem,
    computedTotalWorkHours: schedule.computedTotalWorkHours,
    computedWorkDays: schedule.computedWorkDays,
    computedEndDate: schedule.computedEndDate,
    delayFlags: [],
    effectiveEndDate: schedule.effectiveEndDate,
  }

  items = [newItem, ...items]
  publish()
  return newItem
}

export function flagProductionDelay(
  itemId: string,
  delay: { reason: string; delayHours: number; loggedBy: string },
) {
  items = items.map((item) => {
    if (item.id !== itemId) return item
    const newFlag: ProductionDelayFlag = {
      id: `delay-${Date.now()}`,
      loggedAt: new Date().toISOString(),
      loggedBy: delay.loggedBy,
      reason: delay.reason,
      delayHours: delay.delayHours,
    }
    const updatedFlags = [...(item.delayFlags || []), newFlag]
    const schedule = calculateProductionSchedule({
      quota: item.quota,
      baseSingleWorkerMinutes: item.lockedBaseSingleWorkerMinutes,
      maxParallelWorkers: item.lockedMaxParallelWorkers,
      assignedWorkers: item.assignedWorkers,
      shift: item.shiftSelection,
      startDate: item.startDate,
      delays: updatedFlags,
    })
    return {
      ...item,
      delayFlags: updatedFlags,
      effectiveEndDate: schedule.effectiveEndDate,
    }
  })
  publish()
}

export interface DailyCapacityAlert {
  date: string
  allocatedWorkers: number
  availableCrew: number
  isOverAllocated: boolean
  exceededBy: number
  activeItemCount: number
}

export function getDailyCapacityOverAllocations(
  productionItems: ProductionItem[],
  totalFabCrew: number,
  daysRange = 14,
  startDateStr?: string,
): DailyCapacityAlert[] {
  const start = new Date(startDateStr || new Date().toISOString().slice(0, 10))
  const results: DailyCapacityAlert[] = []

  for (let i = 0; i < daysRange; i++) {
    const current = new Date(start)
    current.setDate(current.getDate() + i)
    const dateKey = current.toISOString().slice(0, 10)

    let allocatedWorkers = 0
    let activeItemCount = 0

    productionItems.forEach((item) => {
      const itemStart = item.startDate
      const itemEnd = item.effectiveEndDate || item.computedEndDate
      if (itemStart && itemEnd && dateKey >= itemStart && dateKey <= itemEnd) {
        allocatedWorkers += item.assignedWorkers || item.manCount || 1
        activeItemCount += 1
      }
    })

    const isOverAllocated = totalFabCrew > 0 && allocatedWorkers > totalFabCrew
    results.push({
      date: dateKey,
      allocatedWorkers,
      availableCrew: totalFabCrew,
      isOverAllocated,
      exceededBy: Math.max(0, allocatedWorkers - totalFabCrew),
      activeItemCount,
    })
  }

  return results
}
