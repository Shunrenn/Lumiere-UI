// Mutable seed + store layer for Production & Fabrication. Bespoke build
// commitments are drawn from the Asset Catalog's Bespoke category and paired
// with the live event roster, then held in an in-memory store so kanban
// drags, approvals, quota estimates, and Gantt schedules persist for the session.
import { useSyncExternalStore } from 'react'
import type { PortalEvent, Staff } from '@/lib/types'
import { getCatalogAssets, getBespokeSubCategoryConfigs, type CatalogAsset } from '@/lib/warehouse-catalog'
import { getCrewPool } from '@/lib/warehouse-crew'

export type ProductionStage = 'Unprepped' | 'Prepping' | 'Awaiting Approval' | 'Ready'

export const PRODUCTION_STAGES: ProductionStage[] = ['Unprepped', 'Prepping', 'Awaiting Approval', 'Ready']

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
  rawMaterials: RawMaterial[]
  accomplishment?: AccomplishmentDeclaration

  // Gantt & Scheduling Engine Fields (Part B)
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
      checked: (seed + i) % 3 === 0,
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

  const effectiveWorkers = Math.max(1, Math.min(assignedWorkers, maxParallelWorkers))
  const computedMinutesPerItem = baseSingleWorkerMinutes > 0 ? baseSingleWorkerMinutes / effectiveWorkers : 45
  const computedTotalWorkHours = (Math.max(1, quota) * computedMinutesPerItem) / 60
  const dailyWorkHours = SHIFT_CONFIGS[shift]?.effectiveWorkHours ?? 8
  const computedWorkDays = Math.max(1, Math.ceil(computedTotalWorkHours / dailyWorkHours))

  const startObj = new Date(startDate || new Date().toISOString().slice(0, 10))
  const endObj = new Date(startObj)
  endObj.setDate(endObj.getDate() + (computedWorkDays - 1))
  const computedEndDate = endObj.toISOString().slice(0, 10)

  const totalDelayHours = delays.reduce((sum, d) => sum + (d.delayHours || 0), 0)
  const totalDelayDays = Math.ceil(totalDelayHours / dailyWorkHours)

  const effectiveEndObj = new Date(endObj)
  effectiveEndObj.setDate(effectiveEndObj.getDate() + totalDelayDays)
  const effectiveEndDate = effectiveEndObj.toISOString().slice(0, 10)

  return {
    effectiveWorkers,
    computedMinutesPerItem: Math.round(computedMinutesPerItem * 10) / 10,
    computedTotalWorkHours: Math.round(computedTotalWorkHours * 10) / 10,
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
let items: ProductionItem[] = globalStore[storeKey] ?? []

function publish() {
  globalStore[storeKey] = items
  listeners.forEach((listener) => listener())
}

function seedItems(events: PortalEvent[], staff: Staff[]) {
  if (items.length > 0) return
  const bespoke = getCatalogAssets().filter((asset) => asset.category === 'Bespoke')
  const crewPool = getCrewPool(staff)
  const subCategoryConfigs = getBespokeSubCategoryConfigs()
  const stageForBespoke: Record<string, ProductionStage> = {
    Unprepped: 'Unprepped',
    Prepping: 'Prepping',
    Ready: 'Ready',
  }

  const seeded: ProductionItem[] = []
  const today = new Date()

  bespoke.forEach((asset, index) => {
    const seed = hashOf(asset.id)
    const event = events.length > 0 ? events[(seed + index) % events.length] : undefined
    const crewMember = crewPool[(seed + index) % Math.max(1, crewPool.length)]
    const baseStage = asset.bespokeStage ? stageForBespoke[asset.bespokeStage] : 'Unprepped'
    const stage: ProductionStage = seed % 7 === 0 && baseStage !== 'Ready' ? 'Awaiting Approval' : baseStage

    const subCat = asset.subCategory || 'Fabrication / Backdrops'
    const maxParallel = subCategoryConfigs[subCat]?.maxParallelWorkers ?? 3
    const baseMinutes = asset.baseSingleWorkerTimeMinutes || 48
    const assignedWorkers = 2 + (seed % 3)
    const quota = 4 + (seed % 20)
    const shiftSelection: ShiftType = seed % 3 === 0 ? 'both' : seed % 2 === 0 ? 'morning' : 'night'

    const startDateObj = new Date(today)
    startDateObj.setDate(startDateObj.getDate() + (index * 2 - 2))
    const startDate = startDateObj.toISOString().slice(0, 10)

    const initialDelays: ProductionDelayFlag[] =
      seed % 4 === 0
        ? [
            {
              id: `delay-${seed}`,
              loggedAt: new Date(Date.now() - 86400000).toISOString(),
              loggedBy: 'Ronnie (Fab Lead)',
              reason: 'Late delivery of acrylic raw stock from supplier',
              delayHours: 8,
            },
          ]
        : []

    const schedule = calculateProductionSchedule({
      quota,
      baseSingleWorkerMinutes: baseMinutes,
      maxParallelWorkers: maxParallel,
      assignedWorkers,
      shift: shiftSelection,
      startDate,
      delays: initialDelays,
    })

    seeded.push({
      id: `prod-${asset.id}`,
      itemName: asset.name,
      assetId: asset.id,
      subCategory: subCat,
      eventId: event?.id ?? '',
      eventTitle: event?.title ?? 'Cross-event stock build',
      thumbnail: asset.image,
      assignedCrew: crewMember ? `${crewMember.firstName} ${crewMember.surname}` : asset.bespokeCrew ?? 'Unassigned',
      manCount: assignedWorkers,
      estimatedHours: schedule.computedTotalWorkHours,
      startedAt: startDateObj.getTime(),
      stage,
      rawMaterials: buildMaterials(seed),
      accomplishment:
        stage === 'Awaiting Approval' || stage === 'Ready'
          ? {
              notes: 'Structural build complete, finishing touches applied ahead of client walkthrough.',
              submittedAt: new Date(Date.now() - (seed % 5) * 3600_000).toISOString(),
            }
          : undefined,

      quota,
      assignedWorkers,
      shiftSelection,
      startDate,
      lockedBaseSingleWorkerMinutes: baseMinutes,
      lockedMaxParallelWorkers: maxParallel,
      computedMinutesPerItem: schedule.computedMinutesPerItem,
      computedTotalWorkHours: schedule.computedTotalWorkHours,
      computedWorkDays: schedule.computedWorkDays,
      computedEndDate: schedule.computedEndDate,
      delayFlags: initialDelays,
      effectiveEndDate: schedule.effectiveEndDate,
    })
  })
  items = seeded
  globalStore[storeKey] = items
}

export function useProductionItems(events: PortalEvent[], staff: Staff[]) {
  seedItems(events, staff)
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
  items = items.map((item) => (item.id === id ? { ...item, stage } : item))
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
          stage: 'Awaiting Approval',
          accomplishment: { notes, photoDataUrl, submittedAt: new Date().toISOString() },
        }
      : item,
  )
  publish()
}

export function approveForDispatch(itemId: string) {
  items = items.map((item) => (item.id === itemId ? { ...item, stage: 'Ready' } : item))
  publish()
}

export function sendBackForRevision(itemId: string) {
  items = items.map((item) => (item.id === itemId ? { ...item, stage: 'Prepping' } : item))
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
  // Simple historical-average-style heuristic: base build time scales down
  // with more hands on deck, up with more distinct materials to source/cut.
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
