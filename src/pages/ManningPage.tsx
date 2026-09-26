import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Lock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { MaskedPinInput } from '@/components/admin/MaskedPinInput'
import { logAuditEvent } from '@/lib/audit-logger'
import {
  PwaBadge,
  PwaBottomNav,
  PwaButton,
  PwaCard,
  PwaEmptyState,
  PwaHeader,
  PwaModal,
  PwaToast,
  type PwaNavItem,
} from '@/components/pwa'
import {
  decideGroundCrewDeclaration,
  getApproachingDeclarationsSummary,
  getManningFallbackDeclarations,
  reconcileExpiredDeclarations,
  useGroundCrewDeclarations,
  type GroundCrewDeclaration,
} from '@/lib/ground-crew-declarations'

type Tab = 'home' | 'calendar' | 'activity' | 'account'

interface IncidentItem {
  id: string
  title: string
  detail: string
  status: string
  date: string
}

const SEED_INCIDENTS: IncidentItem[] = [
  {
    id: 'inc-1',
    title: 'Welfare concern during load-in',
    detail: 'Founders Dinner · submitted Aug 20, 09:42',
    status: 'New',
    date: 'Aug 20, 2026',
  },
  {
    id: 'inc-2',
    title: 'Missing radio handset',
    detail: 'Maison Privée Launch · submitted Aug 19, 16:10',
    status: 'New',
    date: 'Aug 19, 2026',
  },
]

const INITIAL_OVERDUE = [
  { id: 't-1', title: 'Polish & crate candelabras', lead: 'Warehouse Lead', due: 'Aug 19, 12:00' },
  { id: 't-2', title: 'Confirm return count', lead: 'Warehouse Lead', due: 'Aug 18, 17:00' },
]

