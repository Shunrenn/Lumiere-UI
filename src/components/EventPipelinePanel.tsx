import { useState } from 'react'
import {
  Satellite,
  Check,
  FileText,
  PenTool,
  PackageCheck,
  ListChecks,
  Square,
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { usePlanner, type PipelineEvent } from '@/lib/planner'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'

// Shared Event Pipeline content — the "Logistical Overview / Material Requirement / Design
// Documents / Team Assignments" data — reused by both the full-page EventDetailPage and the
// in-workspace drawer opened from the Design Canvas / Creative Workspace. Keeping this as a
// single component means both surfaces read from the same data source (usePlanner) and never
// drift out of sync.

type Tab = 'overview' | 'materials' | 'documents' | 'team'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Logistical Overview' },
  { key: 'materials', label: 'Material Requirement' },
  { key: 'documents', label: 'Design Documents' },
  { key: 'team', label: 'Team Assignments' },
]

const PIPELINE_STEPS = [
  { label: 'Initialization', state: 'complete' as const },
  { label: 'Client Brief', state: 'complete' as const },
  { label: 'Pre-Production', state: 'complete' as const },
  { label: 'Vendor Lock-in', state: 'complete' as const },
  { label: 'Staging Rehearsal', state: 'complete' as const },
  { label: 'Event Day', state: 'complete' as const },
  { label: 'Post-Event Wrap', state: 'current' as const },
]

const TEAM = [
  { name: 'Isabelle Moreau', role: 'Master Event Planner', initials: 'IM' },
  { name: 'Camille Laurent', role: 'Warehouse Manager', initials: 'CL' },
  { name: 'Théo Bernard', role: 'Lead Floral Designer', initials: 'TB' },
  { name: 'Margaux Dubois', role: 'Lighting Director', initials: 'MD' },
  { name: 'Lucas Petit', role: 'Ground Crew Lead', initials: 'LP' },
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
  event: PipelineEvent
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
  const { damageExceptions, events: portalEvents, settleEvent } = usePortal()
  const { navigate } = useNav()
  const materials = eventMaterials[event.id] ?? []
  const checklist = eventChecklist[event.id] ?? []
  const committedDocs = eventDocuments[event.id] ?? []

  const [tab, setTab] = useState<Tab>(materials.length > 0 ? 'materials' : 'overview')
  const [verified, setVerified] = useState<Record<string, boolean>>({})

  // Find bound damage exceptions for this event
  const boundExceptions = damageExceptions.filter(
    (d) => d.boundEvent === event.title || d.boundEvent === event.id || d.boundEvent.includes(event.title)
  )
  const blockingExceptions = boundExceptions.filter(
    (d) => d.status === 'Pending Verdict' || d.status === 'Held for Audit' || d.status === 'Pending Second Sign-off'
  )
  const portalMatch = portalEvents.find((e) => e.id === event.id || e.title === event.title)
  const isSettled = event.status === 'Settled' || portalMatch?.status === 'Settled'

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
          <div className={cn('flex flex-col gap-3 rounded-xl bg-primary text-primary-foreground', compact ? 'px-4 py-4' : 'px-6 py-5 sm:flex-row sm:items-center sm:justify-between')}>
            <div className="flex items-start gap-3">
              <Satellite className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Record Active — Pipeline Broadcasting</p>
                <p className="mt-0.5 text-xs text-primary-foreground/80">
                  All connected team members have been notified. Logistics, creative, and warehouse streams are live.
                </p>
              </div>
            </div>
            <span className="shrink-0 self-start rounded-full bg-primary-foreground/15 px-3 py-1 text-[0.62rem] font-semibold sm:self-auto">
              12 Members Notified
            </span>
          </div>

          <section className={cn('rounded-xl border border-border bg-card', compact ? 'mt-4 p-4' : 'mt-6 p-6')}>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-card-foreground">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[0.6rem] text-primary-foreground">I</span>
                Core Meta-Data
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-emerald-700">
                <Check className="size-3" /> Confirmed
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <ReadField label="Event Name / Title" value={event.title} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadField label="Client Account" value={event.client} />
                <ReadField label="Account Registration" value={`CLT-${event.recordId.slice(-4)}-MCG`} />
              </div>
              <ReadField label="Venue Selection Directive" value={event.venue} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadField label="Target Gala Date" value={event.galaDate} />
                <ReadField label="Event Record ID" value={event.recordId} />
              </div>
              <ReadField label="Assigned Master Event Planner" value={`${adminName} — Event Planner`} className="sm:max-w-md" />
            </div>
          </section>

          <section className={cn('rounded-xl border border-border bg-card', compact ? 'mt-4 p-4' : 'mt-6 p-6')}>
            <h2 className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-card-foreground">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[0.6rem] text-primary-foreground">II</span>
              Production Pipeline Status
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

          {/* Event Settlement Enforcement Section */}
          <section className="mt-6 rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-card-foreground">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[0.6rem] text-primary-foreground">III</span>
              Event Settlement & Financial Ledger Closure
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
                  onClick={() => {
                    const targetId = portalMatch?.id || event.id || event.title
                    const res = settleEvent(targetId)
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
        <div className={cn(gap, 'grid grid-cols-1 gap-3', !compact && 'sm:grid-cols-2 lg:grid-cols-3')}>
          {TEAM.map((member) => (
            <div key={member.name} className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold uppercase tracking-wide text-primary">
                {member.initials}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-card-foreground">{member.name}</p>
                <p className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
