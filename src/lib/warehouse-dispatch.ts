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

import { supabase } from '@/lib/supabase'

const listeners = new Set<() => void>()
const storeKey = '__warehouse_dispatch_store__'
type DispatchGlobal = typeof globalThis & { [storeKey]?: Map<string, DispatchBatch[]> }
const globalStore = globalThis as DispatchGlobal
let batchesByEvent: Map<string, DispatchBatch[]> = globalStore[storeKey] ?? new Map()

export async function persistBatchToSupabase(eventId: string, batch: DispatchBatch) {
  try {
    await supabase.from('manning_dispatch_batches').upsert({
      id: batch.id,
      event_id: eventId,
      vehicle_type: batch.vehicleType,
      plate_number: batch.plateNumber,
      driver_name: batch.driverName || null,
      direction: batch.direction,
      stage: batch.stage,
      handoff_note: batch.handoffNote,
      crew: batch.crew,
      reconciliation: batch.reconciliation,
      stalled: batch.stalled,
      stalled_reason: batch.stalledReason,
      updated_at: new Date().toISOString(),
    })
  } catch (e) {
    console.warn('[v0] Supabase dispatch batch persist fallback to local store.', e)
  }
}

function publish(targetEventId?: string, targetBatch?: DispatchBatch) {
  batchesByEvent = new Map(batchesByEvent)
  globalStore[storeKey] = batchesByEvent
  listeners.forEach((listener) => listener())

  if (targetEventId && targetBatch) {
    persistBatchToSupabase(targetEventId, targetBatch)
  }
}

