// Mutable warehouse-wide dispatch store for the Dispatch & Logistics module.
// Seeds itself from the same deterministic batch/reconciliation derivation
// used by the Event Detail View (`event-detail.ts`), then holds its own
// in-memory state so stage advances, new batches, and reconciliation edits
// made from this module persist across the 3-level drilldown.
import { useSyncExternalStore } from 'react'
import type { PortalEvent, ProcurementItem, Staff } from '@/lib/types'
import {
  getEventDetailSnapshot,
  nextStage,
  stageSequenceFor,
  type BatchDirection,
  type BatchStage,
  type DispatchBatch,
  type ReconciliationRow,
} from '@/lib/event-detail'

export interface EventDispatchSummary {
  eventId: string
  eventTitle: string
  venue: string
  targetDate: string
  batches: DispatchBatch[]
  handshakePercent: number
  hasPahabol: boolean
  hasStalled: boolean
}

function hashOf(value: string) {
  return Math.abs(value.split('').reduce((sum, char) => sum + char.charCodeAt(0) * 31, 7))
}

function computeHandshake(batches: DispatchBatch[]): { percent: number; hasPahabol: boolean } {
  const rows = batches.flatMap((batch) => batch.reconciliation)
  if (rows.length === 0) return { percent: 100, hasPahabol: false }
  const matched = rows.filter((row) => row.status === 'Matched').length
  const hasPahabol = rows.some((row) => row.status === 'Pahabol')
  return { percent: Math.round((matched / rows.length) * 100), hasPahabol }
}

const listeners = new Set<() => void>()
const storeKey = '__warehouse_dispatch_store__'
type DispatchGlobal = typeof globalThis & { [storeKey]?: Map<string, DispatchBatch[]> }
const globalStore = globalThis as DispatchGlobal
let batchesByEvent: Map<string, DispatchBatch[]> = globalStore[storeKey] ?? new Map()

// The snapshot handed to `useSyncExternalStore` is the Map itself, so every
// mutation has to swap in a *new* Map — otherwise the reference never
// changes, React bails out of the re-render, and stage advances / new
// batches silently never reach the screen.
function publish() {
  batchesByEvent = new Map(batchesByEvent)
  globalStore[storeKey] = batchesByEvent
  listeners.forEach((listener) => listener())
}

function ensureSeeded(events: PortalEvent[], staff: Staff[], procurement: ProcurementItem[]) {
  events.forEach((event) => {
    const existingBatches = batchesByEvent.get(event.id)
    const seededBatches = existingBatches ?? getEventDetailSnapshot(event, staff, procurement).dispatch.batches

    if (!existingBatches) {
      batchesByEvent.set(event.id, seededBatches)
    }
  })
}

export function useDispatchStore(events: PortalEvent[], staff: Staff[], procurement: ProcurementItem[]) {
  ensureSeeded(events, staff, procurement)
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => batchesByEvent,
    () => batchesByEvent,
  )
}

export function getEventDispatchSummaries(
  events: PortalEvent[],
  staff: Staff[],
  procurement: ProcurementItem[],
): EventDispatchSummary[] {
  ensureSeeded(events, staff, procurement)
  return events.map((event) => {
    const batches = batchesByEvent.get(event.id) ?? []
    const { percent, hasPahabol } = computeHandshake(batches)
    return {
      eventId: event.id,
      eventTitle: event.title,
      venue: event.venue,
      targetDate: event.targetDate,
      batches,
      handshakePercent: percent,
      hasPahabol,
      hasStalled: batches.some((batch) => batch.stalled),
    }
  })
}

// ---------- Dispatch activity log ----------
// Every stage transition and batch creation is recorded so the header
// notification drawer and the logs view have a real feed to read from.

export interface DispatchActivityEntry {
  id: string
  timestamp: string
  message: string
  tone: 'info' | 'success' | 'warning'
}

const activityKey = '__warehouse_dispatch_activity__'
type ActivityGlobal = typeof globalThis & { [activityKey]?: DispatchActivityEntry[] }
const activityGlobal = globalThis as ActivityGlobal
let activity: DispatchActivityEntry[] = activityGlobal[activityKey] ?? []

function logActivity(message: string, tone: DispatchActivityEntry['tone']) {
  activity = [
    { id: `act-${Date.now()}-${activity.length}`, timestamp: new Date().toISOString(), message, tone },
    ...activity,
  ].slice(0, 40)
  activityGlobal[activityKey] = activity
}

export function getDispatchActivity(): DispatchActivityEntry[] {
  return activity
}

export function advanceBatchStage(eventId: string, batchId: string): boolean {
  const batches = batchesByEvent.get(eventId)
  if (!batches) return false
  const target = batches.find((batch) => batch.id === batchId)
  if (!target) return false
  // Handoff note is required before a Planned outbound batch can leave the
  // warehouse. This store-level guard mirrors the UI-level validation in
  // BatchDetailView so no call-site can bypass it.
  if (target.direction === 'outbound' && target.stage === 'Planned' && !target.handoffNote.trim()) {
    return false
  }
  const stage = nextStage(target.direction, target.stage)
  const updated = batches.map((batch) => (batch.id === batchId ? { ...batch, stage } : batch))
  batchesByEvent.set(eventId, updated)
  logActivity(
    `${target.vehicleType} (${target.plateNumber}) marked as ${stage}.`,
    stage === 'Delivered' || stage === 'Returned' ? 'success' : 'info',
  )
  publish()
  return true
}

