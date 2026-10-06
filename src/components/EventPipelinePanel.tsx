import { useEffect, useState } from 'react'
import {
  Check,
  FileText,
  PenTool,
  PackageCheck,
  ListChecks,
  Square,
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  Users,
} from 'lucide-react'
import { usePlanner, type PipelineEvent } from '@/lib/planner'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { PartialEgressSection } from '@/components/warehouse/PartialEgressSection'
import { fetchCanvasAccessApi, type CanvasCollaboratorDto } from '@/features/canvas/api/canvasApi'
import type { PortalEvent } from '@/lib/types'

const PIPELINE_STEPS = [
  { step: '01', label: 'Initialization', state: 'complete' },
  { step: '02', label: 'Canvas Design', state: 'complete' },
  { step: '03', label: 'Allocation', state: 'current' },
  { step: '04', label: 'Approval', state: 'pending' },
  { step: '05', label: 'Preparation', state: 'pending' },
  { step: '06', label: 'Dispatch', state: 'pending' },
  { step: '07', label: 'Settlement', state: 'pending' },
]

// Shared Event Pipeline content — the "Logistical Overview / Material Requirement / Design
// Documents / Team Assignments" data — reused by both the full-page EventDetailPage and the
// in-workspace drawer opened from the Design Canvas / Creative Workspace.

type Tab = 'overview' | 'materials' | 'documents' | 'team'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Logistical Overview' },
  { key: 'materials', label: 'Material Requirement' },
  { key: 'documents', label: 'Design Documents' },
  { key: 'team', label: 'Canvas Collaborators' },
]

function ReadField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </label>
      <input
        defaultValue={value}
        readOnly
        className="mt-2 w-full cursor-default rounded-md border border-input bg-muted/40 px-3 py-2.5 text-sm text-card-foreground outline-none"
      />
    </div>
  )
}

