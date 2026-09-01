import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Copy,
  List,
  Plus,
  Search,
  ShieldAlert,
  Timer,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import {
  getPresetSquads,
  useCrewRows,
  useShiftGrid,
  getOpsWeekDates,
  type CrewRow,
  type CrewRowStatus,
} from '@/lib/warehouse-crew'
import type { CrewAssignmentStatus, EventCrewAssignment } from '@/lib/event-detail'
import { CrewListView } from '@/components/warehouse/manpower/CrewListView'
import { CrewCalendarView } from '@/components/warehouse/manpower/CrewCalendarView'
import { CrewOpsGrid } from '@/components/warehouse/manpower/CrewOpsGrid'
import { AssignCrewModal } from '@/components/warehouse/manpower/AssignCrewModal'
import { CrewInfoModal } from '@/components/warehouse/event-detail/CrewInfoModal'
import {
  useGroundCrewDeclarations,
  reconcileExpiredDeclarations,
  getManningFallbackDeclarations,
  getApproachingDeclarationsSummary,
} from '@/lib/ground-crew-declarations'
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
  type ManningWarning,
} from '@/lib/manning'
import { cn } from '@/lib/utils'

// Maps the Manning module's status vocabulary onto EventCrewAssignment status
const ROW_STATUS_TO_ASSIGNMENT: Record<CrewRowStatus, CrewAssignmentStatus> = {
  Available: 'Pending',
  Assigned: 'Confirmed',
  'On Leave': 'Unavailable',
}
function toCrewAssignment(row: CrewRow): EventCrewAssignment {
  return { id: row.id, name: row.name, role: row.role, status: ROW_STATUS_TO_ASSIGNMENT[row.status] }
}

type TopLevelTab = 'daily' | 'event'
type EventSubTab = 'schedule' | 'assignments' | 'tasks' | 'warnings'
type ScheduleViewMode = 'list' | 'calendar'

interface ManningModuleProps {
  onClose: () => void
}

