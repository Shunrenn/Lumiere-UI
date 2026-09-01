// Mutable seed + store layer for Production & Fabrication. Bespoke build
// commitments are drawn from the Asset Catalog's Bespoke category and paired
// with the live event roster, then held in an in-memory store so kanban
// drags, approvals, and quota estimates persist for the session.
import { useSyncExternalStore } from 'react'
import type { PortalEvent, Staff } from '@/lib/types'
import { getCatalogAssets } from '@/lib/warehouse-catalog'
import { getCrewPool } from '@/lib/warehouse-crew'

export type ProductionStage = 'Unprepped' | 'Prepping' | 'Awaiting Approval' | 'Ready'

export const PRODUCTION_STAGES: ProductionStage[] = ['Unprepped', 'Prepping', 'Awaiting Approval', 'Ready']

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
  const stageForBespoke: Record<string, ProductionStage> = {
    Unprepped: 'Unprepped',
    Prepping: 'Prepping',
    Ready: 'Ready',
  }

  const seeded: ProductionItem[] = []
  bespoke.forEach((asset, index) => {
    const seed = hashOf(asset.id)
    const event = events.length > 0 ? events[(seed + index) % events.length] : undefined
    const crewMember = crewPool[(seed + index) % Math.max(1, crewPool.length)]
    const baseStage = asset.bespokeStage ? stageForBespoke[asset.bespokeStage] : 'Unprepped'
    const stage: ProductionStage = seed % 7 === 0 && baseStage !== 'Ready' ? 'Awaiting Approval' : baseStage
    seeded.push({
      id: `prod-${asset.id}`,
      itemName: asset.name,
      eventId: event?.id ?? '',
      eventTitle: event?.title ?? 'Cross-event stock build',
      thumbnail: asset.image,
      assignedCrew: crewMember ? `${crewMember.firstName} ${crewMember.surname}` : asset.bespokeCrew ?? 'Unassigned',
      manCount: 2 + (seed % 4),
      estimatedHours: 6 + (seed % 30),
      startedAt: Date.now() - (seed % 10) * 3600_000,
      stage,
      rawMaterials: buildMaterials(seed),
      accomplishment:
        stage === 'Awaiting Approval' || stage === 'Ready'
          ? {
              notes: 'Structural build complete, finishing touches applied ahead of client walkthrough.',
              submittedAt: new Date(Date.now() - (seed % 5) * 3600_000).toISOString(),
            }
          : undefined,
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
