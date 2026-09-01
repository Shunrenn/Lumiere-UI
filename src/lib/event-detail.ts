// Deterministic derivation layer for the Event Detail View.
// Nothing here is persisted server-side yet — each event's crew, items,
// production, replenishment, and dispatch snapshot is derived from the
// event record plus the existing staff/procurement rosters, so the same
// event always renders the same detail (no random flicker on re-render).
import type { PortalEvent, ProcurementItem, Staff } from '@/lib/types'
import { getCatalogAssets, type CatalogAsset } from '@/lib/warehouse-catalog'
import type { ProductionItem } from '@/lib/warehouse-production'

export type EventOverallStatus = 'On Track' | 'Attention Needed' | 'Blocked'

export type CrewAssignmentStatus = 'Confirmed' | 'Pending' | 'Unavailable'

export interface EventCrewAssignment {
  id: string
  name: string
  role: string
  status: CrewAssignmentStatus
}

export type AllocatedItemStatus = 'Reserved' | 'Packed' | 'Short'

export interface EventAllocatedItem {
  id: string
  name: string
  quantity: number
  unit: string
  status: AllocatedItemStatus
}

export type ProductionBannerState = 'Not Started' | 'In Production' | 'Ready'

export interface EventReplenishmentSummary {
  resolved: number
  pending: number
  critical: number
}

export type BatchDirection = 'outbound' | 'return'
export type BatchStage = 'Planned' | 'Loaded' | 'In Transit' | 'Delivered' | 'Returned'
export type DispatchBannerState = 'No Dispatch Yet' | 'Dispatch In Progress' | 'Delayed Dispatch' | 'Stalled In Transit — Needs Attention'
export type ReconciliationStatus = 'Matched' | 'Short' | 'Pahabol'

export interface ReconciliationRow {
  id: string
  itemName: string
  planned: number
  actual: number
  status: ReconciliationStatus
  justification: string
}

export interface BatchCrewMember {
  id: string
  name: string
}

export interface DispatchBatch {
  id: string
  vehicleType: string
  plateNumber: string
  direction: BatchDirection
  stage: BatchStage
  handoffNote: string
  crew: BatchCrewMember[]
  reconciliation: ReconciliationRow[]
  // Stalled In Transit — set by the crew executing the checkpoint when a
  // vehicle breaks down or a batch is otherwise interrupted mid-leg. This is
  // an interruption layered on top of `stage` (almost always caught at
  // "In Transit"), not a fifth step in the Planned → Loaded → In Transit →
  // Delivered/Returned sequence, so the stage a batch stalled at is preserved
  // and it can resume from exactly where it stopped.
  stalled: boolean
  stalledReason: string
}

// A single event field that an Admin edited since the planner's last view.
// `field` is the human label; `value` is the current (post-edit) value shown
// highlighted in the change-details modal.
export interface EditedEventField {
  key: 'title' | 'venue' | 'targetDate' | 'status'
  label: string
  value: string
}

export interface EventDetailSnapshot {
  overallStatus: EventOverallStatus
  changedSinceLastView: boolean
  // Which event fields the Admin edited since last view. Empty when
  // changedSinceLastView is false. Deterministically derived (see below) so
  // the red-dot modal always lists the same fields for a given event.
  editedFields: EditedEventField[]
  crew: EventCrewAssignment[]
  items: EventAllocatedItem[]
  replenishment: EventReplenishmentSummary
  dispatch: { banner: DispatchBannerState; batches: DispatchBatch[] }
}

// Deterministically derive which event fields were "edited by Admin" from the
// same event seed that drives changedSinceLastView. There is no server-side
// field-diff yet, so this mirrors the rest of the derivation layer: same event
// → same edited-field set, no random flicker across renders.
function deriveEditedFields(event: PortalEvent, seed: number): EditedEventField[] {
  const candidates: EditedEventField[] = [
    { key: 'targetDate', label: 'Target date', value: event.targetDate },
    { key: 'venue', label: 'Venue', value: event.venue },
    { key: 'status', label: 'Status', value: event.status },
    { key: 'title', label: 'Event title', value: event.title },
  ]
  // 1–3 fields, chosen deterministically from the seed.
  const count = 1 + (seed % 3)
  const start = seed % candidates.length
  return Array.from({ length: count }, (_, i) => candidates[(start + i) % candidates.length])
}