export function deleteBatch(eventId: string, batchId: string) {
  const batches = batchesByEvent.get(eventId)
  if (!batches) return
  const updated = batches.filter((b) => b.id !== batchId)
  batchesByEvent.set(eventId, updated)
  logActivity(`Dispatch batch ${batchId} was canceled / deleted.`, 'info')
  publish()

  try {
    supabase.from('manning_dispatch_batches').delete().eq('id', batchId).catch(() => {})
  } catch (e) {
    console.warn('[v0] Supabase delete batch fallback to local store.', e)
  }
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

export function updateBatchInfo(
  eventId: string,
  batchId: string,
  info: Partial<Pick<DispatchBatch, 'vehicleType' | 'plateNumber' | 'driverName'>>,
) {
  const batches = batchesByEvent.get(eventId)
  if (!batches) return
  const updated = batches.map((batch) => (batch.id === batchId ? { ...batch, ...info } : batch))
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
    driverName: 'Assigned Driver',
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

export function addNewCustomBatch(
  eventId: string,
  direction: BatchDirection,
  vehicleType: string,
  plateNumber: string,
  driverName: string,
  items: { itemName: string; planned: number }[],
): DispatchBatch {
  const batches = batchesByEvent.get(eventId) ?? []
  const seed = Date.now()
  const sequence = stageSequenceFor(direction)
  const reconciliation: ReconciliationRow[] = items.map((item, idx) => ({
    id: `${eventId}-custom-${seed}-${idx}`,
    itemName: item.itemName,
    planned: item.planned,
    actual: item.planned,
    status: 'Matched',
    justification: '',
  }))

  const batch: DispatchBatch = {
    id: `${eventId}-batch-${seed}`,
    vehicleType: vehicleType || 'Box Truck (14ft)',
    plateNumber: plateNumber || 'NBC 1234',
    driverName: driverName || '',
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
    `New ${direction} batch staged — ${batch.vehicleType} (${batch.plateNumber}), ${reconciliation.length} items. Driver: ${driverName || 'N/A'}.`,
    'info',
  )
  publish()
  return batch
}

export function createReturnBatchFromDelivered(eventId: string, outboundBatch: DispatchBatch): DispatchBatch {
  const batches = batchesByEvent.get(eventId) ?? []
  const seed = Date.now()
  const returnItems: ReconciliationRow[] = outboundBatch.reconciliation.map((item, idx) => ({
    id: `${eventId}-return-${seed}-${idx}`,
    itemName: item.itemName,
    planned: item.actual || item.planned,
    actual: item.actual || item.planned,
    status: 'Matched',
    justification: '',
  }))

  const returnBatch: DispatchBatch = {
    id: `${eventId}-batch-return-${seed}`,
    vehicleType: outboundBatch.vehicleType,
    plateNumber: outboundBatch.plateNumber,
    driverName: outboundBatch.driverName,
    direction: 'return',
    stage: 'Planned',
    handoffNote: `Automatic Ingress created from delivered outbound batch ${outboundBatch.plateNumber}`,
    crew: outboundBatch.crew,
    reconciliation: returnItems,
    stalled: false,
    stalledReason: '',
  }

  batchesByEvent.set(eventId, [returnBatch, ...batches])
  logActivity(
    `Automatic Ingress Return Batch staged for ${outboundBatch.vehicleType} (${outboundBatch.plateNumber}).`,
    'success',
  )
  publish()
  return returnBatch
}

import jsPDF from 'jspdf'

export function exportBatchPdf(eventInfo: { eventTitle: string; venue: string; targetDate: string }, batch: DispatchBatch) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 40
  let y = margin

  // Header Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(30, 41, 59)
  doc.text('LUMIÈRE OPERATIONS — DISPATCH MANIFEST', margin, y)
  y += 24

  // Event Details Box
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  doc.text(`EVENT: ${eventInfo.eventTitle.toUpperCase()}`, margin, y)
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.text(`Venue: ${eventInfo.venue}   |   Target Date: ${eventInfo.targetDate}`, margin, y)
  y += 20

  // Separator Line
  doc.setLineWidth(1)
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, 612 - margin, y)
  y += 20

  // Vehicle & Dispatch Details
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text('VEHICLE & FLEET INFO', margin, y)
  y += 16

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Vehicle: ${batch.vehicleType}   |   Plate #: ${batch.plateNumber}`, margin, y)
  y += 14
  doc.text(
    `Driver: ${batch.driverName || 'Unassigned'}   |   Direction: ${batch.direction.toUpperCase()}   |   Stage: ${batch.stage}`,
    margin,
    y,
  )
  y += 14
  if (batch.crew.length > 0) {
    doc.text(`Escort Crew: ${batch.crew.map((c) => c.name).join(', ')}`, margin, y)
    y += 14
  }
  if (batch.handoffNote) {
    doc.text(`Handoff Note: ${batch.handoffNote}`, margin, y)
    y += 14
  }
  y += 15

  // Table Headers
  doc.setFillColor(241, 245, 249)
  doc.rect(margin, y, 612 - margin * 2, 20, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  doc.text('ITEM NAME', margin + 10, y + 14)
  doc.text('PLANNED', margin + 280, y + 14)
  doc.text('ACTUAL', margin + 370, y + 14)
  doc.text('STATUS', margin + 460, y + 14)
  y += 24

  // Table Rows
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  batch.reconciliation.forEach((item, idx) => {
    if (y > 720) {
      doc.addPage()
      y = margin
    }
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252)
      doc.rect(margin, y - 10, 612 - margin * 2, 18, 'F')
    }
    doc.text(item.itemName.slice(0, 45), margin + 10, y)
    doc.text(String(item.planned), margin + 280, y)
    doc.text(String(item.actual), margin + 370, y)
    doc.text(item.status, margin + 460, y)
    y += 18
  })

  // Footer Signatures
  y = Math.max(y + 35, 680)
  doc.setLineWidth(0.5)
  doc.setDrawColor(203, 213, 225)
  doc.line(margin, y, margin + 200, y)
  doc.line(612 - margin - 200, y, 612 - margin, y)
  y += 12
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Dispatch Lead Signature', margin, y)
  doc.text('Driver / Recipient Signature', 612 - margin - 200, y)

  const filename = `Manifest_${batch.plateNumber.replace(/\s+/g, '_')}_${batch.id.slice(-6)}.pdf`
  doc.save(filename)
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