export function EventPipelinePanel({
  event,
  adminName,
  onOpenCanvas,
  onTabChange,
  compact = false,
}: {
  event: PortalEvent | PipelineEvent
  adminName: string
  /** When provided, empty-state CTAs ("Open Design Canvas") are shown. Omit when the panel is
   *  already being viewed from within the Design Canvas — there's nothing to route to. */
  onOpenCanvas?: () => void
  /** Notified whenever the active tab changes, so a host page can react (e.g. auto-provision a
   *  design the first time the Materials tab is opened). */
  onTabChange?: (tab: Tab) => void
  /** Tighter spacing/typography for the in-workspace drawer. */
  compact?: boolean
}) {
  const { eventMaterials, eventChecklist, eventDocuments } = usePlanner()
  const { damageExceptions, events: portalEvents, settleEvent, partialEgressesByEvent } = usePortal()
  const { navigate } = useNav()
  const materials = eventMaterials[event.id] ?? []
  const checklist = eventChecklist[event.id] ?? []
  const committedDocs = eventDocuments[event.id] ?? []

  const [tab, setTab] = useState<Tab>(materials.length > 0 ? 'materials' : 'overview')
  const [verified, setVerified] = useState<Record<string, boolean>>({})
  const [collaborators, setCollaborators] = useState<CanvasCollaboratorDto[]>([])

  useEffect(() => {
    if (event?.id) {
      fetchCanvasAccessApi(event.id).then(setCollaborators).catch(() => {})
    }
  }, [event?.id])

  // Find bound damage exceptions for this event
  const boundExceptions = damageExceptions.filter(
    (d) => d.boundEvent === event.title || d.boundEvent === event.id || d.boundEvent.includes(event.title)
  )
  const blockingExceptions = boundExceptions.filter(
    (d) =>
      d.declarationState === 'Reviewable' ||
      d.status === 'Pending Verdict' ||
      d.status === 'Held for Audit' ||
      d.status === 'Pending Second Sign-off'
  )
  const portalMatch = portalEvents.find((e) => e.id === event.id || e.title === event.title)
  const isSettled = event.status === 'Settled' || portalMatch?.status === 'Settled'
  const targetEventId = portalMatch?.id || event.id
  const currentEgress = partialEgressesByEvent[targetEventId] || partialEgressesByEvent[event.id]
  const isEgressBlocking = currentEgress && currentEgress.state === 'Pending Completion'

  const verifiedCount = checklist.filter((c) => verified[c.id]).length

  function changeTab(next: Tab) {
    setTab(next)
    onTabChange?.(next)
  }

  const gap = compact ? 'mt-4' : 'mt-6'

  return (
    <div>
      {/* Tabs */}
      <div className={cn('flex gap-1 overflow-x-auto border-b border-border', compact && 'text-[0.55rem]')}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => changeTab(t.key)}
            aria-current={tab === t.key ? 'page' : undefined}
            className={cn(
              'shrink-0 border-b-2 py-3 font-bold uppercase tracking-[0.14em] transition',
              compact ? 'px-2.5 text-[0.55rem]' : 'px-4 text-[0.6rem]',
              tab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className={gap}>
          <div className={cn('flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between', compact && 'p-3')}>
            <div className="flex items-center gap-3">
              <span className="flex size-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">
                  Active Operational Pipeline
                </p>
                <p className="text-xs text-muted-foreground">
                  Synchronized with logistics, creative planning, and warehouse manifests.
                </p>
              </div>
            </div>
            <span className="shrink-0 self-start rounded border border-border bg-card px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground sm:self-auto">
              ID: {(event as any).refId || (event as any).recordId || 'N/A'}
            </span>
          </div>

          <section className={cn('rounded-xl border border-border bg-card', compact ? 'mt-4 p-4' : 'mt-6 p-6')}>
            <div className="flex items-center justify-between">
              <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-card-foreground">
                Core Event Metadata
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-emerald-700">
                <Check className="size-3" /> Confirmed
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <ReadField label="Event Name / Title" value={event.title} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadField label="Client Account" value={event.client || 'Corporate Client'} />
                <ReadField label="Account Registration" value={`CLT-${((event as any).refId || (event as any).recordId || '0000').slice(-4)}`} />
              </div>
              <ReadField label="Venue Selection Directive" value={event.venue || 'Venue Pending'} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadField label="Target Event Date" value={(event as any).targetDate || (event as any).galaDate || (event as any).date || 'TBD'} />
                <ReadField label="Event Reference ID" value={(event as any).refId || (event as any).recordId || 'N/A'} />
              </div>
              <ReadField label="Assigned Master Event Planner" value={`${adminName || 'Lumière Creatives'} — Event Planner`} className="sm:max-w-md" />
            </div>
          </section>

          <section className={cn('rounded-xl border border-border bg-card', compact ? 'mt-4 p-4' : 'mt-6 p-6')}>
            <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-card-foreground">
              Production Pipeline Milestones
            </h2>
            <div className={cn('mt-5 grid grid-cols-2 gap-2', compact ? 'sm:grid-cols-2' : 'sm:grid-cols-4 lg:grid-cols-7')}>
              {PIPELINE_STEPS.map((step) => (
                <div
                  key={step.label}
                  className={cn(
                    'rounded-lg border px-3 py-3',
                    step.state === 'current'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : step.state === 'complete'
                        ? 'border-border bg-muted/50 text-card-foreground'
                        : 'border-dashed border-border bg-card text-muted-foreground',
                  )}
                >
                  <p className="text-[0.5rem] font-bold uppercase tracking-[0.12em] opacity-80">
                    {step.state === 'complete' ? '✓ Complete' : step.state === 'current' ? '● Current' : 'Upcoming'}
                  </p>
                  <p className="mt-1.5 text-[0.7rem] font-semibold">{step.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Post-Event Partial Egress Accountability Section */}
          <PartialEgressSection
            eventId={targetEventId}
            eventTitle={event.title}
            isSettled={isSettled}
            className="mt-6"
            onNavigateToDamage={() => navigate('logs')}
          />

          {/* Event Settlement Enforcement Section */}
          <section className="mt-6 rounded-xl border border-border bg-card p-6">
            <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-card-foreground">
              Event Settlement & Ledger Closure
            </h2>

            {isSettled ? (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Event Settled · Terminal State</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    This event has been fully settled and closed. All bound damage exceptions are resolved and ledger entries are locked.
                  </p>
                </div>
              </div>
            ) : isEgressBlocking ? (
              <div className="mt-4 flex flex-col gap-4 rounded-lg border border-amber-300 bg-amber-50/90 p-4 sm:flex-row sm:items-center sm:justify-between text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-300 text-sm">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                    Settlement Blocked: Post-Event Egress Accountability Active
                  </div>
                  <p className="mt-1 text-xs text-amber-800 dark:text-amber-400 leading-relaxed max-w-xl">
                    Event settlement cannot proceed. Partial Egress accountability is Pending Completion with{' '}
                    {currentEgress?.outstandingItems?.length ?? 0} outstanding item(s) unverified or unfinalized.
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  title="Settlement blocked by active Partial Egress accountability"
                  className="cursor-not-allowed rounded-md bg-amber-200 px-3.5 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-amber-700 opacity-75"
                >
                  Settle Event
                </button>
              </div>
            ) : blockingExceptions.length > 0 ? (
              <div className="mt-4 flex flex-col gap-4 rounded-lg border border-rose-200 bg-rose-50/80 p-4 sm:flex-row sm:items-center sm:justify-between text-rose-950">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-rose-900 text-sm">
                    <AlertTriangle className="size-4 text-rose-600 shrink-0" />
                    Settlement Blocked ({blockingExceptions.length} Unresolved Exception{blockingExceptions.length === 1 ? '' : 's'})
                  </div>
                  <p className="mt-1 text-xs text-rose-800 leading-relaxed max-w-xl">
                    Event settlement cannot proceed. {blockingExceptions.length} damage report{blockingExceptions.length === 1 ? '' : 's'} ({blockingExceptions.map(b => b.logId).join(', ')}) remain pending verdict or audit sign-off.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('logs')}
                    className="rounded-md border border-rose-300 bg-white px-3.5 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-100 transition"
                  >
                    Review Damage Reports
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Event settlement blocked by unresolved damage reports"
                    className="cursor-not-allowed rounded-md bg-rose-200 px-3.5 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-rose-500 opacity-75"
                  >
                    Settle Event
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-4 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 sm:flex-row sm:items-center sm:justify-between text-emerald-950">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-emerald-900 text-sm">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    Cleared for Settlement
                  </div>
                  <p className="mt-1 text-xs text-emerald-800 leading-relaxed max-w-xl">
                    All bound damage exceptions have been resolved to final verdicts ({boundExceptions.length} resolved). Click to finalize terminal event settlement.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const targetId = portalMatch?.id || event.id || event.title
                    const res = await settleEvent(targetId)
                    if (!res.success) {
                      console.warn(`[EventPipelinePanel] Settle Event failed for "${event.title}": ${res.reason}`)
                    }
                  }}
                  className="shrink-0 rounded-md bg-emerald-600 px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-white hover:bg-emerald-700 transition"
                >
                  Settle Event
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'materials' &&
        (materials.length > 0 ? (
          <div className={cn(gap, 'grid grid-cols-1 gap-6', !compact && 'lg:grid-cols-5')}>
            <section className={cn(!compact && 'lg:col-span-3')}>
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-card-foreground">
                  <PackageCheck className="size-4 text-primary" />
                  Material Requirements
                </h2>
                <span className="rounded border border-border bg-muted px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {materials.length} Line{materials.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-4 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left">
                  <thead className="bg-muted/50">
                    <tr className="text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground">
                      <th className="px-4 py-2.5 font-semibold">Asset</th>
                      <th className="px-4 py-2.5 font-semibold">SKU</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m) => (
                      <tr key={m.sku} className="border-t border-border bg-card text-card-foreground">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="size-9 shrink-0 overflow-hidden rounded-md bg-muted">
                              <img src={m.image || '/placeholder.svg'} alt={m.name} className="size-full object-cover" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{m.name}</p>
                              <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">{m.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[0.65rem] text-muted-foreground">{m.sku}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">{m.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={cn(!compact && 'lg:col-span-2')}>
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-card-foreground">
                  <ListChecks className="size-4 text-primary" />
                  Warehouse Checklist
                </h2>
                <span className={cn('rounded px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.1em]', verifiedCount === checklist.length ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}>
                  {verifiedCount}/{checklist.length} Verified
                </span>
              </div>
              <div className="mt-4 space-y-2 rounded-xl border border-border bg-card p-3">
                {checklist.map((c) => {
                  const isChecked = Boolean(verified[c.id])
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setVerified((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                      aria-pressed={isChecked}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition',
                        isChecked ? 'border-emerald-300 bg-emerald-50' : 'border-border bg-background hover:border-primary/40',
                      )}
                    >
                      {isChecked ? <CheckSquare className="size-4 shrink-0 text-emerald-600" /> : <Square className="size-4 shrink-0 text-muted-foreground" />}
                      <div className="min-w-0 flex-1">
                        <p className={cn('truncate text-xs font-medium', isChecked ? 'text-emerald-800 line-through' : 'text-card-foreground')}>{c.name}</p>
                        <p className="font-mono text-[0.58rem] uppercase tracking-[0.08em] text-muted-foreground">{c.sku}</p>
                      </div>
                      <span className="shrink-0 text-[0.62rem] font-bold tabular-nums text-muted-foreground">×{c.quantity}</span>
                    </button>
                  )
                })}
                <p className="px-1 pt-1 text-[0.58rem] leading-relaxed text-muted-foreground">
                  Auto-generated for the warehouse team to verify each committed asset against physical stock before logistics hand-off.
                </p>
              </div>
            </section>
          </div>
        ) : (
          <div className={cn(gap, 'flex flex-col items-center justify-center px-4 py-12 text-center')}>
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <FileText className="size-6 text-muted-foreground" />
            </span>
            <h2 className="mt-5 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-foreground">No Material Requirements Yet</h2>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
              A Design Canvas exists for this event but no layout has been committed. Open the canvas, place your décor and inventory, then choose Commit Design to record materials here.
            </p>
            {onOpenCanvas && (
              <button
                type="button"
                onClick={onOpenCanvas}
                className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
              >
                <PenTool className="size-3.5" />
                Open Design Canvas
              </button>
            )}
          </div>
        ))}

      {tab === 'documents' && (
        <div className={gap}>
          {committedDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                <FileText className="size-6 text-muted-foreground" />
              </span>
              <h2 className="mt-5 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-foreground">No Design Documents Yet</h2>
              <p className="mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">
                A design document is created only after the planner commits a Design Canvas for this event. Open the Design Canvas, finalize your layout, then Commit Design to generate the document here.
              </p>
              {onOpenCanvas && (
                <button
                  type="button"
                  onClick={onOpenCanvas}
                  className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
                >
                  <PenTool className="size-3.5" />
                  Open Design Canvas
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {committedDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-4 rounded-xl border border-primary/40 bg-primary/5 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                      <PackageCheck className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-card-foreground">{doc.name}</p>
                      <p className="text-[0.65rem] text-muted-foreground">{doc.meta}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {doc.fileUrl ? (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90">
                        <FileText className="size-3.5" />
                        Open PDF
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        PDF Unavailable
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-card px-3 py-2 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-primary">
                      <Check className="size-3.5" />
                      Committed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'team' && (
        <div className={cn(gap, 'space-y-4')}>
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-card-foreground">
              <Users className="size-4 text-primary" />
              Canvas Collaborators &amp; Assigned Personnel
            </h3>
            <span className="rounded border border-border bg-muted px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {1 + collaborators.length} Active Member{1 + collaborators.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className={cn('grid grid-cols-1 gap-3', !compact && 'sm:grid-cols-2 lg:grid-cols-3')}>
            {/* Lead Event Planner */}
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold uppercase tracking-wide text-primary">
                {(adminName || 'EP').slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-card-foreground">{adminName || 'Master Event Planner'}</p>
                <p className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">Lead Event Planner &amp; Creative Owner</p>
                <span className="inline-block mt-1 rounded bg-primary/10 border border-primary/30 px-1.5 py-0.2 text-[0.52rem] font-bold uppercase tracking-wider text-primary">
                  Owner · Full Write
                </span>
              </div>
            </div>

            {/* Canonical Canvas Collaborators */}
            {collaborators.map((c) => {
              const accessBadge =
                c.accessLevel === 'CO_EDIT'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : c.accessLevel === 'COMMENT'
                    ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30'
                    : 'bg-muted text-muted-foreground border-border'
              const accessLabel =
                c.accessLevel === 'CO_EDIT'
                  ? 'Can edit (CO_EDIT)'
                  : c.accessLevel === 'COMMENT'
                    ? 'Can review (COMMENT)'
                    : 'Can view (VIEW)'

              return (
                <div key={c.userId} className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase tracking-wide text-foreground">
                    {c.displayName.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-card-foreground truncate">{c.displayName}</p>
                    <p className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground truncate">{c.role || 'Collaborator'}</p>
                    <span className={cn('inline-block mt-1 rounded border px-1.5 py-0.2 text-[0.52rem] font-bold uppercase tracking-wider', accessBadge)}>
                      {accessLabel}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {collaborators.length === 0 && (
            <p className="text-[0.62rem] text-muted-foreground px-1 italic">
              No additional collaborators have been granted Canvas access for this event yet. Use the Canvas Share tool to invite team members.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