function hashOf(value: string) {
  return Math.abs(value.split('').reduce((sum, char) => sum + char.charCodeAt(0) * 31, 7))
}

function pick<T>(list: T[], seed: number, offset = 0) {
  if (list.length === 0) return undefined
  return list[(seed + offset) % list.length]
}

const STAGE_STEPS: BatchStage[] = ['Planned', 'Loaded', 'In Transit', 'Delivered']
const RETURN_STAGE_STEPS: BatchStage[] = ['Planned', 'Loaded', 'In Transit', 'Returned']

export function stageSequenceFor(direction: BatchDirection) {
  return direction === 'outbound' ? STAGE_STEPS : RETURN_STAGE_STEPS
}

export function nextStage(direction: BatchDirection, stage: BatchStage): BatchStage {
  const sequence = stageSequenceFor(direction)
  const index = sequence.indexOf(stage)
  if (index === -1 || index === sequence.length - 1) return stage
  return sequence[index + 1]
}

const VEHICLE_TYPES = ['Truck Alpha (6-Ton)', 'Van Beta (Transit)', 'Truck Gamma (4-Ton)', 'Van Delta (Transit)']

function plateFor(seed: number) {
  const letters = 'ABCDEFGHJKLMN'
  const a = letters[seed % letters.length]
  const b = letters[(seed >> 3) % letters.length]
  const digits = String((seed * 37) % 9000 + 1000)
  return `${a}${b}${digits}`
}

function buildReconciliation(seed: number, procurement: ProcurementItem[]): ReconciliationRow[] {
  const pool = procurement.length > 0 ? procurement : []
  const rowCount = 2 + (seed % 3)
  const rows: ReconciliationRow[] = []
  for (let i = 0; i < rowCount; i += 1) {
    const source = pick(pool, seed, i)
    const name = source?.name ?? `Staged Item ${i + 1}`
    const planned = 4 + ((seed + i * 5) % 12)
    const variant = (seed + i * 7) % 5
    let actual = planned
    let status: ReconciliationStatus = 'Matched'
    let justification = ''
    if (variant === 1) {
      actual = Math.max(0, planned - (1 + (i % 3)))
      status = 'Short'
    } else if (variant === 2) {
      actual = planned + (1 + (i % 2))
      status = 'Pahabol'
      justification = ''
    }
    rows.push({
      id: `${name}-${i}`,
      itemName: name,
      planned,
      actual,
      status,
      justification,
    })
  }
  return rows
}

function buildBatches(event: PortalEvent, procurement: ProcurementItem[], crewPool: Staff[]): DispatchBatch[] {
  const seed = hashOf(event.refId)
  const batchCount = seed % 4 // 0–3 batches; some events have none yet
  const batches: DispatchBatch[] = []
  for (let i = 0; i < batchCount; i += 1) {
    const batchSeed = seed + i * 97
    const direction: BatchDirection = i % 3 === 2 ? 'return' : 'outbound'
    const sequence = stageSequenceFor(direction)
    const stage = sequence[Math.min(sequence.length - 1, (batchSeed >> 2) % sequence.length)]
    const crewA = pick(crewPool, batchSeed, 0)
    const crewB = pick(crewPool, batchSeed, 1)
    const crew: BatchCrewMember[] = [crewA, crewB]
      .filter((member): member is Staff => Boolean(member))
      .filter((member, index, arr) => arr.findIndex((m) => m.id === member.id) === index)
      .map((member) => ({ id: member.id, name: `${member.firstName} ${member.surname}` }))

    batches.push({
      id: `${event.id}-batch-${i}`,
      vehicleType: VEHICLE_TYPES[batchSeed % VEHICLE_TYPES.length],
      plateNumber: plateFor(batchSeed),
      direction,
      stage,
      handoffNote: '',
      crew,
      reconciliation: buildReconciliation(batchSeed, procurement),
      stalled: false,
      stalledReason: '',
    })
  }
  return batches
}