export function ManningPage() {
  const { adminName, adminEmail, logout } = useAuth()
  const declarations = useGroundCrewDeclarations()
  const [tab, setTab] = useState<Tab>('home')
  const [toast, setToast] = useState('')
  const [pinOpen, setPinOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [incidentStates, setIncidentStates] = useState<Record<string, string>>({})
  const [overdueTasks, setOverdueTasks] = useState(INITIAL_OVERDUE)
  const [now, setNow] = useState(() => Date.now())
  const [standingWarningCount, setStandingWarningCount] = useState(2)

  // 30s polling + automatic reconciliation per Standing Sync rules
  useEffect(() => {
    reconcileExpiredDeclarations()
    const interval = window.setInterval(() => {
      setNow(Date.now())
      reconcileExpiredDeclarations()
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [declarations])

  const approachingSummary = useMemo(() => getApproachingDeclarationsSummary(now), [now, declarations])
  const fallbackDeclarations = useMemo(() => getManningFallbackDeclarations(now), [now, declarations])
  const totalBreaches = overdueTasks.length + fallbackDeclarations.length

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 4500)
  }

  const unlockInbox = () => {
    if (pin === '246810') {
      setUnlocked(true)
      setPinOpen(false)
      setPin('')
      notify('Incident Inbox unlocked for this active session.')
    } else {
      notify('Invalid PIN. Enter the 6-digit Manning authorization PIN.')
    }
  }



  const navItems: PwaNavItem[] = [
    { id: 'home', label: 'Home', icon: ClipboardList, badgeCount: totalBreaches },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'activity', label: 'Activity', icon: FileText },
    { id: 'account', label: 'Account', icon: UserCircle2 },
  ]

  const handleIssueWarning = (tier: string, automatic = false) => {
    const nextCount = standingWarningCount + (automatic ? 1 : 0)
    if (automatic) setStandingWarningCount(nextCount)
    notify(`${tier} issued${automatic ? ` · total standing: ${nextCount}` : ''}.`)
    void logAuditEvent({
      actor_id: 'manning-officer',
      actor_name: adminName || 'Manning Officer',
      module: 'manning',
      action_type: 'MANNING_OVERRIDE',
      target_id: `warning-${Date.now()}`,
      target_snapshot: { tier, automatic, totalWarnings: nextCount },
      reason: `${tier} issued to field crew member`,
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Shared PWA Station Header */}
      <PwaHeader
        title={
          tab === 'home'
            ? 'Manning & SLA Console'
            : tab === 'calendar'
              ? 'Manning Review Log'
              : tab === 'activity'
                ? 'Operations Activity Record'
                : adminName || 'Manning Officer'
        }
        subtitle={
          tab === 'home'
            ? '48-hour escalation window & crew welfare control'
            : tab === 'calendar'
              ? 'Unconfirmed lead tasks & expired field declarations'
              : tab === 'activity'
                ? 'Audit trail of overrides, warnings & incidents'
                : adminEmail || 'manning@lumiere.internal'
        }
        roleName="Manning Officer"
        subRole="Field Operations & SLA Escalation"
        icon={
          tab === 'home' ? (
            <ShieldAlert className="size-5 text-primary" />
          ) : tab === 'calendar' ? (
            <CalendarDays className="size-5 text-primary" />
          ) : tab === 'activity' ? (
            <FileText className="size-5 text-primary" />
          ) : (
            <UserCircle2 className="size-5 text-primary" />
          )
        }
        actions={
          <button
            type="button"
            id="manning-signout-btn"
            onClick={logout}
            className="flex size-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        }
      />

      {/* Main Container */}
      <main className="mx-auto w-full max-w-[440px] px-4 pt-4 space-y-4">
        {tab === 'home' && (
          <HomeTab
            totalBreaches={totalBreaches}
            overdue={overdueTasks}
            fallbackDeclarations={fallbackDeclarations}
            approachingSummary={approachingSummary}
            onOverrideTask={(id, title) => {
              setOverdueTasks((prev) => prev.filter((t) => t.id !== id))
              notify(`Task "${title}" overridden and approved by Manning.`)
            }}
            onOverrideDeclaration={(id, decision) => {
              decideGroundCrewDeclaration(id, decision, adminName || 'Manning Officer')
              notify(`Declaration ${decision.toLowerCase()} by Manning Officer.`)
            }}
            onOpenPin={() => (unlocked ? null : setPinOpen(true))}
            unlocked={unlocked}
            incidentStates={incidentStates}
            setIncidentStates={setIncidentStates}
            standingWarningCount={standingWarningCount}
            onIssueWarning={handleIssueWarning}
          />
        )}

        {tab === 'calendar' && (
          <CalendarTab
            fallbackCount={fallbackDeclarations.length}
            approachingCount={approachingSummary.totalApproaching}
            onSave={() => notify('Daily review log entry preserved.')}
          />
        )}

        {tab === 'activity' && (
          <ActivityTab
            standingWarningCount={standingWarningCount}
            unlocked={unlocked}
            incidentStates={incidentStates}
          />
        )}

        {tab === 'account' && (
          <AccountTab
            name={adminName || 'Manning Officer'}
            email={adminEmail || 'manning@lumiere.internal'}
            onLogout={logout}
          />
        )}
      </main>

      {/* Shared Bottom Navigation */}
      <PwaBottomNav
        items={navItems}
        activeId={tab}
        onSelect={(key) => setTab(key as Tab)}
      />

      {/* Toast Notification */}
      {toast && <PwaToast message={toast} />}

      {/* PIN Gate Modal for Incident Inbox */}
      <PwaModal
        isOpen={pinOpen}
        onClose={() => {
          setPinOpen(false)
          setPin('')
        }}
        title="Incident Inbox Restricted"
        subtitle="Operational security gate"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-muted/40 p-3.5 text-xs text-muted-foreground">
            <Lock className="size-4 shrink-0 text-primary" />
            <span>Enter your 6-digit Manning confirmation PIN to access private personnel incident records.</span>
          </div>

          <div className="py-2">
            <MaskedPinInput
              id="manning-pin-input"
              label="6-Digit Authorization PIN"
              value={pin}
              onChange={setPin}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pin.length === 6) unlockInbox()
              }}
              autoFocus
            />
          </div>

          <PwaButton
            id="manning-unlock-btn"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={pin.length !== 6}
            onClick={unlockInbox}
          >
            Unlock Incident Inbox
          </PwaButton>
        </div>
      </PwaModal>
    </div>
  )
}