// Stalled In Transit — set by whichever crew member is executing the
// checkpoint (Ground Crew's Chain of Custody screen) when a vehicle breaks
// down or a batch is otherwise interrupted mid-leg. The batch's `stage` is
// left untouched so it resumes from exactly where it stopped once resolved.
export function markBatchStalled(eventId: string, batchId: string, reason: string) {
  const batches = batchesByEvent.get(eventId)
  if (!batches) return
  const target = batches.find((batch) => batch.id === batchId)
  if (!target) return
  const updated = batches.map((batch) =>
    batch.id === batchId ? { ...batch, stalled: true, stalledReason: reason } : batch,
  )
  batchesByEvent.set(eventId, updated)
  logActivity(
    `${target.vehicleType} (${target.plateNumber}) stalled in transit — ${reason || 'no reason given'}.`,
    'warning',
  )
  publish()
}

export function resolveBatchStall(eventId: string, batchId: string) {
  const batches = batchesByEvent.get(eventId)
  if (!batches) return
  const target = batches.find((batch) => batch.id === batchId)
  if (!target) return
  const updated = batches.map((batch) =>
    batch.id === batchId ? { ...batch, stalled: false, stalledReason: '' } : batch,
  )
  batchesByEvent.set(eventId, updated)
  logActivity(`${target.vehicleType} (${target.plateNumber}) resumed transit after a stall.`, 'info')
  publish()
}

export function updateBatchHandoffNote(eventId: string, batchId: string, handoffNote: string) {
  const batches = batchesByEvent.get(eventId)
  if (!batches) return
  batchesByEvent.set(
    eventId,
    batches.map((batch) => (batch.id === batchId ? { ...batch, handoffNote } : batch)),
  )
  publish()
}

export function updateReconciliationRow(
  eventId: string,
  batchId: string,
  rowId: string,
  changes: Partial<ReconciliationRow>,
) {
  const batches = batchesByEvent.get(eventId)
  if (!batches) return
  const updated = batches.map((batch) =>
    batch.id === batchId
      ? { ...batch, reconciliation: batch.reconciliation.map((row) => (row.id === rowId ? { ...row, ...changes } : row)) }
      : batch,
  )
  batchesByEvent.set(eventId, updated)
  publish()
}

const VEHICLE_TYPES = ['Truck Alpha (6-Ton)', 'Van Beta (Transit)', 'Truck Gamma (4-Ton)', 'Van Delta (Transit)']

function plateFor(seed: number) {
  const letters = 'ABCDEFGHJKLMN'
  const a = letters[seed % letters.length]
  const b = letters[(seed >> 3) % letters.length]
  const digits = String(((seed * 37) % 9000) + 1000)
  return `${a}${b}${digits}`
}

export function addNewBatch(eventId: string, direction: BatchDirection, procurement: ProcurementItem[]) {
  const batches = batchesByEvent.get(eventId) ?? []
  const seed = hashOf(`${eventId}-${Date.now()}`)
  const sequence = stageSequenceFor(direction)
  const rowCount = 2 + (seed % 3)
  const reconciliation: ReconciliationRow[] = Array.from({ length: rowCount }, (_, i) => {
    const source = procurement[(seed + i * 5) % Math.max(1, procurement.length)]
    const planned = 4 + ((seed + i * 5) % 12)
    return {
      id: `${eventId}-newbatch-${seed}-${i}`,
      itemName: source?.name ?? `Staged Item ${i + 1}`,
      planned,
      actual: planned,
      status: 'Matched',
      justification: '',
    }
  })
  const batch: DispatchBatch = {
    id: `${eventId}-batch-new-${seed}`,
    vehicleType: VEHICLE_TYPES[seed % VEHICLE_TYPES.length],
    plateNumber: plateFor(seed),
    direction,
    stage: sequence[0],
    handoffNote: '',
    crew: [],
    reconciliation,
    stalled: false,
    stalledReason: '',
  }
  batchesByEvent.set(eventId, [batch, ...batches])
  logActivity(
    `New ${direction} batch staged — ${batch.vehicleType} (${batch.plateNumber}), ${reconciliation.length} line items.`,
    'info',
  )
  publish()
  return batch
}

export function buildManifestCsv(summary: EventDispatchSummary): string {
  const header = 'Batch,Vehicle,Plate,Direction,Stage,Item,Planned,Actual,Status\n'
  const rows = summary.batches
    .flatMap((batch) =>
      batch.reconciliation.map(
        (row) =>
          `"${batch.id}","${batch.vehicleType}","${batch.plateNumber}","${batch.direction}","${batch.stage}","${row.itemName}","${row.planned}","${row.actual}","${row.status}"`,
      ),
    )
    .join('\n')
  return header + rows
}

export function buildConsolidatedManifestCsv(summaries: EventDispatchSummary[]): string {
  const header = 'Event,Batch,Vehicle,Plate,Direction,Stage,Item,Planned,Actual,Status\n'
  const rows = summaries
    .flatMap((summary) =>
      summary.batches.flatMap((batch) =>
        batch.reconciliation.map(
          (row) =>
            `"${summary.eventTitle}","${batch.id}","${batch.vehicleType}","${batch.plateNumber}","${batch.direction}","${batch.stage}","${row.itemName}","${row.planned}","${row.actual}","${row.status}"`,
        ),
      ),
    )
    .join('\n')
  return header + rows
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export type { BatchDirection, BatchStage, DispatchBatch, ReconciliationRow }
export { stageSequenceFor }