// Exported so callers holding *live* batch state (e.g. the shared dispatch
// store, once a stage advance or a Stalled mark has mutated it) can
// recompute the banner from the current batches instead of the one-time
// snapshot derived here.
export function dispatchBannerFor(batches: DispatchBatch[]): DispatchBannerState {
  if (batches.length === 0) return 'No Dispatch Yet'
  const anyShortOrPahabol = batches.some((batch) =>
    batch.reconciliation.some((row) => row.status !== 'Matched'),
  )
  const anyStuck = batches.some((batch) => batch.stage === 'In Transit' && anyShortOrPahabol)
  const anyStalled = batches.some((batch) => batch.stalled)
  if (anyStalled) return 'Stalled In Transit — Needs Attention'
  if (anyStuck) return 'Delayed Dispatch'
  return 'Dispatch In Progress'
}

export function getEventDetailSnapshot(
  event: PortalEvent,
  staff: Staff[],
  procurement: ProcurementItem[],
): EventDetailSnapshot {
  const seed = hashOf(event.refId)
  const fieldCrew = staff.filter((member) => member.role === 'Field & Production Crew')

  // Manning / crew panel — some events intentionally have none assigned yet.
  const crewCount = fieldCrew.length === 0 ? 0 : (seed % 4 === 0 ? 0 : 1 + (seed % fieldCrew.length))
  const crewStatuses: CrewAssignmentStatus[] = ['Confirmed', 'Confirmed', 'Pending', 'Unavailable']
  const crew: EventCrewAssignment[] = fieldCrew.slice(0, crewCount).map((member, index) => ({
    id: member.id,
    name: `${member.firstName} ${member.surname}`,
    role: member.role,
    status: crewStatuses[(seed + index * 3) % crewStatuses.length],
  }))

  // Items / assets panel
  const itemCount = 2 + (seed % 4)
  const itemStatuses: AllocatedItemStatus[] = ['Reserved', 'Packed', 'Packed', 'Short']
  const items: EventAllocatedItem[] = Array.from({ length: itemCount }, (_, index) => {
    const source = pick(procurement, seed, index)
    return {
      id: `${event.id}-item-${index}`,
      name: source?.name ?? `Allocation Item ${index + 1}`,
      quantity: 2 + ((seed + index * 6) % 18),
      unit: source?.unit ?? 'pcs',
      status: itemStatuses[(seed + index * 5) % itemStatuses.length],
    }
  })

  // Replenishment status panel
  const resolved = seed % 5
  const pending = (seed >> 2) % 3
  const critical = (seed >> 4) % 2
  const replenishment: EventReplenishmentSummary = { resolved, pending, critical }

  // Logistics / dispatch panel
  const batches = buildBatches(event, procurement, fieldCrew)
  const dispatchBanner = dispatchBannerFor(batches)
  const anyBatchStalled = batches.some((batch) => batch.stalled)

  const overallStatus: EventOverallStatus =
    anyBatchStalled || critical > 0 || event.status === 'Cancelled'
      ? 'Blocked'
      : pending > 0 || event.status === 'On Hold' || dispatchBanner === 'Delayed Dispatch'
        ? 'Attention Needed'
        : 'On Track'

  const changedSinceLastView = seed % 4 === 1

  return {
    overallStatus,
    changedSinceLastView,
    editedFields: changedSinceLastView ? deriveEditedFields(event, seed) : [],
    crew,
    items,
    replenishment,
    dispatch: { banner: dispatchBanner, batches },
  }
}

// Production / Bespoke panel — the banner is a pure function of the real
// ProductionItem stages for this event (scoped by the caller via eventId),
// never a synthetic/cached value. Recompute whenever the item list changes.
export function computeProductionBanner(items: ProductionItem[]): ProductionBannerState {
  if (items.length === 0 || items.every((item) => item.stage === 'Unprepped')) return 'Not Started'
  if (items.every((item) => item.stage === 'Ready')) return 'Ready'
  return 'In Production'
}

// The Items/Assets panel's allocation rows are event-scoped procurement
// derivations, not references to a specific Asset Catalog entry — there is
// no shared id between the two. To open the real AssetDetailModal for a row
// we resolve the closest matching catalog asset by name, falling back to a
// deterministic (not random) pick so the same row always opens the same
// asset across renders.
export function resolveCatalogAssetForItem(item: EventAllocatedItem): CatalogAsset {
  const catalog = getCatalogAssets()
  const byName = catalog.find((asset) => asset.name.toLowerCase() === item.name.toLowerCase())
  if (byName) return byName
  const seed = hashOf(item.id)
  return catalog[seed % catalog.length]
}