// ----------------------------------------------------------------------
// Home Tab Component
// ----------------------------------------------------------------------

interface HomeTabProps {
  totalBreaches: number
  overdue: { id: string; title: string; lead: string; due: string }[]
  fallbackDeclarations: GroundCrewDeclaration[]
  approachingSummary: { totalApproaching: number; eventsCount: number }
  onOverrideTask: (id: string, title: string) => void
  onOverrideDeclaration: (id: string, decision: 'Confirmed' | 'Rejected') => void
  onOpenPin: () => void
  unlocked: boolean
  incidentStates: Record<string, string>
  setIncidentStates: React.Dispatch<React.SetStateAction<Record<string, string>>>
  standingWarningCount: number
  onIssueWarning: (tier: string, automatic?: boolean) => void
}

function HomeTab({
  totalBreaches,
  overdue,
  fallbackDeclarations,
  approachingSummary,
  onOverrideTask,
  onOverrideDeclaration,
  onOpenPin,
  unlocked,
  incidentStates,
  setIncidentStates,
  standingWarningCount,
  onIssueWarning,
}: HomeTabProps) {
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* SLA Escalation Hero / Alert Card */}
      <PwaCard
        className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
        headerClassName="border-b-0 pb-0"
      >
        <div
          role="button"
          tabIndex={0}
          id="manning-sla-summary-card"
          onClick={() => setDetailModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setDetailModalOpen(true)
          }}
          className="w-full text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bell className="size-4" />
              </span>
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-primary">
                48-Hour SLA Policy Monitor
              </span>
            </div>
            <span className="inline-flex items-center text-xs font-semibold text-primary gap-0.5">
              Review details <ChevronRight className="size-3.5" />
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {totalBreaches > 0 ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs">
                <p className="font-bold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  {totalBreaches} Escalated Item{totalBreaches > 1 ? 's' : ''} Exceeding 48h Window
                </p>
                <p className="mt-1 text-muted-foreground leading-relaxed">
                  {overdue.length} unconfirmed lead task{overdue.length === 1 ? '' : 's'} and{' '}
                  {fallbackDeclarations.length} ground crew condition declaration{fallbackDeclarations.length === 1 ? '' : 's'}{' '}
                  have exceeded the 48-hour Event Admin window and require Manning authority.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                <p className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 shrink-0" /> All Event SLA Windows Secure
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  All field declarations and lead confirmations are currently within their 48-hour review limits.
                </p>
              </div>
            )}

            {approachingSummary.totalApproaching > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Clock className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>Escalation Warning:</strong> {approachingSummary.totalApproaching} pending declaration
                  {approachingSummary.totalApproaching > 1 ? 's are' : ' is'} within 12 hours of breach across{' '}
                  {approachingSummary.eventsCount} event{approachingSummary.eventsCount > 1 ? 's' : ''}.
                </span>
              </div>
            )}
          </div>
        </div>
      </PwaCard>

      {/* 48-Hour Overrides Section */}
      <div>
        <div className="mb-2.5 flex items-center justify-between px-1">
          <h2 className="font-serif text-sm font-semibold tracking-tight uppercase tracking-[0.14em] text-foreground">
            48-Hour Escalation Actions ({totalBreaches})
          </h2>
          <span className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-wider">
            Manning Authority
          </span>
        </div>

        {totalBreaches === 0 ? (
          <PwaEmptyState
            title="All SLA Items Resolved"
            description="There are currently no overdue lead confirmations or escalated field declarations pending Manning override."
            icon={<CheckCircle2 className="size-6 text-emerald-500" />}
          />
        ) : (
          <div className="space-y-3">
            {/* Overdue Lead Confirmation Tasks */}
            {overdue.map((task) => (
              <PwaCard key={task.id} className="border-l-4 border-l-rose-500">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-destructive">
                        Overdue SLA
                      </span>
                      <span className="text-[0.65rem] text-muted-foreground">Due: {task.due}</span>
                    </div>
                    <h3 className="mt-1 font-serif text-base font-bold text-foreground leading-snug">
                      {task.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Assigned Lead: <strong className="text-foreground">{task.lead}</strong>
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end border-t border-border/60 pt-3">
                  <PwaButton
                    id={`override-task-${task.id}`}
                    onClick={() => onOverrideTask(task.id, task.title)}
                    variant="primary"
                    size="sm"
                  >
                    Override &amp; Confirm
                  </PwaButton>
                </div>
              </PwaCard>
            ))}

            {/* Expired Ground Crew Field Declarations */}
            {fallbackDeclarations.map((decl) => (
              <PwaCard key={decl.id} className="border-l-4 border-l-destructive">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-destructive">
                        Escalated to Manning (48h+)
                      </span>
                      <PwaBadge
                        variant={decl.condition === 'Damaged' ? 'destructive' : 'neutral'}
                        label={`${decl.condition} · ${decl.quantity} Qty`}
                      />
                    </div>
                    <h3 className="mt-1 font-serif text-base font-bold text-foreground leading-snug">
                      {decl.eventName}
                    </h3>
                    <p className="text-xs font-semibold text-foreground mt-0.5">Asset: {decl.item}</p>
                    <p className="text-[0.7rem] text-muted-foreground">
                      Reported by {decl.submittedBy} ({decl.submittedRole})
                    </p>
                  </div>
                </div>

                {decl.description && (
                  <p className="mt-2.5 rounded-xl bg-muted/40 p-2.5 text-xs text-muted-foreground italic leading-relaxed">
                    "{decl.description}"
                  </p>
                )}

                <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
                  <PwaButton
                    id={`manning-reject-${decl.id}`}
                    onClick={() => onOverrideDeclaration(decl.id, 'Rejected')}
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    Manning Reject
                  </PwaButton>
                  <PwaButton
                    id={`manning-confirm-${decl.id}`}
                    onClick={() => onOverrideDeclaration(decl.id, 'Confirmed')}
                    variant="primary"
                    size="sm"
                  >
                    Manning Confirm
                  </PwaButton>
                </div>
              </PwaCard>
            ))}
          </div>
        )}
      </div>

      {/* Warning Issuance Panel */}
      <PwaCard
        title="Warning Issuance"
        subtitle="Disciplinary records & Call-to-Office threshold tracking"
      >
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Standing warnings count toward the automated Call to Office threshold (3 cumulative warnings).
          </p>

          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Current Active Standing Warnings:</span>
            <span className="font-bold text-foreground font-mono px-2 py-0.5 rounded bg-muted">
              {standingWarningCount} / 3 threshold
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <PwaButton
              id="manning-minor-warn-btn"
              onClick={() => onIssueWarning('Minor warning')}
              variant="outline"
              size="md"
            >
              Minor Warning
            </PwaButton>
            <PwaButton
              id="manning-standing-warn-btn"
              onClick={() => onIssueWarning('Standing warning', true)}
              variant="outline"
              size="md"
            >
              Standing Warning (+1)
            </PwaButton>
          </div>

          <PwaButton
            id="manning-call-office-btn"
            onClick={() => onIssueWarning('Manual Call to Office')}
            variant="primary"
            size="md"
            className="w-full"
          >
            Manual Call to Office
          </PwaButton>
        </div>
      </PwaCard>

      {/* Private Workflow: Incident Inbox */}
      <PwaCard
        title="Incident Inbox"
        subtitle="Confidential welfare and personnel concerns"
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
            {unlocked ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="size-3" /> Unlocked
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Lock className="size-3" /> PIN Gated
              </span>
            )}
          </span>
        }
      >
        {!unlocked ? (
          <div className="py-2 text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              Incident records contain sensitive personnel submissions and require session authorization.
            </p>
            <PwaButton
              id="manning-open-pin-btn"
              variant="outline"
              size="md"
              className="w-full"
              icon={<Lock className="size-4" />}
              onClick={onOpenPin}
            >
              Unlock with 6-Digit PIN
            </PwaButton>
          </div>
        ) : (
          <div className="space-y-3 divide-y divide-border/60">
            {SEED_INCIDENTS.map((incident, idx) => (
              <div key={incident.id} className={idx > 0 ? 'pt-3 space-y-2' : 'space-y-2'}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-serif text-sm font-bold text-foreground">{incident.title}</h4>
                    <p className="text-xs text-muted-foreground">{incident.detail}</p>
                  </div>
                  {incidentStates[incident.id] ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      {incidentStates[incident.id]}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-primary">
                      {incident.status}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(['Acknowledged', 'Call for Talk', 'No Action Needed'] as const).map((action) => {
                    const isSelected = incidentStates[incident.id] === action
                    return (
                      <button
                        key={action}
                        type="button"
                        onClick={() =>
                          setIncidentStates((curr) => ({
                            ...curr,
                            [incident.id]: action,
                          }))
                        }
                        className={`inline-flex min-h-[38px] items-center gap-1 rounded-xl px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        {isSelected && <Check className="size-3" />}
                        {isSelected ? 'Saved' : action}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </PwaCard>

      {/* Notifications & SLA Breaches Modal */}
      <PwaModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Notifications & SLA Breaches"
        subtitle="Manning Control SLA Monitoring Feed"
      >
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-0.5">
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs">
            <p className="font-bold text-rose-600 dark:text-rose-400">48-Hour SLA Policy Enforcement Active</p>
            <p className="mt-1 text-muted-foreground leading-relaxed">
              All field lead task confirmations and ground crew condition declarations must be processed within 48 hours
              to secure schedule integrity and crew accountability.
            </p>
          </div>

          {overdue.map((task) => (
            <div key={task.id} className="rounded-xl border border-border bg-card p-3.5 border-l-4 border-l-rose-500 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[0.55rem] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Overdue Lead Confirmation
                  </span>
                  <h4 className="font-serif text-base font-bold text-foreground mt-0.5">{task.title}</h4>
                </div>
                <span className="text-xs text-muted-foreground">Due: {task.due}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Assigned Lead: <strong className="text-foreground">{task.lead}</strong>
              </p>
              <div className="pt-2 border-t border-border/60 flex justify-end">
                <PwaButton
                  onClick={() => {
                    onOverrideTask(task.id, task.title)
                    setDetailModalOpen(false)
                  }}
                  variant="primary"
                  size="sm"
                >
                  Override &amp; Confirm
                </PwaButton>
              </div>
            </div>
          ))}

          {fallbackDeclarations.map((decl) => (
            <div key={decl.id} className="rounded-xl border border-border bg-card p-3.5 border-l-4 border-l-amber-500 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[0.55rem] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Escalated Field Declaration
                  </span>
                  <h4 className="font-serif text-base font-bold text-foreground mt-0.5">{decl.eventName}</h4>
                </div>
                <PwaBadge variant="destructive" label={decl.condition} />
              </div>
              <p className="text-xs text-foreground font-semibold">
                Asset: {decl.item} ({decl.quantity} affected)
              </p>
              <p className="text-xs text-muted-foreground">
                Reported by {decl.submittedBy} ({decl.submittedRole})
              </p>
              {decl.description && (
                <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl italic">
                  "{decl.description}"
                </p>
              )}
              <div className="pt-2 border-t border-border/60 flex justify-end gap-2">
                <PwaButton
                  onClick={() => {
                    onOverrideDeclaration(decl.id, 'Rejected')
                    setDetailModalOpen(false)
                  }}
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                >
                  Reject
                </PwaButton>
                <PwaButton
                  onClick={() => {
                    onOverrideDeclaration(decl.id, 'Confirmed')
                    setDetailModalOpen(false)
                  }}
                  variant="primary"
                  size="sm"
                >
                  Confirm Declaration
                </PwaButton>
              </div>
            </div>
          ))}

          {totalBreaches === 0 && (
            <div className="py-6 text-center space-y-2">
              <ShieldCheck className="size-10 text-emerald-500 mx-auto" />
              <h4 className="font-serif text-base font-bold text-foreground">All Escalations Resolved</h4>
              <p className="text-xs text-muted-foreground">
                No active 48-hour SLA breaches or escalated declarations require review at this time.
              </p>
            </div>
          )}
        </div>
      </PwaModal>
    </div>
  )
}

// ----------------------------------------------------------------------
// Calendar / Daily Review Tab Component
// ----------------------------------------------------------------------

interface CalendarTabProps {
  fallbackCount: number
  approachingCount: number
  onSave: () => void
}

function CalendarTab({ fallbackCount, approachingCount, onSave }: CalendarTabProps) {
  const [selectedDate, setSelectedDate] = useState('2026-08-20')
  const [view, setView] = useState(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate.trim())) {
      const [y, m] = selectedDate.trim().split('-').map(Number)
      return { year: y, month: m - 1 }
    }
    return { year: 2026, month: 7 }
  })

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const shiftMonth = (delta: number) => {
    setView((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  const firstWeekday = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div className="space-y-4">
      <PwaCard
        title="Daily Review Log"
        subtitle="Audit checkpoint for unconfirmed event assignments"
      >
        <div className="space-y-4">
          {/* Mobile-first PWA Calendar Grid */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-3">
            <div className="flex items-center justify-between">
              <PwaButton
                variant="ghost"
                size="sm"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" /> Prev
              </PwaButton>
              <span className="font-serif text-sm font-bold text-foreground">
                {MONTH_NAMES[view.month]} {view.year}
              </span>
              <PwaButton
                variant="ghost"
                size="sm"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
              >
                Next <ChevronRight className="size-4" />
              </PwaButton>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={`${d}-${i}`} className="font-bold text-muted-foreground text-[0.65rem] py-1">
                  {d}
                </span>
              ))}
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <span key={`pad-${i}`} />
              ))}
              {days.map((day) => {
                const date = `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isSelected = date === selectedDate

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    aria-label={`Select ${date}`}
                    className={`flex min-h-[44px] flex-col items-center justify-center rounded-xl p-1 text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'hover:bg-accent/40 text-foreground'
                    }`}
                  >
                    <span>{day}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-foreground">
              <span>Date Checkpoint:</span>
              <span className="font-mono">{selectedDate}</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              2 task confirmations remained unresolved by end of operational day.
            </p>
            {fallbackCount > 0 && (
              <p className="text-destructive font-semibold">
                {fallbackCount} field declaration{fallbackCount > 1 ? 's' : ''} exceeded the 48-hour Event Admin window.
              </p>
            )}
            {approachingCount > 0 && (
              <p className="text-amber-700 dark:text-amber-300 font-semibold">
                {approachingCount} declaration{approachingCount > 1 ? 's' : ''} currently approaching 48h deadline.
              </p>
            )}
          </div>

          <PwaButton
            id="manning-save-review-btn"
            onClick={onSave}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Save Daily Review
          </PwaButton>
        </div>
      </PwaCard>
    </div>
  )
}

// ----------------------------------------------------------------------
// Activity Tab Component
// ----------------------------------------------------------------------

interface ActivityTabProps {
  standingWarningCount: number
  unlocked: boolean
  incidentStates: Record<string, string>
}

function ActivityTab({ standingWarningCount, unlocked, incidentStates }: ActivityTabProps) {
  const dynamicActivities = useMemo(() => {
    const list = []

    if (unlocked) {
      list.push({
        id: 'act-unlocked',
        title: 'Incident Inbox Session Verified',
        detail: '6-digit authorization PIN validated for confidential personnel review',
        timestamp: 'Active session',
        badge: 'PIN Authorized',
      })
    }

    Object.entries(incidentStates).forEach(([id, action]) => {
      const match = SEED_INCIDENTS.find((i) => i.id === id)
      list.push({
        id: `act-inc-${id}`,
        title: `Disposition: ${action}`,
        detail: `${match ? match.title : 'Incident record'} · status updated by Manning Officer`,
        timestamp: 'Just now',
        badge: 'Incident Log',
      })
    })

    if (standingWarningCount > 0) {
      list.push({
        id: 'act-warn-count',
        title: `Active Standing Warnings: ${standingWarningCount}`,
        detail: `${standingWarningCount} of 3 cumulative warnings logged toward automatic Call to Office threshold`,
        timestamp: 'Current count',
        badge: 'Warning Policy',
      })
    }

    list.push(
      {
        id: 'act-1',
        title: 'Standing warning issued to Warehouse Lead',
        detail: 'Escalation policy tier 2 confirmed · automatic timestamp logged',
        timestamp: 'Aug 20, 2026 · 10:14',
        badge: 'Warning Issued',
      },
      {
        id: 'act-2',
        title: 'Incident Inbox response recorded',
        detail: 'Confidential review for Founders Dinner load-in concern',
        timestamp: 'Aug 20, 2026 · 09:42',
        badge: 'Incident Log',
      },
      {
        id: 'act-3',
        title: '48h Fallback Declaration Reconciled',
        detail: 'La Nuit Dorée damage report escalated from Event Admin queue',
        timestamp: 'Aug 19, 2026 · 17:30',
        badge: 'Reconciled',
      },
    )

    return list
  }, [standingWarningCount, unlocked, incidentStates])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-serif text-sm font-semibold tracking-tight uppercase tracking-[0.14em] text-foreground">
          Operations Activity Record
        </h2>
        <span className="text-[0.625rem] text-muted-foreground uppercase font-bold tracking-wider">
          Audited Actions
        </span>
      </div>

      <div className="space-y-3">
        {dynamicActivities.map((act) => (
          <PwaCard key={act.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-serif text-sm font-bold text-foreground">{act.title}</h4>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-primary">
                {act.badge}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{act.detail}</p>
            <p className="text-[0.65rem] text-muted-foreground/75 font-mono pt-1 border-t border-border/50">
              {act.timestamp}
            </p>
          </PwaCard>
        ))}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------
// Account Tab Component
// ----------------------------------------------------------------------

interface AccountTabProps {
  name: string
  email: string
  onLogout: () => void
}

function AccountTab({ name, email, onLogout }: AccountTabProps) {
  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <PwaCard>
        <div className="flex items-center gap-3.5">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-serif text-lg font-bold shadow-md">
            {(name || 'MO').slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-lg font-bold text-foreground truncate">{name}</h3>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <PwaBadge variant="accent" label="Manning Officer" />
              <PwaBadge variant="subrole" label="Operations Authority" />
            </div>
          </div>
        </div>
      </PwaCard>

      {/* Permissions & Operational Authority Card */}
      <PwaCard title="Operations Authority" subtitle="Assigned scope and escalation privileges">
        <div className="space-y-2.5 text-xs">
          <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-2.5">
            <ShieldCheck className="size-4 shrink-0 text-primary mt-0.5" />
            <div>
              <p className="font-bold text-foreground">48-Hour SLA Override Authority</p>
              <p className="text-muted-foreground text-[0.7rem] mt-0.5">
                Can approve or reject field condition declarations left unreviewed by Event Admins after 48 hours.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-2.5">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Disciplinary &amp; Warning Issuance</p>
              <p className="text-muted-foreground text-[0.7rem] mt-0.5">
                Authorized to issue Minor/Standing warnings and trigger Call to Office directives.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-2.5">
            <Lock className="size-4 shrink-0 text-primary mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Confidential Incident Inbox</p>
              <p className="text-muted-foreground text-[0.7rem] mt-0.5">
                PIN-gated access to personnel welfare, safety, and equipment incident queues.
              </p>
            </div>
          </div>
        </div>
      </PwaCard>

      {/* Sign Out Action */}
      <PwaCard>
        <PwaButton
          id="manning-account-signout-btn"
          onClick={onLogout}
          variant="outline"
          size="lg"
          className="w-full text-destructive hover:bg-destructive/10 border-destructive/30"
          icon={<LogOut className="size-4" />}
        >
          Sign Out of Manning Console
        </PwaButton>
      </PwaCard>
    </div>
  )
}
