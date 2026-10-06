import { ArrowLeft, Check, Lock, MapPin, Package } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { DispatchBatch } from '@/lib/event-detail'
import type { MyManningAssignmentDto } from '@/features/manning/api/manningApi'
import type { GroundCrewDeclaration } from '@/lib/ground-crew-declarations'
import { getStageStates, registerGroundCrewStageData } from '@/lib/groundCrewStages'
import { GroundCrewSyncPill } from '@/pages/GroundCrewSyncPill'
import { PwaCard, PwaEmptyState } from '@/components/pwa'

type FieldEvent = { id: string; name: string; date: string; venue: string }
type Asset = { id: string; name: string; sku: string; qty: number; color: string }

export function GroundCrewField({ event, events, assignments, batches, batchesByEvent, declarations, loading, error, isCachedData, isLeadForEvent, scope, onOpenEvent, onBack, onReport }: {
  event: FieldEvent | null
  events: FieldEvent[]
  assignments: MyManningAssignmentDto[]
  batches: DispatchBatch[]
  batchesByEvent: Map<string, DispatchBatch[]>
  declarations: GroundCrewDeclaration[]
  loading: boolean
  error: string | null
  isCachedData: boolean
  isLeadForEvent: (eventId: string) => boolean
  scope: 'Warehouse Crew' | 'Field Crew'
  onOpenEvent: (eventId: string) => void
  onBack: () => void
  onReport: (item: Asset) => void
}) {
  const [section, setSection] = useState<'events' | 'reports'>('events')
  useEffect(() => {
    if (event) registerGroundCrewStageData(event.id, batches)
    for (const item of events) {
      registerGroundCrewStageData(item.id, batchesByEvent.get(item.id) ?? [])
    }
  }, [event, batches, events, batchesByEvent])
  const scopeStages = scope === 'Warehouse Crew' ? ['Dispatch Release', 'Warehouse Return'] : ['Venue Arrival', 'Egress Release']
  const rostered = new Set(assignments.map((assignment) => assignment.eventId))
  const activeEvents = events.filter((item) => rostered.has(item.id))
  const today = new Date().toISOString().slice(0, 10)
  const visibleEvents = activeEvents.filter((item) => item.date >= today)
  const states = event ? getStageStates(event.id) : []
  const stageSummaryFor = (item: FieldEvent) => {
    const itemBatches = batchesByEvent.get(item.id) ?? []
    if (!itemBatches.length) return 'Not started yet'
    const itemStates = getStageStates(item.id)
    const currentState = itemStates.find((state) => state.status === 'current')
    if (itemStates.every((state) => state.status === 'done')) return 'All stages done'
    if (!currentState) return 'Stage unavailable'
    return `Stage ${itemStates.indexOf(currentState) + 1} of 4 · ${currentState.stage}`
  }
  const current = states.find((state) => state.status === 'current')?.stage
  const assets = batches.flatMap((batch) => batch.reconciliation.map((row) => ({ id: row.id, name: row.itemName, sku: row.id, qty: row.planned, color: 'bg-primary/10' }))).filter((item, index, list) => list.findIndex((candidate) => candidate.name === item.name) === index)

  if (event) return <div className="space-y-4">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"><ArrowLeft className="size-4" /> Field</button>
    <PwaCard title={event.name} subtitle={`${event.venue} • ${event.date}`}>
      <div className="space-y-2">
        {states.map((state, index) => <div key={state.stage} className={`rounded-xl border p-3 ${state.status === 'current' ? 'border-primary bg-primary/10' : state.status === 'done' ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border'}`}>
          <div className="flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-bold">{state.status === 'done' ? <Check className="size-4" /> : index + 1}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{state.stage}</p><p className="text-xs text-muted-foreground">{state.status === 'done' ? 'Done' : state.status === 'current' ? 'Current' : state.status === 'unavailable' ? 'Not available yet' : state.detail || 'Locked'}</p></div>{state.status === 'locked' && <Lock className="size-4 text-muted-foreground" />}</div>
          {state.status === 'current' && !scopeStages.includes(state.stage) && <p className="mt-2 text-xs text-muted-foreground">Not your stage</p>}
          {state.status === 'current' && scopeStages.includes(state.stage) && <div className="mt-3 space-y-2">{assets.length ? assets.map((asset) => <div key={asset.id} className="flex items-center gap-2 rounded-lg bg-muted/40 p-2"><Package className="size-4 text-primary" /><span className="min-w-0 flex-1 text-xs">{asset.name} · {asset.qty}</span><button type="button" onClick={() => onReport(asset)} className="text-xs font-semibold text-destructive">Report damage</button></div>) : <p className="text-xs text-muted-foreground">No assets listed yet.</p>}</div>}
        </div>)}
      </div>
      {current && <div className="mt-3 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">{isLeadForEvent(event.id) ? `Shift lead can confirm ${current} when available.` : 'Waiting for shift lead to confirm.'}</div>}
    </PwaCard>
  </div>

  return <div className="space-y-4">
    <GroundCrewSyncPill assignments={assignments} isCachedData={isCachedData} />
    <div className="grid grid-cols-2 rounded-xl bg-muted p-1"><button type="button" onClick={() => setSection('events')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${section === 'events' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Events</button><button type="button" onClick={() => setSection('reports')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${section === 'reports' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>My reports</button></div>
    {section === 'events' ? loading ? <div className="h-28 animate-pulse rounded-2xl bg-muted" /> : error ? <PwaEmptyState title="Couldn't load. Try again." /> : visibleEvents.length ? visibleEvents.map((item) => <button key={item.id} type="button" onClick={() => onOpenEvent(item.id)} className="w-full text-left"><PwaCard title={item.name} subtitle={`${item.venue} • ${item.date}`}><p className="text-xs font-semibold text-primary">{stageSummaryFor(item)}</p><p className="mt-1 text-xs text-muted-foreground">Your stages: {scopeStages.join(', ')}</p><MapPin className="mt-2 size-4 text-muted-foreground" /></PwaCard></button>) : <PwaEmptyState title="Nothing to do right now" /> : declarations.length ? declarations.map((report) => <PwaCard key={report.id} title={report.item} subtitle={`${report.eventName} • ${new Date(report.submittedAt).toLocaleDateString()}`}><p className="text-xs text-muted-foreground">{report.status}</p></PwaCard>) : <PwaEmptyState title="No reports yet" />}
  </div>
}