export function ManningModule({ onClose }: ManningModuleProps) {
  const { staff, events } = usePortal()
  const { hasFullWarehouseAccess, isManningOfficer, adminName, adminEmail } = useAuth()
  const actor = adminName || adminEmail || 'WOM'

  // Shared Crew Data
  const crewRows = useCrewRows(staff, events)
  const presetSquads = useMemo(() => getPresetSquads(staff), [staff])

  // Manning & SLA Engine Data
  const { assignments, tasks, warnings, loading, error, reload } = useManningData()
  const declarations = useGroundCrewDeclarations()

  // Navigation State
  const [topTab, setTopTab] = useState<TopLevelTab>('daily')
  const [eventSubTab, setEventSubTab] = useState<EventSubTab>('schedule')
  const [scheduleViewMode, setScheduleViewMode] = useState<ScheduleViewMode>('list')

  // Search & Filter State for Event Schedule
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('All Roles')
  const [statusFilter, setStatusFilter] = useState<'All Statuses' | CrewRowStatus>('All Statuses')

  // Modals & Selection State
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedCrewRow, setSelectedCrewRow] = useState<CrewRow | null>(null)
  const [rosterOpen, setRosterOpen] = useState(true)

  // Manning & SLA Modals State
  const [now, setNow] = useState(() => new Date())
  const [busy, setBusy] = useState<string | null>(null)
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false)
  const [inheritOpen, setInheritOpen] = useState(false)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [createWarningOpen, setCreateWarningOpen] = useState(false)
  const [targetTaskForConfirm, setTargetTaskForConfirm] = useState<ManningTask | null>(null)

  // Live SLA countdowns interval (30s)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    reconcileExpiredDeclarations()
  }, [declarations])

  const canViewFullCrewDetail = hasFullWarehouseAccess || isManningOfficer

  // Stats Calculations: Daily Operations
  const totalCrew = crewRows.length
  const availableToday = crewRows.filter((row) => row.status === 'Available').length
  const assignedEvents = crewRows.filter((row) => row.status === 'Assigned').length
  const pendingLeaves = crewRows.filter((row) => row.status === 'On Leave').length

  // Stats Calculations: Event-Based Operations
  const activeAssignments = assignments.filter((a) => a.status === 'Active').length
  const awaitingConfirmation = tasks.filter((t) => t.status === 'Submitted').length
  const slaOverdue = tasks.filter((t) => isSlaOverdue(t, now)).length
  const totalEscalated = tasks.filter((t) => t.escalated).length

  // Crew Roles Filter Options
  const crewRoles = useMemo(
    () => ['All Roles', ...Array.from(new Set(crewRows.map((row) => row.role)))],
    [crewRows],
  )

  // Filtered Event Schedule Rows
  const filteredCrewRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return crewRows.filter((row) => {
      const matchesRole = roleFilter === 'All Roles' || row.role === roleFilter
      const matchesStatus = statusFilter === 'All Statuses' || row.status === statusFilter
      const matchesQuery =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q) ||
        (row.allocation?.event.toLowerCase().includes(q) ?? false) ||
        (row.allocation?.task.toLowerCase().includes(q) ?? false)
      return matchesRole && matchesStatus && matchesQuery
    })
  }, [crewRows, query, roleFilter, statusFilter])

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-background">
      {/* ─── Header & Title ─── */}
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:px-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.24em] text-primary">Warehouse module</p>
            <h1 className="mt-1 font-serif text-2xl font-medium text-foreground">Manning</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Unified crew management: daily shift rosters, event schedules, 48h SLA tasks, and warning ledgers.
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

        {/* ─── Dynamic Stat Cards (changes based on active topLevelTab) ─── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {topTab === 'daily' ? (
            <>
              <div className="rounded-lg border border-border bg-card px-4 py-3.5 border-l-4 border-l-foreground/30">
                <p className="font-sans text-2xl font-bold leading-none text-card-foreground">{totalCrew}</p>
                <p className="mt-2 text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.1em] text-muted-foreground">
                  Total Crew
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3.5 border-l-4 border-l-primary">
                <p className="font-sans text-2xl font-bold leading-none text-card-foreground">{availableToday}</p>
                <p className="mt-2 text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.1em] text-muted-foreground">
                  Available Today
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3.5 border-l-4 border-l-accent-foreground/40">
                <p className="font-sans text-2xl font-bold leading-none text-card-foreground">{assignedEvents}</p>
                <p className="mt-2 text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.1em] text-muted-foreground">
                  Auto-Scheduled
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3.5 border-l-4 border-l-destructive">
                <p className="font-sans text-2xl font-bold leading-none text-card-foreground">{pendingLeaves}</p>
                <p className="mt-2 text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.1em] text-muted-foreground">
                  Pending Leaves
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-card px-4 py-3.5 border-l-4 border-l-primary">
                <p className="font-sans text-2xl font-bold leading-none text-card-foreground">{activeAssignments}</p>
                <p className="mt-2 text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.1em] text-muted-foreground">
                  Active Assignments
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3.5 border-l-4 border-l-foreground/30">
                <p className="font-sans text-2xl font-bold leading-none text-card-foreground">{awaitingConfirmation}</p>
                <p className="mt-2 text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.1em] text-muted-foreground">
                  Awaiting Confirm
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3.5 border-l-4 border-l-destructive">
                <p className="font-sans text-2xl font-bold leading-none text-card-foreground">{slaOverdue}</p>
                <p className="mt-2 text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.1em] text-muted-foreground">
                  SLA Overdue
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3.5 border-l-4 border-l-amber-500">
                <p className="font-sans text-2xl font-bold leading-none text-card-foreground">{totalEscalated}</p>
                <p className="mt-2 text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.1em] text-muted-foreground">
                  Escalated
                </p>
              </div>
            </>
          )}
        </div>

        {/* ─── Top-Level Tabs: Daily Operations vs Event-Based Operations ─── */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pt-1">
          <div className="inline-flex rounded-lg border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setTopTab('daily')}
              aria-pressed={topTab === 'daily'}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition',
                topTab === 'daily'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Clock className="size-3.5" />
              Daily Operations
            </button>
            <button
              type="button"
              onClick={() => setTopTab('event')}
              aria-pressed={topTab === 'event'}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition',
                topTab === 'event'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <CalendarClock className="size-3.5" />
              Event-Based Operations
            </button>
          </div>

          {/* Quick Roster Drawer Toggle & Action Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRosterOpen((prev) => !prev)}
              aria-pressed={rosterOpen}
              className={cn(
                'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.1em] transition',
                rosterOpen
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
              )}
            >
              <Users className="size-3.5" />
              Crew Roster Directory ({crewRows.length})
            </button>

            {topTab === 'event' && eventSubTab === 'schedule' && (
              <button
                type="button"
                onClick={() => setAssignOpen(true)}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90"
              >
                <UserPlus className="size-3.5" />
                Assign Crew
              </button>
            )}
          </div>
        </div>

        {/* ─── Nested Sub-Tabs (when topTab === 'event') ─── */}
        {topTab === 'event' && (
          <div className="flex flex-col gap-3 border-t border-border pt-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex rounded-md border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setEventSubTab('schedule')}
                aria-pressed={eventSubTab === 'schedule'}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                  eventSubTab === 'schedule' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                Event Schedule
              </button>
              <button
                type="button"
                onClick={() => setEventSubTab('assignments')}
                aria-pressed={eventSubTab === 'assignments'}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                  eventSubTab === 'assignments' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                Assignments ({assignments.length})
              </button>
              <button
                type="button"
                onClick={() => setEventSubTab('tasks')}
                aria-pressed={eventSubTab === 'tasks'}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                  eventSubTab === 'tasks' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                SLA Tasks ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setEventSubTab('warnings')}
                aria-pressed={eventSubTab === 'warnings'}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                  eventSubTab === 'warnings' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                Warnings ({warnings.length})
              </button>
            </div>

            {/* Controls specific to Event Schedule subtab */}
            {eventSubTab === 'schedule' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-md border border-border bg-background p-1" aria-label="Schedule View">
                  <button
                    type="button"
                    onClick={() => setScheduleViewMode('list')}
                    aria-pressed={scheduleViewMode === 'list'}
                    className={cn(
                      'flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                      scheduleViewMode === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <List className="size-3" />
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleViewMode('calendar')}
                    aria-pressed={scheduleViewMode === 'calendar'}
                    className={cn(
                      'flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                      scheduleViewMode === 'calendar' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <CalendarDays className="size-3" />
                    Calendar
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search crew or event..."
                    className="w-48 rounded-md border border-input bg-background py-1.5 pl-8 pr-2.5 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="rounded-md border border-border bg-background py-1.5 px-2.5 text-xs font-medium text-foreground outline-none focus:border-primary"
                >
                  {crewRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="rounded-md border border-border bg-background py-1.5 px-2.5 text-xs font-medium text-foreground outline-none focus:border-primary"
                >
                  {(['All Statuses', 'Available', 'Assigned', 'On Leave'] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Persistent Shared Crew Roster Directory (Collapsible Section) ─── */}
      {rosterOpen && (
        <div className="border-b border-border bg-card/60 px-6 py-4 sm:px-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-foreground flex items-center gap-2">
              <Users className="size-4 text-primary" />
              Shared Crew Roster &amp; Availability Directory
            </h3>
            <span className="text-[0.62rem] text-muted-foreground">Click any member to inspect details</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {crewRows.map((crew) => (
              <button
                key={crew.id}
                type="button"
                onClick={() => setSelectedCrewRow(crew)}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 text-left transition hover:border-primary/50 hover:shadow-sm"
              >
                <div className="min-w-0 pr-2">
                  <p className="truncate text-xs font-semibold text-foreground">{crew.name}</p>
                  <p className="text-[0.58rem] text-muted-foreground">{crew.role}</p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider',
                    crew.status === 'Available'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : crew.status === 'Assigned'
                        ? 'bg-primary/15 text-primary'
                        : 'bg-destructive/15 text-destructive',
                  )}
                >
                  {crew.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 px-6 py-6 sm:px-10">
        {topTab === 'daily' ? (
          /* Daily Operations: Daily-Weekly Ops Shift Grid */
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-bold text-foreground">Daily-Weekly Operational Shift Roster</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set and cycle shift codes (AM / PM / OFF) per crew member per day. This grid represents depot/warehouse duties independent of event assignments.
              </p>
            </div>
            <CrewOpsGrid staff={staff} />
          </div>
        ) : (
          /* Event-Based Operations Sub-Tabs */
          <div>
            {eventSubTab === 'schedule' && (
              scheduleViewMode === 'list' ? (
                <CrewListView rows={filteredCrewRows} onSelect={setSelectedCrewRow} />
              ) : (
                <CrewCalendarView rows={filteredCrewRows} events={events} onSelect={setSelectedCrewRow} />
              )
            )}

            {eventSubTab === 'assignments' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground">Event Manning Assignments</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInheritOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <Copy className="size-3.5" /> Inherit Prior Roster
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateAssignmentOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-primary-foreground hover:opacity-90"
                    >
                      <Plus className="size-3.5" /> Create Assignment
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">{assignment.event_name}</span>
                            {assignment.deployment_ref && (
                              <span className="rounded bg-muted px-2 py-0.5 text-[0.6rem] font-mono text-muted-foreground">
                                {assignment.deployment_ref}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Date: <span className="font-medium text-foreground">{assignment.work_date}</span> · Lead:{' '}
                            <span className="font-medium text-foreground">{assignment.lead_name}</span>
                            {assignment.venue ? ` · Venue: ${assignment.venue}` : ''}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'rounded px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider',
                            assignment.status === 'Active' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {assignment.status}
                        </span>
                      </div>
                      {assignment.member_names.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
                          {assignment.member_names.map((name) => (
                            <span key={name} className="rounded-md border border-border bg-background px-2.5 py-1 text-[0.65rem] text-foreground">
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {eventSubTab === 'tasks' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-foreground">48h SLA Confirmation Tasks</h2>
                    <p className="text-xs text-muted-foreground">Tasks requiring lead confirmation within the 48-hour window.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateTaskOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-primary-foreground hover:opacity-90"
                  >
                    <Plus className="size-3.5" /> Issue SLA Task
                  </button>
                </div>

                <div className="space-y-3">
                  {tasks.map((task) => {
                    const overdue = isSlaOverdue(task, now)
                    const remMs = slaRemainingMs(task, now)
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'rounded-xl border bg-card p-4 shadow-sm transition',
                          overdue ? 'border-destructive/60 bg-destructive/5' : 'border-border',
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-foreground text-sm">{task.title}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                            <p className="mt-2 text-[0.65rem] text-muted-foreground">
                              Lead: <span className="font-semibold text-foreground">{task.lead_name}</span>
                              {task.assignee_name && <> · Assignee: <span className="font-semibold text-foreground">{task.assignee_name}</span></>}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span
                              className={cn(
                                'rounded px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider',
                                task.status === 'Submitted'
                                  ? 'bg-amber-500/15 text-amber-600'
                                  : task.status === 'Confirmed'
                                    ? 'bg-emerald-500/15 text-emerald-600'
                                    : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {task.status}
                            </span>
                            {remMs !== null && (
                              <span
                                className={cn(
                                  'text-[0.62rem] font-mono font-semibold',
                                  overdue ? 'text-destructive' : 'text-amber-600 dark:text-amber-400',
                                )}
                              >
                                {formatSlaCountdown(remMs)}
                              </span>
                            )}
                          </div>
                        </div>

                        {task.status === 'Submitted' && (
                          <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
                            <button
                              type="button"
                              onClick={() => {
                                rejectTask(task.id, actor, 'Rejected by WOM during SLA review')
                                reload()
                              }}
                              className="rounded-md border border-destructive/40 px-3 py-1 text-[0.62rem] font-semibold text-destructive hover:bg-destructive/10"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                confirmTask(task.id, actor)
                                reload()
                              }}
                              className="rounded-md bg-emerald-600 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-white hover:bg-emerald-700"
                            >
                              Confirm Task
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {eventSubTab === 'warnings' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Three-Tier Warning Ledger</h2>
                    <p className="text-xs text-muted-foreground">Formal warning log for SLA breaches or operational non-compliance.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateWarningOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-destructive-foreground hover:opacity-90"
                  >
                    <ShieldAlert className="size-3.5" /> Issue Warning
                  </button>
                </div>

                <div className="space-y-3">
                  {warnings.map((w) => (
                    <div key={w.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">Tier {w.tier}: {w.recipient_name}</span>
                            <span className="rounded bg-destructive/10 px-2 py-0.5 text-[0.6rem] font-semibold text-destructive">
                              {w.recipient_role}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-foreground/90">{w.reason}</p>
                          <p className="mt-2 text-[0.62rem] text-muted-foreground">
                            Issued by: <span className="font-medium text-foreground">{w.issued_by}</span> on {new Date(w.issued_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Modals ─── */}
      {assignOpen && (
        <AssignCrewModal
          events={events}
          crewRows={crewRows}
          presetSquads={presetSquads}
          onClose={() => setAssignOpen(false)}
        />
      )}

      {selectedCrewRow && (
        <CrewInfoModal
          member={toCrewAssignment(selectedCrewRow)}
          staff={staff.find((member) => member.id === selectedCrewRow.staffId) ?? null}
          canViewFullDetail={canViewFullCrewDetail}
          onClose={() => setSelectedCrewRow(null)}
        />
      )}
    </div>
  )
}
