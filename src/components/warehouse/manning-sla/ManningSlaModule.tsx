import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Copy,
  Plus,
  ShieldAlert,
  Timer,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { useGroundCrewDeclarations, reconcileExpiredDeclarations, getManningFallbackDeclarations, getApproachingDeclarationsSummary, type GroundCrewDeclaration } from '@/lib/ground-crew-declarations'
import {
  confirmTask,
  createAssignment,
  createTask,
  formatSlaCountdown,
  getApproachingSlaCount,
  inheritAssignment,
  isSlaOverdue,
  issueWarning,
  nextWarningTier,
  rejectTask,
  slaRemainingMs,
  submitTask,
  useManningData,
  type ManningAssignment,
  type ManningTask,
} from '@/lib/manning'

type Tab = 'assignments' | 'tasks' | 'warnings'

interface ManningSlaModuleProps {
  onClose: () => void
}

export function ManningSlaModule({ onClose }: ManningSlaModuleProps) {
  const { adminName, adminEmail } = useAuth()
  const actor = adminName || adminEmail || 'WOM'
  const { assignments, tasks, warnings, loading, error, reload } = useManningData()
  const declarations = useGroundCrewDeclarations()
  const [tab, setTab] = useState<Tab>('assignments')
  const [now, setNow] = useState(() => new Date())
  const [busy, setBusy] = useState<string | null>(null)
  const [carriedKeys, setCarriedKeys] = useState<string[]>([])

  // Live SLA countdowns — re-render every 30s so badges stay current.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => { reconcileExpiredDeclarations() }, [declarations])
  const fallbackDeclarations = getManningFallbackDeclarations(now.getTime())
  const approachingSlaCount = getApproachingSlaCount(tasks, now)
  const approachingDeclarationsSummary = getApproachingDeclarationsSummary(now.getTime())
  const totalApproachingCount = approachingSlaCount + approachingDeclarationsSummary.totalApproaching

  const [assignOpen, setAssignOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [warnFor, setWarnFor] = useState<ManningTask | null>(null)

  const stats = useMemo(() => {
    const submitted = tasks.filter((t) => t.status === 'Submitted')
    return {
      activeAssignments: assignments.filter((a) => a.status === 'Active').length,
      awaitingConfirm: submitted.length,
      overdue: submitted.filter((t) => isSlaOverdue(t, now)).length,
      escalated: tasks.filter((t) => t.status === 'Escalated').length,
    }
  }, [assignments, tasks, now])

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key)
    try {
      await fn()
      await reload()
    } catch (err) {
      console.error('[v0] manning action failed', err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:px-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.24em] text-primary">Warehouse module</p>
            <div className="flex flex-wrap items-center gap-3"><h1 className="mt-1 font-serif text-2xl font-medium text-foreground">Manning &amp; SLA Engine</h1>{totalApproachingCount > 0 && <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">{totalApproachingCount} approaching 48h</span>}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Daily manning assignments, the 48-hour lead-confirmation SLA, and three-tier warnings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close and return to dashboard"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Active Assignments', value: stats.activeAssignments, border: 'border-l-foreground/30' },
            { label: 'Awaiting Confirm', value: stats.awaitingConfirm, border: 'border-l-primary' },
            { label: 'SLA Overdue', value: stats.overdue, border: 'border-l-destructive' },
            { label: 'Approaching 48h', value: totalApproachingCount, border: 'border-l-primary' },
            { label: 'Escalated', value: stats.escalated, border: 'border-l-destructive' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn('rounded-lg border border-border bg-card px-4 py-3.5 border-l-4', stat.border)}
            >
              <p className="font-sans text-2xl font-bold leading-none text-card-foreground">{stat.value}</p>
              <p className="mt-2 text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.1em] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-md border border-border bg-background p-1">
            {(
              [
                { id: 'assignments', label: 'Assignments', icon: CalendarClock },
                { id: 'tasks', label: 'SLA Tasks', icon: ClipboardList },
                { id: 'warnings', label: 'Warnings', icon: ShieldAlert },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={cn(
                  'flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                  tab === t.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <t.icon className="size-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'assignments' && (
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="size-3.5" />
              New Assignment
            </button>
          )}
          {tab === 'tasks' && (
            <button
              type="button"
              onClick={() => setTaskOpen(true)}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="size-3.5" />
              New Task
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-6 py-6 sm:px-10">
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
  {error}
  </div>
  )}
  {loading ? (
          <p className="text-sm text-muted-foreground">Loading manning workspace…</p>
        ) : tab === 'assignments' ? (
          <AssignmentsView
            assignments={assignments}
            carriedKeys={carriedKeys}
            busy={busy}
            onInherit={(a) =>
              run(`inherit-${a.id}`, async () => {
                await inheritAssignment(a, new Date().toISOString().slice(0, 10), actor)
                setCarriedKeys((current) =>
                  current.includes(`${a.event_name}|${a.venue ?? ''}|${a.deployment_ref ?? ''}`)
                    ? current
                    : [...current, `${a.event_name}|${a.venue ?? ''}|${a.deployment_ref ?? ''}`],
                )
              })
            }
          />
        ) : tab === 'tasks' ? (
          <div className="space-y-5">
            <EscalatedDeclarations declarations={fallbackDeclarations} />
            <TasksView
            tasks={tasks}
            now={now}
            busy={busy}
            onSubmit={(t) => run(`submit-${t.id}`, () => submitTask(t.id))}
            onConfirm={(t) => run(`confirm-${t.id}`, () => confirmTask(t.id, actor))}
            onReject={(t) => run(`reject-${t.id}`, () => rejectTask(t.id))}
            onWarn={(t) => setWarnFor(t)}
            />
          </div>
        ) : (
          <WarningsView warnings={warnings} />
        )}
      </div>

      {assignOpen && (
        <AssignmentModal
          actor={actor}
          onClose={() => setAssignOpen(false)}
          onSaved={async () => {
            setAssignOpen(false)
            await reload()
          }}
        />
      )}
      {taskOpen && (
        <TaskModal
          actor={actor}
          assignments={assignments}
          onClose={() => setTaskOpen(false)}
          onSaved={async () => {
            setTaskOpen(false)
            await reload()
          }}
        />
      )}
      {warnFor && (
        <WarningModal
          task={warnFor}
          actor={actor}
          existingTier={nextWarningTier(warnings, warnFor.assignee_name ?? '')}
          onClose={() => setWarnFor(null)}
          onSaved={async () => {
            setWarnFor(null)
            await reload()
          }}
        />
      )}
    </div>
  )
}

function EscalatedDeclarations({ declarations }: { declarations: GroundCrewDeclaration[] }) {
  return <section className="space-y-3"><div className="flex items-center justify-between"><div><p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-destructive">Ground Crew fallback</p><h2 className="mt-1 font-serif text-xl text-foreground">Daily Review declarations</h2><p className="mt-1 text-sm text-muted-foreground">Unconfirmed reports escalated after the 48-hour Event Admin window.</p></div><AlertTriangle className="size-5 text-destructive" /></div>{declarations.length === 0 ? <div className="rounded-xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">No expired Ground Crew declarations.</div> : declarations.map((declaration) => <article key={declaration.id} className="rounded-xl border border-destructive/40 bg-card px-5 py-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-serif text-lg text-card-foreground">{declaration.eventName}</h3><p className="mt-1 text-sm text-card-foreground">{declaration.condition} · {declaration.item} · {declaration.quantity} affected</p></div><span className="rounded-full bg-destructive/15 px-2 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-destructive">Escalated</span></div><p className="mt-2 text-sm text-muted-foreground">{declaration.description}</p><p className="mt-2 text-xs text-muted-foreground">Submitted by {declaration.submittedBy} · {declaration.demoLabel ?? '48-hour fallback'}</p></article>)}</section>
}

// ---- Assignments view -----------------------------------------------

function AssignmentsView({
  assignments,
  carriedKeys,
  busy,
  onInherit,
}: {
  assignments: ManningAssignment[]
  carriedKeys: string[]
  busy: string | null
  onInherit: (a: ManningAssignment) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const assignmentKey = (a: ManningAssignment) =>
    `${a.work_date}|${a.event_name}|${a.venue ?? ''}|${a.deployment_ref ?? ''}`

  const visibleAssignments = assignments.filter((assignment, index, all) => {
    if (assignment.status !== 'Active') return true
    const key = assignmentKey(assignment)
    return all.findIndex(
      (candidate) => candidate.status === 'Active' && assignmentKey(candidate) === key,
    ) === index
  })

  const isAlreadyCarried = (a: ManningAssignment) =>
    (Boolean(a.inherited_from) && a.work_date === today) ||
    carriedKeys.includes(`${a.event_name}|${a.venue ?? ''}|${a.deployment_ref ?? ''}`)

  if (visibleAssignments.length === 0) {
    return <EmptyState icon={CalendarClock} title="No manning assignments yet" hint="Create the first daily assignment to tag a lead and crew." />
  }
  return (
    <ul className="space-y-3">
      {visibleAssignments.map((a) => (
        <li key={a.id} className="rounded-xl border border-border bg-card px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-medium text-card-foreground">{a.event_name}</h3>
                <StatusPill tone={a.status === 'Active' ? 'primary' : 'muted'}>{a.status}</StatusPill>
                {a.inherited_from && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    <Copy className="size-2.5" /> Inherited
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.work_date}
                {a.venue ? ` · ${a.venue}` : ''}
                {a.deployment_ref ? ` · ${a.deployment_ref}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onInherit(a)}
              disabled={busy === `inherit-${a.id}` || isAlreadyCarried(a)}
              aria-label={isAlreadyCarried(a) ? 'Already carried to today' : 'Carry to today'}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="size-3" />
              {isAlreadyCarried(a) ? 'Already carried' : 'Carry to today'}
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Lead</p>
              <p className="mt-1 text-sm font-medium text-card-foreground">
                {a.lead_name}
                {a.sub_role ? <span className="text-muted-foreground"> · {a.sub_role}</span> : null}
              </p>
            </div>
            <div>
              <p className="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Crew ({a.member_names.length})
              </p>
              <p className="mt-1 text-sm text-card-foreground">
                {a.member_names.length ? a.member_names.join(', ') : '—'}
              </p>
            </div>
          </div>
          {a.notes && <p className="mt-3 text-xs text-muted-foreground">{a.notes}</p>}
        </li>
      ))}
    </ul>
  )
}

// ---- Tasks view (SLA board) -----------------------------------------

function TasksView({
  tasks,
  now,
  busy,
  onSubmit,
  onConfirm,
  onReject,
  onWarn,
}: {
  tasks: ManningTask[]
  now: Date
  busy: string | null
  onSubmit: (t: ManningTask) => void
  onConfirm: (t: ManningTask) => void
  onReject: (t: ManningTask) => void
  onWarn: (t: ManningTask) => void
}) {
  if (tasks.length === 0) {
    return <EmptyState icon={ClipboardList} title="No manning tasks yet" hint="Assign a personal or generic task to open the SLA workflow." />
  }
  return (
    <ul className="space-y-3">
      {tasks.map((t) => {
        const remaining = slaRemainingMs(t, now)
        const overdue = isSlaOverdue(t, now)
        return (
          <li
            key={t.id}
            className={cn(
              'rounded-xl border bg-card px-5 py-4',
              overdue || t.status === 'Escalated' ? 'border-destructive/50' : 'border-border',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-lg font-medium text-card-foreground">{t.title}</h3>
                  <TaskStatusPill status={t.status} />
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    {t.task_type}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.assignee_name ?? 'Unassigned'} · lead {t.lead_name} · {t.work_date}
                </p>
                {t.description && <p className="mt-2 text-sm text-card-foreground">{t.description}</p>}
              </div>

              {t.status === 'Submitted' && remaining != null && (
                <div
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em]',
                    overdue ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary',
                  )}
                >
                  <Timer className="size-3.5" />
                  {formatSlaCountdown(remaining)}
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {t.status === 'Assigned' || t.status === 'In Progress' ? (
                <ActionButton
                  label="Submit work"
                  onClick={() => onSubmit(t)}
                  disabled={busy === `submit-${t.id}`}
                  variant="primary"
                />
              ) : null}
              {t.status === 'Submitted' ? (
                <>
                  <ActionButton
                    label="Confirm"
                    icon={CheckCircle2}
                    onClick={() => onConfirm(t)}
                    disabled={busy === `confirm-${t.id}`}
                    variant="primary"
                  />
                  <ActionButton
                    label="Reject"
                    onClick={() => onReject(t)}
                    disabled={busy === `reject-${t.id}`}
                    variant="outline"
                  />
                </>
              ) : null}
              {t.status === 'Escalated' ? (
                <ActionButton
                  label="Issue warning"
                  icon={ShieldAlert}
                  onClick={() => onWarn(t)}
                  variant="destructive"
                />
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ---- Warnings view ---------------------------------------------------

function WarningsView({ warnings }: { warnings: ReturnType<typeof useManningData>['warnings'] }) {
  if (warnings.length === 0) {
    return <EmptyState icon={ShieldAlert} title="No warnings issued" hint="Escalated tasks can be escalated into tiered warnings here." />
  }
  const tone: Record<number, string> = {
    1: 'border-l-primary',
    2: 'border-l-foreground/40',
    3: 'border-l-destructive',
  }
  return (
    <ul className="space-y-3">
      {warnings.map((w) => (
        <li key={w.id} className={cn('rounded-xl border border-border bg-card px-5 py-4 border-l-4', tone[w.tier])}>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg font-medium text-card-foreground">{w.subject_name}</h3>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                w.tier === 3 ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground',
              )}
            >
              Tier {w.tier}
            </span>
          </div>
          <p className="mt-2 text-sm text-card-foreground">{w.reason}</p>
          <p className="mt-2 text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
            Issued by {w.issued_by ?? '—'} · {new Date(w.issued_at).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  )
}

// ---- Shared bits -----------------------------------------------------

function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof CalendarClock
  title: string
  hint: string
}) {
  return (
    <div className="max-w-md rounded-xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-semibold text-card-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}

function StatusPill({ children, tone }: { children: React.ReactNode; tone: 'primary' | 'muted' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
        tone === 'primary' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  )
}

function TaskStatusPill({ status }: { status: ManningTask['status'] }) {
  const map: Record<ManningTask['status'], string> = {
    Assigned: 'bg-muted text-muted-foreground',
    'In Progress': 'bg-primary/15 text-primary',
    Submitted: 'bg-primary/15 text-primary',
    Confirmed: 'bg-primary/15 text-primary',
    Escalated: 'bg-destructive/15 text-destructive',
    Rejected: 'bg-destructive/15 text-destructive',
  }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em]', map[status])}>
      {status}
    </span>
  )
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  variant,
}: {
  label: string
  icon?: typeof CheckCircle2
  onClick: () => void
  disabled?: boolean
  variant: 'primary' | 'outline' | 'destructive'
}) {
  const styles: Record<string, string> = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    outline: 'border border-border text-card-foreground hover:bg-muted',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[0.58rem] font-bold uppercase tracking-[0.1em] transition disabled:opacity-50',
        styles[variant],
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {label}
    </button>
  )
}

// ---- Modals ----------------------------------------------------------

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-serif text-lg font-medium text-card-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

const fieldClass =
  'w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30'
const labelClass = 'block text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1.5'

function AssignmentModal({
  actor,
  onClose,
  onSaved,
}: {
  actor: string
  onClose: () => void
  onSaved: () => void
}) {
  const [eventName, setEventName] = useState('')
  const [venue, setVenue] = useState('')
  const [ref, setRef] = useState('')
  const [lead, setLead] = useState('')
  const [subRole, setSubRole] = useState('')
  const [members, setMembers] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!eventName.trim() || !lead.trim()) return
    setSaving(true)
    try {
      await createAssignment({
        work_date: new Date().toISOString().slice(0, 10),
        event_name: eventName.trim(),
        venue: venue.trim() || null,
        deployment_ref: ref.trim() || null,
        lead_name: lead.trim(),
        lead_email: null,
        sub_role: subRole.trim() || null,
        member_names: members
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean),
        notes: notes.trim() || null,
        created_by: actor,
      })
      onSaved()
    } catch (err) {
      console.error('[v0] create assignment failed', err)
      setSaving(false)
    }
  }

  return (
    <ModalShell title="New manning assignment" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Event / deployment *</label>
          <input className={fieldClass} value={eventName} onChange={(e) => setEventName(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Venue</label>
            <input className={fieldClass} value={venue} onChange={(e) => setVenue(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Deployment ref</label>
            <input className={fieldClass} value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Lead *</label>
            <input className={fieldClass} value={lead} onChange={(e) => setLead(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Lead sub-role</label>
            <input className={fieldClass} value={subRole} onChange={(e) => setSubRole(e.target.value)} placeholder="e.g. Manning Officer" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Crew members (comma-separated)</label>
          <input className={fieldClass} value={members} onChange={(e) => setMembers(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea className={cn(fieldClass, 'min-h-20 resize-y')} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <ModalActions onClose={onClose} onSave={save} saving={saving} disabled={!eventName.trim() || !lead.trim()} />
      </div>
    </ModalShell>
  )
}

function TaskModal({
  actor,
  assignments,
  onClose,
  onSaved,
}: {
  actor: string
  assignments: ManningAssignment[]
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [type, setType] = useState<'personal' | 'generic'>('personal')
  const [assignee, setAssignee] = useState('')
  const [assignmentId, setAssignmentId] = useState('')
  const [saving, setSaving] = useState(false)

  const lead = assignments.find((a) => a.id === assignmentId)?.lead_name ?? actor

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await createTask({
        title: title.trim(),
        description: desc.trim() || null,
        task_type: type,
        assignee_name: assignee.trim() || null,
        lead_name: lead,
        assignment_id: assignmentId || null,
        work_date: new Date().toISOString().slice(0, 10),
        created_by: actor,
      })
      onSaved()
    } catch (err) {
      console.error('[v0] create task failed', err)
      setSaving(false)
    }
  }

  return (
    <ModalShell title="New manning task" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Task title *</label>
          <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea className={cn(fieldClass, 'min-h-20 resize-y')} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Type</label>
            <select className={fieldClass} value={type} onChange={(e) => setType(e.target.value as 'personal' | 'generic')}>
              <option value="personal">Personal</option>
              <option value="generic">Generic</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Assignee</label>
            <input className={fieldClass} value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Link to assignment (inherits lead)</label>
          <select className={fieldClass} value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)}>
  <option value="">None</option>
      {assignments.map((a) => (
        <option key={a.id} value={a.id}>
                {a.event_name} · {a.work_date} · lead {a.lead_name}
              </option>
            ))}
          </select>
        </div>
        <ModalActions onClose={onClose} onSave={save} saving={saving} disabled={!title.trim()} />
      </div>
    </ModalShell>
  )
}

function WarningModal({
  task,
  actor,
  existingTier,
  onClose,
  onSaved,
}: {
  task: ManningTask
  actor: string
  existingTier: 1 | 2 | 3
  onClose: () => void
  onSaved: () => void
}) {
  const [reason, setReason] = useState(`Escalated SLA breach on task "${task.title}"`)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await issueWarning({
        subject_name: task.assignee_name ?? task.lead_name,
        tier: existingTier,
        reason: reason.trim(),
        related_task_id: task.id,
        issued_by: actor,
      })
      onSaved()
    } catch (err) {
      console.error('[v0] issue warning failed', err)
      setSaving(false)
    }
  }

  return (
    <ModalShell title={`Issue Tier ${existingTier} warning`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            Subject: <strong>{task.assignee_name ?? task.lead_name}</strong> — Tier {existingTier} of 3.
          </span>
        </div>
        <div>
          <label className={labelClass}>Reason</label>
          <textarea className={cn(fieldClass, 'min-h-24 resize-y')} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <ModalActions onClose={onClose} onSave={save} saving={saving} disabled={!reason.trim()} saveLabel="Issue warning" />
      </div>
    </ModalShell>
  )
}

function ModalActions({
  onClose,
  onSave,
  saving,
  disabled,
  saveLabel = 'Save',
}: {
  onClose: () => void
  onSave: () => void
  saving: boolean
  disabled?: boolean
  saveLabel?: string
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-md border border-border px-4 py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-card-foreground hover:bg-muted"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || disabled}
        className="rounded-md bg-primary px-4 py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {saving ? 'Saving…' : saveLabel}
      </button>
    </div>
  )
}
