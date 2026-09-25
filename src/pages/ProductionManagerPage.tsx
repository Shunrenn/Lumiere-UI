import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import {
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Hammer,
  Layers,
  Lock,
  LogOut,
  MapPin,
  Sparkles,
  Undo2,
  UserCircle2,
  Wrench,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  useWarehouse,
  PRODUCTION_NOTIFICATIONS,
  type ProductionJob,
  type ProductionStage,
  type WarehouseEvent,
} from '@/lib/warehouse'
import { OfflineBanner } from '@/components/OfflineBanner'
import {
  PwaBadge,
  PwaBottomNav,
  PwaButton,
  PwaCard,
  PwaEmptyState,
  PwaErrorState,
  PwaHeader,
  PwaLoadingState,
  PwaModal,
  PwaToast,
  type PwaNavItem,
} from '@/components/pwa'
import { cn } from '@/lib/utils'

type Tab = 'home' | 'calendar' | 'activity' | 'account'

const SCHEDULE = [
  { date: '2026-08-19', time: '15:00', title: 'Production sync', venue: 'Lumière Depot' },
  { date: '2026-08-25', time: '10:00', title: 'Brass plinth QA check', venue: 'Lumière Depot' },
]

const STAGE_ORDER: ProductionStage[] = ['Unprepped', 'Prepping', 'Awaiting Approval', 'Ready']

function dateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function getStageBadgeClass(stage: ProductionStage): string {
  switch (stage) {
    case 'Ready':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
    case 'Awaiting Approval':
      return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
    case 'Prepping':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
    case 'Unprepped':
    default:
      return 'bg-muted/60 text-muted-foreground border-border'
  }
}

