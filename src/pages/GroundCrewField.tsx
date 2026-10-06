import { ArrowLeft, Check, Lock, MapPin, Package, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { DispatchBatch } from '@/lib/event-detail'
import type { MyManningAssignmentDto } from '@/features/manning/api/manningApi'
import type { GroundCrewDeclaration } from '@/lib/ground-crew-declarations'
import { getStageStates, registerGroundCrewStageData, type GroundCrewStage } from '@/lib/groundCrewStages'
import { subscribeOfflineSync } from '@/lib/offlineReplay'
import { GroundCrewSyncPill } from '@/pages/GroundCrewSyncPill'
import { PwaCard, PwaEmptyState } from '@/components/pwa'

type FieldEvent = { id: string; name: string; date: string; venue: string }
type Asset = { id: string; name: string; sku: string; qty: number; color: string }
type ItemStatus = 'Not checked' | 'Verified' | 'Missing' | 'Damaged'
type StageRecord = { status: ItemStatus; pending: boolean; missing: number; damaged: number; photo: boolean; noPhoto: boolean }

const demoEnabled = import.meta.env.DEV && typeof window !== 'undefined' && Boolean(new URLSearchParams(window.location.search).get('demo'))

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
  onReport: (item: Asset, quantity: number, onSubmitted: (noPhoto: boolean) => void, onCancelled: () => void) => void
}) {
  const [section, setSection] = useState<'events' | 'reports'>('events')
  const [activeStage, setActiveStage] = useState<GroundCrewStage | null>(null)
  const [itemRecords, setItemRecords] = useState<Record<string, StageRecord>>({})
  const [notes, setNotes] = useState('')
  const [reviewedDamage, setReviewedDamage] = useState(false)
  const [completedStages, setCompletedStages] = useState<GroundCrewStage[]>([])
  const [, setOfflineSyncVersion] = useState(0)

  useEffect(() => subscribeOfflineSync(() => setOfflineSyncVersion((version) => version + 1)), [])

  useEffect(() => {
    if (event) registerGroundCrewStageData(event.id, batches)
    for (const item of events) registerGroundCrewStageData(item.id, batchesByEvent.get(item.id) ?? [])
  }, [event, batches, events, batchesByEvent])

  const scopeStages: GroundCrewStage[] = scope === 'Warehouse Crew' ? ['Dispatch Release', 'Warehouse Return'] : ['Venue Arrival', 'Egress Release']
  const rostered = new Set(assignments.map((assignment) => assignment.eventId))
  const activeEvents = events.filter((item) => rostered.has(item.id))
  const today = new Date().toISOString().slice(0, 10)
  const visibleEvents = activeEvents.filter((item) => item.date >= today)
  const states = event ? getStageStates(event.id) : []
  const currentStage = activeStage ?? (states.find((state) => state.status === 'current')?.stage ?? null)
  const currentState = states.find((state) => state.stage === currentStage)
  const isDemo = demoEnabled
  const isLead = event ? isLeadForEvent(event.id) : false
  const assets = useMemo(() => batches.flatMap((batch) => batch.reconciliation.map((row) => ({ id: row.id, name: row.itemName, sku: row.id, qty: row.planned, color: 'bg-primary/10' }))).filter((item, index, list) => list.findIndex((candidate) => candidate.name === item.name) === index), [batches])
  const isDamageReportPending = (asset: Asset) => declarations.some((report) => report.condition === 'Damaged' && report.isOfflineQueued === true && (report.assetId === asset.id || report.item === asset.name))
  const records = assets.reduce<Record<string, StageRecord>>((result, asset, index) => {
    result[asset.id] = itemRecords[asset.id] ?? { status: isDemo && index === 0 ? 'Verified' : 'Not checked', pending: isDemo && index === 0, missing: 0, damaged: 0, photo: false, noPhoto: false }
    return result
  }, {})
  const completedCount = Object.values(records).filter((record) => record.status !== 'Not checked' || record.missing > 0 || record.damaged > 0).length
  const damagedCount = Object.values(records).reduce((sum, record) => sum + record.damaged, 0)
  const allChecked = assets.length > 0 && completedCount === assets.length
  const missingPhoto = Object.values(records).some((record) => record.damaged > 0 && !record.photo && !record.noPhoto)
  const canConfirm = isLead && allChecked && (!damagedCount || reviewedDamage) && !missingPhoto

  const stageSummaryFor = (item: FieldEvent) => {
    const itemBatches = batchesByEvent.get(item.id) ?? []
    if (!itemBatches.length) return 'Not started yet'
    const itemStates = getStageStates(item.id)
    const current = itemStates.find((state) => state.status === 'current')
    if (itemStates.every((state) => state.status === 'done')) return 'All stages done'
    return current ? `Stage ${itemStates.indexOf(current) + 1} of 4 · ${current.stage}` : 'Stage unavailable'
  }

  const updateCounts = (asset: Asset, missing: number, damaged: number, noPhoto = false) => setItemRecords((previous) => ({ ...previous, [asset.id]: { ...(previous[asset.id] ?? { status: 'Not checked', pending: false, photo: false, noPhoto: false }), status: damaged > 0 ? 'Damaged' : missing > 0 ? 'Missing' : 'Verified', missing, damaged, noPhoto, pending: isDemo } }))
  const updatePhoto = (asset: Asset) => setItemRecords((previous) => ({ ...previous, [asset.id]: { ...(previous[asset.id] ?? { status: 'Damaged', pending: false, missing: 0, damaged: 1, noPhoto: false }), photo: true, pending: isDemo } }))
  const openStage = (stage: GroundCrewStage) => {
    setActiveStage(stage)
    setReviewedDamage(false)
  }
  const confirmStage = () => {
    if (!canConfirm || !currentStage) return
    if (isDemo) setCompletedStages((previous) => previous.includes(currentStage) ? previous : [...previous, currentStage])
    setActiveStage(null)
  }

  if (event && activeStage) return <StageScreen event={event} stage={activeStage} stageIndex={scopeStages.indexOf(activeStage) + 1 || 2} assets={assets} records={records} isDamageReportPending={isDamageReportPending} completedCount={completedCount} damagedCount={damagedCount} isLead={isLead} isDemo={isDemo} canConfirm={canConfirm} reviewedDamage={reviewedDamage} notes={notes} onBack={() => setActiveStage(null)} onCheck={(asset) => updateCounts(asset, 0, 0)} onAddPhoto={(asset) => updatePhoto(asset)} onNotes={setNotes} onReview={setReviewedDamage} onConfirm={confirmStage} onCounts={(asset, missing, damaged, noPhoto) => { if (damaged > 0) onReport(asset, damaged, (exceptionalNoPhoto) => setItemRecords((previous) => ({ ...previous, [asset.id]: { ...(previous[asset.id] ?? { status: 'Damaged', pending: false, missing: 0, damaged, photo: false, noPhoto: false }), status: 'Damaged', missing, damaged, photo: !exceptionalNoPhoto, noPhoto: exceptionalNoPhoto, pending: isDemo } })), () => updateCounts(asset, 0, 0, false)); else updateCounts(asset, missing, damaged, noPhoto) }} />

  if (event) return <div className="space-y-4">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"><ArrowLeft className="size-4" /> Field</button>
    <PwaCard title={event.name} subtitle={`${event.venue} • ${event.date}`}>
      <div className="space-y-2">{states.map((state, index) => { const theirs = scopeStages.includes(state.stage); const done = completedStages.includes(state.stage) || state.status === 'done'; return <div key={state.stage} className={`rounded-xl border p-3 ${state.status === 'current' && theirs ? 'border-primary bg-primary/10' : done ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border'}`}>
        <button type="button" disabled={state.status !== 'current' || !theirs} onClick={() => openStage(state.stage)} className="flex w-full items-center gap-2 text-left"><span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-bold">{done ? <Check className="size-4" /> : index + 1}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{state.stage}</span><span className="block text-xs text-muted-foreground">{done ? 'Done' : state.status === 'current' ? theirs ? 'Current · open stage' : 'Not your stage' : state.status === 'unavailable' ? 'Not available yet' : 'Locked'}</span></span>{state.status === 'locked' && <Lock className="size-4 text-muted-foreground" />}</button>
        {state.status === 'current' && !theirs && <p className="mt-2 text-xs text-muted-foreground">Not your stage</p>}
      </div> })}</div>
      {currentState && <div className="mt-3 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">{isLead ? `Shift lead can confirm ${currentState.stage} after the checklist.` : 'Waiting for shift lead to confirm.'}</div>}
    </PwaCard>
  </div>

  return <div className="space-y-4">
    <GroundCrewSyncPill assignments={assignments} isCachedData={isCachedData} />
    <div className="grid grid-cols-2 rounded-xl bg-muted p-1"><button type="button" onClick={() => setSection('events')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${section === 'events' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Events</button><button type="button" onClick={() => setSection('reports')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${section === 'reports' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>My reports</button></div>
    {section === 'events' ? loading ? <div className="h-28 animate-pulse rounded-2xl bg-muted" /> : error ? <PwaEmptyState title="Couldn't load. Try again." /> : visibleEvents.length ? visibleEvents.map((item) => <button key={item.id} type="button" onClick={() => onOpenEvent(item.id)} className="w-full text-left"><PwaCard title={item.name} subtitle={`${item.venue} • ${item.date}`}><p className="text-xs font-semibold text-primary">{stageSummaryFor(item)}</p><p className="mt-1 text-xs text-muted-foreground">Your stages: {scopeStages.join(', ')}</p><MapPin className="mt-2 size-4 text-muted-foreground" /></PwaCard></button>) : <PwaEmptyState title="Nothing to do right now" /> : declarations.length ? declarations.map((report) => <PwaCard key={report.id} title={report.item} subtitle={`${report.eventName} • ${new Date(report.submittedAt).toLocaleDateString()}`}><p className="text-xs text-muted-foreground">{report.status}</p></PwaCard>) : <PwaEmptyState title="No reports yet" />}
  </div>
}

function StageScreen({ event, stage, stageIndex, assets, records, isDamageReportPending, completedCount, damagedCount, isLead, isDemo, canConfirm, reviewedDamage, notes, onBack, onCheck, onAddPhoto, onNotes, onReview, onConfirm, onCounts }: {
  event: FieldEvent; stage: GroundCrewStage; stageIndex: number; assets: Asset[]; records: Record<string, StageRecord>; isDamageReportPending: (asset: Asset) => boolean; completedCount: number; damagedCount: number; isLead: boolean; isDemo: boolean; canConfirm: boolean; reviewedDamage: boolean; notes: string; onBack: () => void; onCheck: (asset: Asset) => void; onAddPhoto: (asset: Asset) => void; onNotes: (value: string) => void; onReview: (value: boolean) => void; onConfirm: () => void; onCounts: (asset: Asset, missing: number, damaged: number, noPhoto: boolean) => void
}) {
  const [editing, setEditing] = useState<{ asset: Asset; kind: 'Missing' | 'Damaged' } | null>(null)
  const [count, setCount] = useState('')
  const [noPhoto, setNoPhoto] = useState(false)
  const saveCount = () => {
    if (!editing) return
    const value = Number(count)
    const current = records[editing.asset.id]
    const missing = editing.kind === 'Missing' ? value : current.missing
    const damaged = editing.kind === 'Damaged' ? value : current.damaged
    if (!Number.isInteger(value) || value < 1 || value > editing.asset.qty || missing + damaged > editing.asset.qty) return
    onCounts(editing.asset, missing, damaged, editing.kind === 'Damaged' ? noPhoto : current.noPhoto)
    setEditing(null)
    setCount('')
    setNoPhoto(false)
  }
  return <div className="space-y-4">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"><ArrowLeft className="size-4" /> Back</button>
    <PwaCard title={stage} subtitle={`Stage ${stageIndex} of 4 · ${event.name} · ${event.venue}`}>
      <div className="space-y-3"><div className="flex items-center justify-between"><p className="text-xs font-semibold">{completedCount} of {assets.length} items checked</p>{!isLead && <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">Not your stage</span>}</div>
        {assets.map((asset) => { const record = records[asset.id]; const ok = Math.max(asset.qty - record.missing - record.damaged, 0); return <div key={asset.id} className="space-y-2 rounded-xl border border-border p-3"><div className="flex items-center gap-2"><Package className="size-4 text-primary" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{asset.name} <span className="font-normal text-muted-foreground">× {asset.qty}</span></p><p className="text-[10px] text-muted-foreground">{record.missing} missing · {record.damaged} damaged · {ok} OK</p>{(isDamageReportPending(asset) || (isDemo && record.pending)) && <p className="text-[10px] text-muted-foreground">Saved on this phone · pending sync</p>}</div><button type="button" aria-label={`Mark ${asset.name} present`} onClick={() => onCheck(asset)} className={`flex size-7 items-center justify-center rounded-md border ${record.status === 'Verified' && !record.missing && !record.damaged ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}><Check className="size-4" /></button></div><div className="flex gap-2"><button type="button" onClick={() => { setEditing({ asset, kind: 'Missing' }); setCount(record.missing ? String(record.missing) : ''); setNoPhoto(false) }} className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold">Missing</button><button type="button" onClick={() => { setEditing({ asset, kind: 'Damaged' }); setCount(record.damaged ? String(record.damaged) : ''); setNoPhoto(record.noPhoto) }} className="rounded-lg border border-amber-500/40 px-2 py-1 text-[10px] font-semibold text-amber-700">Damaged</button>{record.damaged > 0 && <button type="button" onClick={() => onAddPhoto(asset)} className="rounded-lg border border-dashed border-border px-2 py-1 text-[10px] font-semibold">Add photo</button>}</div>{record.damaged > 0 && !record.photo && !record.noPhoto && <p className="text-[10px] text-amber-600">Add a photo of the damage.</p>}</div> })}
        {damagedCount > 0 && <label className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs"><input type="checkbox" checked={reviewedDamage} onChange={(e) => onReview(e.target.checked)} className="mt-0.5" /> I&apos;ve reviewed the reported damage</label>}
        <label className="block text-xs font-semibold">Notes (optional)<textarea value={notes} onChange={(e) => onNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs" placeholder="Add a note for the next crew..." />{isDemo && notes && <span className="text-[10px] text-muted-foreground">Saved on this phone · pending sync</span>}</label>
        {isLead ? <button type="button" disabled={!canConfirm} onClick={onConfirm} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">Confirm {stage}</button> : <div className="rounded-xl bg-muted/50 p-3 text-center text-xs font-semibold text-muted-foreground">Waiting for shift lead to confirm</div>}
      </div>
    </PwaCard>
    {editing && <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-4"><div className="w-full rounded-2xl bg-card p-4 shadow-xl"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">{editing.kind === 'Missing' ? 'How many are missing?' : 'How many are damaged?'}</p><button type="button" onClick={() => setEditing(null)} aria-label="Close"><X className="size-4" /></button></div><input autoFocus type="number" min="1" max={editing.asset.qty} value={count} onChange={(e) => setCount(e.target.value)} className="w-full rounded-xl border border-input bg-background p-3 text-sm" /><p className="mt-2 text-[10px] text-muted-foreground">Enter 1 to {editing.asset.qty}.</p>{Number(count) > editing.asset.qty || Number(count) < 1 || (editing.kind === 'Missing' ? Number(count) + records[editing.asset.id].damaged : Number(count) + records[editing.asset.id].missing) > editing.asset.qty ? <p className="mt-1 text-xs text-destructive">The count must be within the expected quantity.</p> : null}{editing.kind === 'Damaged' && <label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={noPhoto} onChange={(e) => setNoPhoto(e.target.checked)} /> No photo available</label>}<button type="button" onClick={saveCount} className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Save</button></div></div>}
  </div>
}