export function ProductionManagerPage() {
  const { adminName, adminEmail, logout } = useAuth()
  const {
    events,
    productionJobs,
    activity,
    moveProductionJob,
    toggleProductionMaterial,
    updateProductionNotes,
  } = useWarehouse()

  const [tab, setTab] = useState<Tab>('home')
  const [selectedEvent, setSelectedEvent] = useState<WarehouseEvent | null>(null)
  const [openJob, setOpenJob] = useState<ProductionJob | null>(null)
  const [activeNotif, setActiveNotif] = useState<typeof PRODUCTION_NOTIFICATIONS[number] | null>(null)
  const [toast, setToast] = useState('')
  const [selectedDate, setSelectedDate] = useState('2026-08-20')

  const [notes, setNotes] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const stored = localStorage.getItem('__lumiere_production_notes__')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('__lumiere_production_notes__', JSON.stringify(notes))
    } catch {
      // ignore local storage error
    }
  }, [notes])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 4000)
  }

  const pendingCount = useMemo(
    () => productionJobs.filter((j) => j.stage === 'Awaiting Approval').length,
    [productionJobs]
  )

  const activeJob = openJob
    ? productionJobs.find((j) => j.id === openJob.id) ?? openJob
    : null

  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const handleRefetch = async () => {
    setIsError(false)
    setIsLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 200))
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    handleRefetch()
  }, [])

  const navItems: readonly PwaNavItem[] = [
    { id: 'home', label: 'Home', icon: ClipboardList, badgeCount: pendingCount },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'activity', label: 'Activity', icon: FileText },
    { id: 'account', label: 'Account', icon: UserCircle2 },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Offline Connectivity Status */}
      <OfflineBanner />

      {/* Shared Station Header */}
      <PwaHeader
        title={
          tab === 'home'
            ? selectedEvent
              ? selectedEvent.name
              : 'Production Command'
            : tab === 'calendar'
              ? 'Fabrication Calendar'
              : tab === 'activity'
                ? 'Production Activity Record'
                : adminName || 'Production Manager'
        }
        subtitle={
          tab === 'home'
            ? selectedEvent
              ? `${selectedEvent.venue} · ${dateLabel(selectedEvent.date)}`
              : 'Bespoke builds, raw materials & QA dispatch approvals'
            : tab === 'calendar'
              ? 'Muster briefings, deadlines & personal reminders'
              : tab === 'activity'
                ? 'Audit trail, stage transitions & approved units'
                : adminEmail || 'Bespoke Fabrication Operations Authority'
        }
        roleName="Production Manager"
        subRole="Production"
        icon={
          tab === 'home' ? (
            <Hammer className="size-5 text-primary" />
          ) : tab === 'calendar' ? (
            <CalendarDays className="size-5 text-primary" />
          ) : tab === 'activity' ? (
            <FileText className="size-5 text-primary" />
          ) : (
            <UserCircle2 className="size-5 text-primary" />
          )
        }
        actions={
          selectedEvent ? (
            <PwaButton
              variant="outline"
              size="sm"
              onClick={() => setSelectedEvent(null)}
              icon={<ChevronLeft className="size-4" />}
            >
              All Events
            </PwaButton>
          ) : (
            <button
              type="button"
              onClick={logout}
              className="flex size-10 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          )
        }
      />

      {/* Main Operational Container */}
      <main className="mx-auto max-w-lg px-4 pt-4 space-y-4">
        {isError ? (
          <PwaErrorState
            title="Production Management Unavailable"
            message="Could not load production prep jobs and queue status."
            onRetry={handleRefetch}
          />
        ) : isLoading ? (
          <PwaLoadingState message="Loading bespoke fabrication queue..." />
        ) : (
          <>
            {tab === 'home' &&
              (selectedEvent ? (
                <EventJobsView
                  event={selectedEvent}
                  jobs={productionJobs.filter((j) => j.eventId === selectedEvent.id)}
                  onBack={() => setSelectedEvent(null)}
                  onOpen={setOpenJob}
                />
              ) : (
                <HomeView
                  events={events}
                  jobs={productionJobs}
                  pendingCount={pendingCount}
                  onOpenEvent={setSelectedEvent}
                  onOpenNotif={setActiveNotif}
                />
              ))}

            {tab === 'calendar' && (
              <CalendarTabView
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                notes={notes}
                setNotes={setNotes}
                onSave={() => notify('Personal note saved.')}
                jobs={productionJobs}
                events={events}
              />
            )}

            {tab === 'activity' && (
              <ActivityTabView activity={activity} jobs={productionJobs} />
            )}

            {tab === 'account' && (
              <AccountTabView
                name={adminName || 'Production Manager'}
                email={adminEmail || ''}
                onLogout={logout}
              />
            )}
          </>
        )}
      </main>

      {/* Shared Bottom Navigation */}
      <PwaBottomNav
        items={navItems}
        activeId={tab}
        onSelect={(id) => {
          setTab(id as Tab)
          setSelectedEvent(null)
        }}
        ariaLabel="Production navigation"
      />

      {/* Toast Notification */}
      {toast && <PwaToast message={toast} />}

      {/* Build Review & Stage Progression Modal */}
      {activeJob && (
        <JobDetailModal
          job={activeJob}
          event={events.find((e) => e.id === activeJob.eventId)}
          onClose={() => setOpenJob(null)}
          onToggleMaterial={(materialId) =>
            toggleProductionMaterial(activeJob.id, materialId)
          }
          onNotesChange={(value) => updateProductionNotes(activeJob.id, value)}
          onAdvance={() => {
            moveProductionJob(activeJob.id, 'Awaiting Approval')
            notify('Submitted for approval.')
            setOpenJob(null)
          }}
          onApprove={() => {
            moveProductionJob(activeJob.id, 'Ready')
            notify('Approved for dispatch.')
            setOpenJob(null)
          }}
          onSendBack={() => {
            moveProductionJob(activeJob.id, 'Prepping')
            notify('Sent back for revision.')
            setOpenJob(null)
          }}
        />
      )}

      {/* Notification Inspection Modal */}
      {activeNotif && (
        <PwaModal
          isOpen={Boolean(activeNotif)}
          onClose={() => setActiveNotif(null)}
          title={activeNotif.label}
          subtitle="Fabrication & Stage Notification"
          footer={
            <div className="flex justify-end">
              <PwaButton
                variant="outline"
                size="sm"
                onClick={() => setActiveNotif(null)}
              >
                Dismiss
              </PwaButton>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2.5">
              <p className="text-xs font-medium text-foreground leading-relaxed">
                {activeNotif.detail}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[0.7rem] border-t border-border/50 pt-2.5">
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[0.6rem]">
                    Assigned Team
                  </p>
                  <p className="font-bold text-foreground mt-0.5">Production Crew A</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[0.6rem]">
                    Fabrication Lead
                  </p>
                  <p className="font-bold text-foreground mt-0.5">Marcus Vance</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[0.6rem]">
                    Target Venue
                  </p>
                  <p className="font-bold text-foreground mt-0.5">Grand Ballroom</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[0.6rem]">
                    QA Stage
                  </p>
                  <p className="font-bold text-primary mt-0.5">In Preparation</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-3 text-xs space-y-1.5">
              <p className="font-bold uppercase tracking-wider text-[0.65rem] text-muted-foreground">
                Stage Checklist &amp; Notes
              </p>
              <div className="space-y-1 text-muted-foreground text-xs">
                <p className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  Structural integrity verification complete.
                </p>
                <p className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  Custom paint finish applied &amp; drying.
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />
                  Final dimensional audit scheduled before dispatch.
                </p>
              </div>
            </div>
          </div>
        </PwaModal>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------
// Home View Component
// ----------------------------------------------------------------------

interface HomeViewProps {
  events: WarehouseEvent[]
  jobs: ProductionJob[]
  pendingCount: number
  onOpenEvent: (event: WarehouseEvent) => void
  onOpenNotif: (notif: typeof PRODUCTION_NOTIFICATIONS[number]) => void
}

function HomeView({
  events,
  jobs,
  pendingCount,
  onOpenEvent,
  onOpenNotif,
}: HomeViewProps) {
  const eventsWithJobs = useMemo(
    () => events.filter((event) => jobs.some((job) => job.eventId === event.id)),
    [events, jobs]
  )

  const inPrepCount = useMemo(
    () => jobs.filter((j) => j.stage === 'Prepping').length,
    [jobs]
  )

  const readyCount = useMemo(
    () => jobs.filter((j) => j.stage === 'Ready').length,
    [jobs]
  )

  return (
    <div className="space-y-4">
      {/* 1. High-Level Operational Metrics Strip */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <PwaCard className="p-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
            Total Builds
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-serif text-2xl font-bold text-foreground">
              {jobs.length}
            </span>
            <Layers className="size-4 text-muted-foreground" />
          </div>
        </PwaCard>

        <PwaCard className="p-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
            In Prep
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-serif text-2xl font-bold text-amber-600 dark:text-amber-400">
              {inPrepCount}
            </span>
            <Wrench className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
        </PwaCard>

        <PwaCard className="p-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
            Awaiting Review
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-serif text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {pendingCount}
            </span>
            {pendingCount > 0 ? (
              <span className="flex size-2 rounded-full bg-indigo-500 animate-pulse" />
            ) : (
              <CheckCircle2 className="size-4 text-muted-foreground" />
            )}
          </div>
        </PwaCard>

        <PwaCard className="p-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
            Dispatch Ready
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-serif text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {readyCount}
            </span>
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
        </PwaCard>
      </div>

      {/* 2. Urgent Attention Banner if Jobs Awaiting Approval */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-xs text-indigo-900 dark:text-indigo-200">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold">
              {pendingCount} bespoke build{pendingCount > 1 ? 's' : ''} awaiting approval
            </p>
            <p className="text-[0.7rem] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
              Review completed raw materials &amp; notes to release for dispatch.
            </p>
          </div>
        </div>
      )}

      {/* 3. Notifications & Prep Stage Feed */}
      <PwaCard
        title="Fabrication Stage Alerts"
        subtitle="Live prep updates across active teams"
        action={
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-primary">
            {PRODUCTION_NOTIFICATIONS.length} Alerts
          </span>
        }
      >
        <div className="space-y-2">
          {PRODUCTION_NOTIFICATIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenNotif(item)}
              className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-2.5 text-left transition-colors hover:bg-accent/40 active:scale-[0.99]"
            >
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs font-bold text-foreground truncate">{item.label}</p>
                <p className="text-[0.7rem] text-muted-foreground truncate mt-0.5">
                  {item.detail}
                </p>
              </div>
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-primary shrink-0 flex items-center gap-0.5">
                Inspect <ChevronRight className="size-3" />
              </span>
            </button>
          ))}
        </div>
      </PwaCard>

      {/* 4. Active Event Workspaces */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-serif text-sm font-semibold tracking-tight uppercase tracking-[0.14em] text-foreground">
            Active Event Workspaces
          </h2>
          <span className="text-[0.65rem] text-muted-foreground uppercase font-bold tracking-wider">
            {eventsWithJobs.length} Events
          </span>
        </div>

        {eventsWithJobs.length === 0 ? (
          <PwaEmptyState
            title="No Fabrication Builds Queued"
            description="Events with bespoke fabrication commitments will appear here once allocated."
            icon={<Hammer className="size-6 text-muted-foreground" />}
          />
        ) : (
          eventsWithJobs.map((event) => {
            const eventJobs = jobs.filter((j) => j.eventId === event.id)
            const eventReady = eventJobs.filter((j) => j.stage === 'Ready').length
            const eventPercent =
              eventJobs.length > 0 ? Math.round((eventReady / eventJobs.length) * 100) : 0

            return (
              <PwaCard
                key={event.id}
                className="cursor-pointer transition-all hover:border-primary/50"
              >
                <div
                  onClick={() => onOpenEvent(event)}
                  className="space-y-3"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onOpenEvent(event)
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="size-3.5 text-primary shrink-0" />
                        <span className="font-semibold">{dateLabel(event.date)}</span>
                      </div>
                      <h3 className="font-serif text-base font-bold text-foreground mt-1 truncate">
                        {event.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="size-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wider border',
                        event.status === 'In Prep'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          : event.status === 'Completed'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-muted/60 text-muted-foreground border-border'
                      )}
                    >
                      {event.status}
                    </span>
                  </div>

                  {/* Progress Bar & Readiness Count */}
                  <div className="border-t border-border/50 pt-2.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span className="font-medium">
                        {eventJobs.length} build{eventJobs.length !== 1 ? 's' : ''} ·{' '}
                        <strong className="text-foreground">{eventReady} ready</strong>
                      </span>
                      <span className="font-bold text-primary">{eventPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${eventPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[0.65rem] text-muted-foreground font-mono">
                      ID: {event.id}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary">
                      Open Workspace <ChevronRight className="size-3.5" />
                    </span>
                  </div>
                </div>
              </PwaCard>
            )
          })
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------
// Event Workspace Drill-down View
// ----------------------------------------------------------------------

interface EventJobsViewProps {
  event: WarehouseEvent
  jobs: ProductionJob[]
  onBack: () => void
  onOpen: (job: ProductionJob) => void
}

function EventJobsView({ event, jobs, onBack, onOpen }: EventJobsViewProps) {
  const readyCount = useMemo(() => jobs.filter((j) => j.stage === 'Ready').length, [jobs])

  return (
    <div className="space-y-4">
      {/* Event Header Banner */}
      <PwaCard>
        <div className="flex items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mb-2 -ml-1 cursor-pointer"
            >
              <ChevronLeft className="size-4" />
              <span>Back to Schedule</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5 text-primary" />
              <span>{dateLabel(event.date)}</span>
              <span>·</span>
              <span className="font-mono text-[0.65rem]">{event.id}</span>
            </div>
            <h2 className="font-serif text-lg font-bold text-foreground mt-1">
              {event.name}
            </h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="size-3 text-muted-foreground" />
              <span>{event.venue}</span>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            {readyCount}/{jobs.length} Ready
          </span>
        </div>
      </PwaCard>

      {/* Builds List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-serif text-sm font-semibold tracking-tight uppercase tracking-[0.14em] text-foreground">
            Bespoke Builds for Event
          </h3>
          <span className="text-[0.65rem] text-muted-foreground font-bold uppercase">
            {jobs.length} Total
          </span>
        </div>

        {jobs.length === 0 ? (
          <PwaEmptyState
            title="No Builds Assigned"
            description="No bespoke fabrication units have been allocated to this event roster."
            icon={<Hammer className="size-6 text-muted-foreground" />}
          />
        ) : (
          jobs.map((job) => (
            <PwaCard
              key={job.id}
              className="cursor-pointer transition-all hover:border-primary/50"
            >
              <div
                onClick={() => onOpen(job)}
                className="flex items-center gap-3"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpen(job)
                  }
                }}
              >
                <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary flex items-center justify-center">
                  {job.imageUrl ? (
                    <img
                      src={job.imageUrl}
                      alt={job.itemName}
                      crossOrigin="anonymous"
                      className="size-full object-cover"
                    />
                  ) : (
                    <Hammer className="size-6 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <h4 className="font-serif text-sm font-bold text-foreground truncate">
                      {job.itemName}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {job.crew.length > 0 ? job.crew.join(', ') : 'Unassigned'}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider border',
                        getStageBadgeClass(job.stage)
                      )}
                    >
                      {job.stage}
                    </span>
                    <span className="text-[0.65rem] text-muted-foreground">
                      {job.estimatedHours}h est.
                    </span>
                  </div>
                </div>

                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </div>
            </PwaCard>
          ))
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------
// Job Detail Modal (Review & Progression)
// ----------------------------------------------------------------------

interface JobDetailModalProps {
  job: ProductionJob
  event?: WarehouseEvent
  onClose: () => void
  onToggleMaterial: (materialId: string) => void
  onNotesChange: (value: string) => void
  onAdvance: () => void
  onApprove: () => void
  onSendBack: () => void
}

function JobDetailModal({
  job,
  event,
  onClose,
  onToggleMaterial,
  onNotesChange,
  onAdvance,
  onApprove,
  onSendBack,
}: JobDetailModalProps) {
  const canSubmit = job.stage === 'Unprepped' || job.stage === 'Prepping'
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const verifiedMaterials = useMemo(
    () => job.materials.filter((m) => m.checked).length,
    [job.materials]
  )

  return (
    <PwaModal
      isOpen={true}
      onClose={onClose}
      title={job.itemName}
      subtitle={event ? `${event.name} · ${event.venue}` : 'Fabrication Unit Review'}
      footer={
        <div className="space-y-2">
          {canSubmit && (
            <PwaButton
              variant="primary"
              size="lg"
              className="w-full"
              disabled={job.notes.trim().length === 0}
              onClick={onAdvance}
              icon={<Check className="size-4" />}
            >
              Submit for Approval
            </PwaButton>
          )}

          {job.stage === 'Awaiting Approval' && (
            <div className="flex gap-2">
              <PwaButton
                variant="outline"
                size="md"
                className="flex-1"
                onClick={onSendBack}
                icon={<Undo2 className="size-4" />}
              >
                Send Back
              </PwaButton>
              <PwaButton
                variant="primary"
                size="md"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={onApprove}
                icon={<Check className="size-4" />}
              >
                Approve Dispatch
              </PwaButton>
            </div>
          )}

          {job.stage === 'Ready' && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4" />
              Approved and Ready for Warehouse Dispatch
            </div>
          )}

          {canSubmit && job.notes.trim().length === 0 && (
            <p className="text-center text-[0.7rem] text-muted-foreground">
              Add build progress notes below before submitting.
            </p>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Stage Progression Stepper */}
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Fabrication Stage Progression
          </p>
          <div className="grid grid-cols-4 gap-1.5" role="img" aria-label={`Stage: ${job.stage}`}>
            {STAGE_ORDER.map((stageItem, index) => {
              const activeIndex = STAGE_ORDER.indexOf(job.stage)
              const isPast = index < activeIndex
              const isCurrent = index === activeIndex

              return (
                <div
                  key={stageItem}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-xl border px-1 py-2 text-center text-[0.625rem] font-bold uppercase tracking-tight transition-all',
                    isCurrent && 'border-primary bg-primary text-primary-foreground shadow-sm',
                    isPast && 'border-primary/40 bg-primary/10 text-foreground',
                    !isCurrent && !isPast && 'border-border bg-muted/40 text-muted-foreground'
                  )}
                >
                  <div className="flex items-center gap-0.5">
                    {isPast && <Check className="size-3 text-primary shrink-0" />}
                    <span className="truncate">{stageItem}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Job Specifications Card */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/70 bg-muted/20 p-3 text-xs">
          <div>
            <p className="text-muted-foreground text-[0.625rem] uppercase font-bold tracking-wider">
              Assigned Crew
            </p>
            <p className="font-semibold text-foreground mt-0.5 truncate">
              {job.crew.join(', ') || 'Unassigned'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[0.625rem] uppercase font-bold tracking-wider">
              Man Count
            </p>
            <p className="font-semibold text-foreground mt-0.5">{job.manCount} staff</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[0.625rem] uppercase font-bold tracking-wider">
              Est. Duration
            </p>
            <p className="font-semibold text-foreground mt-0.5">{job.estimatedHours} hours</p>
          </div>
        </div>

        {/* Raw Materials Checklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground">
              Raw Materials Verification
            </p>
            <span className="text-[0.65rem] font-bold text-muted-foreground">
              {verifiedMaterials} of {job.materials.length} Verified
            </span>
          </div>

          <div className="space-y-1.5 rounded-xl border border-border/80 bg-card p-2.5">
            {job.materials.map((mat) => (
              <label
                key={mat.id}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg p-2 text-xs transition-colors hover:bg-muted/40 cursor-pointer',
                  mat.checked && 'bg-muted/20'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={mat.checked}
                    onChange={() => onToggleMaterial(mat.id)}
                    className="size-4 rounded border-border accent-primary cursor-pointer shrink-0"
                  />
                  <span
                    className={cn(
                      'font-medium truncate',
                      mat.checked && 'text-muted-foreground line-through'
                    )}
                  >
                    {mat.name}
                  </span>
                </div>
                <span className="text-[0.65rem] font-mono text-muted-foreground shrink-0 rounded bg-muted/60 px-1.5 py-0.5">
                  {mat.qty} {mat.unit}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Build Notes Textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Fabrication &amp; Progress Notes
          </label>
          <textarea
            value={job.notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
            placeholder="Record fabrication milestones, QA notes, or specific material concerns..."
            className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        {/* Optional Photo Attachment */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">
            Verification Photo (Optional)
          </p>
          <input
            id="production-photo-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {photoPreview ? (
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" /> Photo Attached
                </span>
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </div>
              <img
                src={photoPreview}
                alt="Attached build verification"
                className="h-36 w-full rounded-lg object-cover"
              />
            </div>
          ) : (
            <PwaButton
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => document.getElementById('production-photo-input')?.click()}
              icon={<Camera className="size-4" />}
            >
              Attach Verification Photo
            </PwaButton>
          )}
        </div>
      </div>
    </PwaModal>
  )
}

// ----------------------------------------------------------------------
// Calendar Tab View Component
// ----------------------------------------------------------------------

interface CalendarTabViewProps {
  selectedDate: string
  setSelectedDate: (date: string) => void
  notes: Record<string, string>
  setNotes: (updater: (current: Record<string, string>) => Record<string, string>) => void
  onSave: () => void
  jobs: ProductionJob[]
  events: WarehouseEvent[]
}

function CalendarTabView({
  selectedDate,
  setSelectedDate,
  notes,
  setNotes,
  onSave,
  jobs,
  events,
}: CalendarTabViewProps) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const scheduleDates = useMemo(() => new Set(SCHEDULE.map((item) => item.date)), [])
  const eventDates = useMemo(() => new Set(events.map((event) => event.date)), [events])

  const meetingsToday = useMemo(
    () => SCHEDULE.filter((item) => item.date === selectedDate),
    [selectedDate]
  )

  const eventsToday = useMemo(
    () => events.filter((event) => event.date === selectedDate),
    [events, selectedDate]
  )

  const jobsForEventsToday = useMemo(
    () => jobs.filter((job) => eventsToday.some((event) => event.id === job.eventId)),
    [jobs, eventsToday]
  )

  const noteValue = notes[selectedDate] ?? ''

  return (
    <div className="space-y-4">
      {/* Calendar Grid Card */}
      <PwaCard>
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <PwaButton
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate('2026-08-01')}
            aria-label="Previous month"
            icon={<ChevronLeft className="size-4" />}
          >
            Jul
          </PwaButton>
          <h3 className="font-serif text-base font-bold text-foreground">August 2026</h3>
          <PwaButton
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate('2026-08-31')}
            aria-label="Next month"
            icon={<ChevronRight className="size-4" />}
          >
            Sep
          </PwaButton>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
          <div className="col-span-7 grid grid-cols-7 font-bold text-muted-foreground pb-1 text-[0.65rem]">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
              <span key={`${d}-${idx}`}>{d}</span>
            ))}
          </div>

          {/* Month start pad for Aug 1, 2026 (Saturday) */}
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />

          {days.map((day) => {
            const dateStr = `2026-08-${String(day).padStart(2, '0')}`
            const hasSchedule = scheduleDates.has(dateStr) || eventDates.has(dateStr)
            const hasNote = Boolean(notes[dateStr])
            const isSelected = dateStr === selectedDate

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl p-1.5 transition-all text-xs min-h-[40px]',
                  isSelected
                    ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                    : hasSchedule
                      ? 'font-bold text-primary hover:bg-muted/60'
                      : 'hover:bg-muted/40 text-foreground'
                )}
              >
                <span>{day}</span>
                <span className="mt-0.5 flex items-center justify-center gap-0.5">
                  {hasSchedule && (
                    <span
                      className={cn(
                        'size-1 rounded-full',
                        isSelected ? 'bg-primary-foreground' : 'bg-primary'
                      )}
                    />
                  )}
                  {hasNote && (
                    <span
                      className={cn(
                        'size-1 rounded-full border',
                        isSelected
                          ? 'border-primary-foreground bg-primary-foreground/50'
                          : 'border-foreground bg-foreground/50'
                      )}
                    />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </PwaCard>

      {/* Selected Day Schedule */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-serif text-sm font-semibold tracking-tight uppercase tracking-[0.14em] text-foreground">
            Schedule for {dateLabel(selectedDate)}
          </h3>
          <span className="text-[0.65rem] text-muted-foreground font-bold uppercase">
            {meetingsToday.length + eventsToday.length} Entries
          </span>
        </div>

        {meetingsToday.map((entry) => (
          <PwaCard key={`${entry.date}-${entry.time}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.6rem] font-bold text-primary uppercase">
                  <Clock className="size-3" /> {entry.time} · Meeting
                </span>
                <h4 className="font-serif text-sm font-bold text-foreground mt-1.5">
                  {entry.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">{entry.venue}</p>
              </div>
            </div>
          </PwaCard>
        ))}

        {eventsToday.map((event) => {
          const buildsForEvent = jobsForEventsToday.filter((j) => j.eventId === event.id)
          return (
            <PwaCard key={event.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.6rem] font-bold text-amber-700 dark:text-amber-300 uppercase">
                    Event Fabrication
                  </span>
                  <h4 className="font-serif text-sm font-bold text-foreground mt-1.5">
                    {event.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {event.venue} · {buildsForEvent.length} build{buildsForEvent.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </PwaCard>
          )
        })}

        {meetingsToday.length === 0 && eventsToday.length === 0 && (
          <PwaEmptyState
            title="Nothing Scheduled"
            description="No fabrication muster meetings or events on this calendar date."
            icon={<CalendarDays className="size-6 text-muted-foreground" />}
          />
        )}

        {/* Personal Note Card */}
        <PwaCard title="Personal Reminders" subtitle={`Notes for ${dateLabel(selectedDate)}`}>
          <div className="space-y-3">
            <textarea
              value={noteValue}
              onChange={(e) =>
                setNotes((current) => ({ ...current, [selectedDate]: e.target.value }))
              }
              rows={3}
              placeholder="Add personal fabrication notes, supplier callback reminders, or prep tasks..."
              className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <div className="flex justify-end">
              <PwaButton
                variant="primary"
                size="sm"
                onClick={onSave}
                icon={<FileText className="size-3.5" />}
              >
                Save Reminder
              </PwaButton>
            </div>
          </div>
        </PwaCard>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------
// Activity Tab View Component
// ----------------------------------------------------------------------

interface ActivityTabViewProps {
  activity: { id: string; message: string; at: string }[]
  jobs: ProductionJob[]
}

function ActivityTabView({ activity, jobs }: ActivityTabViewProps) {
  const readyJobs = useMemo(() => jobs.filter((j) => j.stage === 'Ready'), [jobs])

  return (
    <div className="space-y-4">
      {/* Recent Activity Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-serif text-sm font-semibold tracking-tight uppercase tracking-[0.14em] text-foreground">
            Recent Fabrication Activity
          </h2>
          <span className="text-[0.65rem] text-muted-foreground font-bold uppercase">
            Audit Log
          </span>
        </div>

        {activity.length === 0 ? (
          <PwaEmptyState
            title="No Activity Logged"
            description="Recent fabrication milestones, QA submissions, and approvals will appear here."
            icon={<FileText className="size-6 text-muted-foreground" />}
          />
        ) : (
          activity.map((entry) => (
            <PwaCard key={entry.id} className="p-3.5">
              <p className="text-xs font-medium text-foreground leading-relaxed">
                {entry.message}
              </p>
              <p className="mt-1.5 text-[0.65rem] font-mono text-muted-foreground/80 border-t border-border/50 pt-1.5">
                {entry.at}
              </p>
            </PwaCard>
          ))
        )}
      </div>

      {/* Ready for Dispatch Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-serif text-sm font-semibold tracking-tight uppercase tracking-[0.14em] text-foreground">
            Ready for Logistics Dispatch
          </h2>
          <span className="text-[0.65rem] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
            {readyJobs.length} Approved
          </span>
        </div>

        {readyJobs.length === 0 ? (
          <PwaEmptyState
            title="No Builds Ready"
            description="Bespoke builds approved for warehouse dispatch will be staged here."
            icon={<CheckCircle2 className="size-6 text-muted-foreground" />}
          />
        ) : (
          readyJobs.map((job) => (
            <PwaCard key={job.id} className="p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-serif text-sm font-bold text-foreground truncate">
                    {job.itemName}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    Crew: {job.crew.join(', ') || 'Assigned'}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-[0.65rem] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                  Ready
                </span>
              </div>
            </PwaCard>
          ))
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------
// Account Tab View Component
// ----------------------------------------------------------------------

interface AccountTabViewProps {
  name: string
  email: string
  onLogout: () => void
}

function AccountTabView({ name, email, onLogout }: AccountTabViewProps) {
  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <PwaCard>
        <div className="flex items-center gap-3.5">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-serif text-lg font-bold shadow-md">
            {(name || 'PM').slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-lg font-bold text-foreground truncate">{name}</h3>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <PwaBadge variant="accent" label="Production Manager" />
              <PwaBadge variant="subrole" subRole="Production" label="Bespoke Fabrication" />
            </div>
          </div>
        </div>
      </PwaCard>

      {/* Operational Scope & Authority */}
      <PwaCard
        title="Fabrication Operations Authority"
        subtitle="Assigned production scope and QA sign-off privileges"
      >
        <div className="space-y-2.5 text-xs">
          <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-2.5">
            <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Bespoke Build Sign-Off</p>
              <p className="text-muted-foreground text-[0.7rem] mt-0.5">
                Authorized to advance builds through QA stages and issue final approvals for warehouse dispatch.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-2.5">
            <Wrench className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Raw Material &amp; Checklist Verification</p>
              <p className="text-muted-foreground text-[0.7rem] mt-0.5">
                Reviews raw material readiness, dimensional integrity, and custom fabrication specifications.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-2.5">
            <Lock className="size-4 shrink-0 text-primary mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Shift &amp; Crew Roster Coordination</p>
              <p className="text-muted-foreground text-[0.7rem] mt-0.5">
                Oversees production crews across morning and night shifts to maintain delivery velocity.
              </p>
            </div>
          </div>
        </div>
      </PwaCard>

      {/* Sign Out Action */}
      <PwaCard>
        <PwaButton
          id="production-signout-btn"
          onClick={onLogout}
          variant="outline"
          size="lg"
          className="w-full text-destructive hover:bg-destructive/10 border-destructive/30"
          icon={<LogOut className="size-4" />}
        >
          Sign Out of Production Console
        </PwaButton>
      </PwaCard>
    </div>
  )
}
