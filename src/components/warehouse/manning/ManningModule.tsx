import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  Clock,
  Download,
  UserPlus,
  Users,
  X,
  Search,
  Maximize2,
} from 'lucide-react'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import {
  useCrewRows,
  getPresetSquads,
  type CrewRow,
} from '@/lib/warehouse-crew'
import {
  reconcileExpiredDeclarations,
  useGroundCrewDeclarations,
} from '@/lib/ground-crew-declarations'
import { CrewOpsGrid } from '@/components/warehouse/manpower/CrewOpsGrid'
import { DailyZoneDutyView } from '@/components/warehouse/manpower/DailyZoneDutyView'
import { AssignCrewModal } from '@/components/warehouse/manpower/AssignCrewModal'
import {
  confirmTask,
  formatSlaCountdown,
  isSlaOverdue,
  rejectTask,
  slaRemainingMs,
  useManningData,
  type ManningAssignment,
  type ManningTask,
} from '@/lib/manning'
import { cn } from '@/lib/utils'
import { exportCrewRosterPdf } from '@/lib/pdf-exporter'

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.6rem] font-bold uppercase tracking-wide text-primary ring-1 ring-border">
      {initials}
    </span>
  )
}

type TopLevelTab = 'daily' | 'event'
type EventSubTab = 'schedule' | 'assignments' | 'tasks'

interface ManningModuleProps {
  onClose: () => void
}

export function ManningModule({ onClose }: ManningModuleProps) {
  const { staff, events } = usePortal()
  const { adminName, adminEmail } = useAuth()
  const actor = adminName || adminEmail || 'WOM'

  // Shared Crew Data
  const crewRows = useCrewRows(staff, events)
  const presetSquads = useMemo(() => getPresetSquads(staff), [staff])

  // Manning Delegation Data
  const { assignments, tasks, reload } = useManningData()
  const declarations = useGroundCrewDeclarations()

  // Navigation State
  const [topTab, setTopTab] = useState<TopLevelTab>('daily')
  const [dailyViewMode, setDailyViewMode] = useState<'matrix' | 'detail'>('matrix')
  const [eventSubTab, setEventSubTab] = useState<EventSubTab>('schedule')

  // Roster Directory Search & Filter State
  const [directoryQuery, setDirectoryQuery] = useState('')
  const [directoryStatusFilter, setDirectoryStatusFilter] = useState<'All' | 'Available' | 'Assigned' | 'On Leave'>('All')

  // Modal / Drawer States
  const [rosterOpen, setRosterOpen] = useState(true)
  const [assignOpen, setAssignOpen] = useState(false)
  const [fullRosterModalOpen, setFullRosterModalOpen] = useState(false)

  // Card Click Inspection Detail Modals
  const [selectedAssignment, setSelectedAssignment] = useState<ManningAssignment | null>(null)
  const [selectedTask, setSelectedTask] = useState<ManningTask | null>(null)

  // Real-time clock tick for task countdown displays
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    reconcileExpiredDeclarations()
  }, [declarations])

  // Filtered Roster Directory Rows
  const filteredDirectoryRows = useMemo(() => {
    const q = directoryQuery.trim().toLowerCase()
    return crewRows.filter((crew) => {
      const matchesStatus = directoryStatusFilter === 'All' || crew.status === directoryStatusFilter
      const matchesQuery = !q || crew.name.toLowerCase().includes(q) || crew.role.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [crewRows, directoryQuery, directoryStatusFilter])

  const handleExportCrewRoster = (assignment: ManningAssignment) => {
    const crewMembers = assignment.member_names.map((name) => {
      const matchedStaff = staff.find((s) => `${s.firstName} ${s.surname}`.trim().toLowerCase() === name.trim().toLowerCase())
      const matchedRow = crewRows.find((r) => r.name.trim().toLowerCase() === name.trim().toLowerCase())
      const isLead = name.trim().toLowerCase() === assignment.lead_name.trim().toLowerCase()

      let dept: 'Field' | 'Warehouse' | 'Production' = 'Field'
      const roleLower = (matchedStaff?.role || matchedRow?.role || '').toLowerCase()
      if (roleLower.includes('warehouse')) dept = 'Warehouse'
      else if (roleLower.includes('production') || roleLower.includes('floral') || roleLower.includes('canvas')) dept = 'Production'

      return {
        name,
        role: matchedStaff?.role || matchedRow?.role || (isLead ? 'Field Team Lead' : 'Field Operations Crew'),
        department: dept,
        isTeamLead: isLead,
        assignmentDate: assignment.work_date,
        dutyCategory: `${dept} Duty`,
      }
    })

    if (!crewMembers.some((c) => c.isTeamLead) && assignment.lead_name) {
      crewMembers.unshift({
        name: assignment.lead_name,
        role: 'Field Team Lead',
        department: 'Field',
        isTeamLead: true,
        assignmentDate: assignment.work_date,
        dutyCategory: 'Field Duty',
      })
    }

    exportCrewRosterPdf(
      {
        eventTitle: assignment.event_name,
        venue: assignment.venue || 'Event Venue',
        targetDate: assignment.work_date,
      },
      crewMembers,
    )
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-background">
      {/* ─── Header & Title ─── */}
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:px-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.24em] text-primary">Warehouse module</p>
            <h1 className="mt-1 font-serif text-2xl font-medium text-foreground">Manning Delegation</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ground crew scheduling, 48h task confirmations, and warning enforcement.
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

        {/* ─── Top-Level Navigation Tabs ─── */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
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
              Crew Directory ({filteredDirectoryRows.length}/{crewRows.length})
            </button>

            {topTab === 'event' && (
              <button
                type="button"
                onClick={() => setAssignOpen(true)}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90"
              >
                <UserPlus className="size-3.5" />
                Assign Field Crew
              </button>
            )}
          </div>
        </div>

        {/* ─── Nested Sub-Tabs (when topTab === 'daily') ─── */}
        {topTab === 'daily' && (
          <div className="flex flex-col gap-3 border-t border-border pt-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex rounded-md border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setDailyViewMode('matrix')}
                aria-pressed={dailyViewMode === 'matrix'}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                  dailyViewMode === 'matrix' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                Weekly Roster Matrix
              </button>
              <button
                type="button"
                onClick={() => setDailyViewMode('detail')}
                aria-pressed={dailyViewMode === 'detail'}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                  dailyViewMode === 'detail' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                Daily Department &amp; Zone Detail
              </button>
            </div>
          </div>
        )}

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
                48h Task Confirmations ({tasks.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Compact Scrollable Crew Roster Directory with Search & Filters ─── */}
      {rosterOpen && (
        <div className="border-b border-border bg-card/60 px-6 py-3 sm:px-10 space-y-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-foreground">
                Shared Crew Directory ({filteredDirectoryRows.length})
              </h3>
              <button
                type="button"
                onClick={() => setFullRosterModalOpen(true)}
                title="Expand full crew directory modal"
                className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <Maximize2 className="size-3" />
                Expand
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={directoryQuery}
                  onChange={(e) => setDirectoryQuery(e.target.value)}
                  placeholder="Search crew name or role..."
                  className="w-48 sm:w-56 rounded-md border border-input bg-background py-1.5 pl-8 pr-2.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="inline-flex rounded-md border border-border bg-background p-0.5">
                {(['All', 'Available', 'Assigned', 'On Leave'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setDirectoryStatusFilter(st)}
                    className={cn(
                      'rounded-sm px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-wider transition',
                      directoryStatusFilter === st
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Compact Scrollable List Container */}
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {filteredDirectoryRows.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No crew members match the search filter.</p>
            ) : (
              filteredDirectoryRows.map((crew) => (
                <div
                  key={crew.id}
                  className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left transition hover:border-primary/50 hover:bg-accent/40"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <Avatar name={crew.name} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{crew.name}</p>
                      <p className="truncate text-[0.58rem] uppercase tracking-wider text-muted-foreground">{crew.role}</p>
                    </div>
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
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 px-6 py-6 sm:px-10">
        {topTab === 'daily' ? (
          dailyViewMode === 'matrix' ? (
            <CrewOpsGrid staff={staff} />
          ) : (
            <DailyZoneDutyView crewRows={crewRows} presetSquads={presetSquads} />
          )
        ) : (
          <div className="flex flex-col gap-5">
            {/* SUB-TAB: ASSIGNMENTS / EVENT SCHEDULE */}
            {(eventSubTab === 'assignments' || eventSubTab === 'schedule') && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Event Manning &amp; Crew Roster</h2>
                    <p className="text-xs text-muted-foreground">Active and upcoming ground crew deployment records per event.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      onClick={() => setSelectedAssignment(assignment)}
                      className="rounded-xl border border-border bg-card p-4 shadow-sm cursor-pointer hover:border-primary/50 hover:bg-accent/40 transition-all space-y-3"
                    >
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
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExportCrewRoster(assignment)
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-card-foreground transition hover:bg-accent hover:border-primary/50"
                          >
                            <Download className="size-3" />
                            Export Roster (PDF)
                          </button>
                          <span
                            className={cn(
                              'rounded px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider',
                              assignment.status === 'Active' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {assignment.status}
                          </span>
                        </div>
                      </div>
                      {assignment.member_names.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
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

            {/* SUB-TAB: TASKS */}
            {eventSubTab === 'tasks' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-foreground">48h Task Confirmations</h2>
                    <p className="text-xs text-muted-foreground">Tasks requiring lead confirmation within the 48-hour window.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {tasks.map((task) => {
                    const overdue = isSlaOverdue(task, now)
                    const remMs = slaRemainingMs(task, now)
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={cn(
                          'rounded-xl border bg-card p-4 shadow-sm transition-all cursor-pointer hover:border-primary/50 hover:bg-accent/40',
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
                            {remMs !== null && overdue && (
                              <span
                                className={cn(
                                  'text-[0.62rem] font-mono font-semibold text-destructive',
                                )}
                              >
                                {formatSlaCountdown(remMs).replace('overdue', 'Confirmation Overdue')}
                              </span>
                            )}
                          </div>
                        </div>

                        {task.status === 'Submitted' && (
                          <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                rejectTask(task.id)
                                reload()
                              }}
                              className="rounded-md border border-destructive/40 px-3 py-1 text-[0.62rem] font-semibold text-destructive hover:bg-destructive/10"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
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
          </div>
        )}
      </div>

      {/* ─── Assign Field Crew Modal ─── */}
      {assignOpen && (
        <AssignCrewModal
          events={events}
          crewRows={crewRows}
          presetSquads={presetSquads}
          onClose={() => setAssignOpen(false)}
        />
      )}

      {/* ─── Full Roster Expanded Modal ─── */}
      {fullRosterModalOpen && (
        <FullRosterModal
          crewRows={crewRows}
          onClose={() => setFullRosterModalOpen(false)}
          onSelectMember={() => {
            setFullRosterModalOpen(false)
          }}
        />
      )}

      {/* ─── Detail Inspection Modals ─── */}
      {selectedAssignment && (
        <AssignmentDetailModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
          onExport={handleExportCrewRoster}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onReject={() => {
            rejectTask(selectedTask.id)
            reload()
          }}
          onConfirm={() => {
            confirmTask(selectedTask.id, actor)
            reload()
          }}
        />
      )}
    </div>
  )
}

function FullRosterModal({
  crewRows,
  onClose,
  onSelectMember,
}: {
  crewRows: CrewRow[]
  onClose: () => void
  onSelectMember: (crew: CrewRow) => void
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Available' | 'Assigned' | 'On Leave'>('All')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return crewRows.filter((crew) => {
      const matchesStatus = statusFilter === 'All' || crew.status === statusFilter
      const matchesQuery = !q || crew.name.toLowerCase().includes(q) || crew.role.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [crewRows, query, statusFilter])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl space-y-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div>
            <span className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-primary">
              Ground Crew Directory
            </span>
            <h2 className="font-serif text-xl font-bold text-card-foreground">
              Full Crew Roster ({filtered.length}/{crewRows.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by crew name or role..."
              className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="inline-flex rounded-md border border-border bg-background p-1">
            {(['All', 'Available', 'Assigned', 'On Leave'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider transition',
                  statusFilter === st
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[28rem] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="py-16 text-center text-xs text-muted-foreground">No crew members match the search query.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((crew) => (
                <button
                  key={crew.id}
                  type="button"
                  onClick={() => onSelectMember(crew)}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-left transition hover:border-primary/50 hover:bg-accent/40 hover:shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <Avatar name={crew.name} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{crew.name}</p>
                      <p className="truncate text-[0.58rem] uppercase tracking-wider text-muted-foreground">{crew.role}</p>
                    </div>
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
          )}
        </div>

        <div className="flex justify-end border-t border-border pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent"
          >
            Close Roster
          </button>
        </div>
      </div>
    </div>
  )
}

function AssignmentDetailModal({
  assignment,
  onClose,
  onExport,
}: {
  assignment: ManningAssignment
  onClose: () => void
  onExport?: (assignment: ManningAssignment) => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl bg-card p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div>
            <span className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-primary">
              Manning Assignment Record
            </span>
            <h2 className="font-serif text-xl font-medium text-card-foreground">
              {assignment.event_name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-border bg-background p-3">
            <span className="text-[0.55rem] font-bold uppercase tracking-wider text-muted-foreground block">
              Deployment Ref
            </span>
            <span className="font-mono text-xs font-semibold text-card-foreground">
              {assignment.deployment_ref || 'N/A'}
            </span>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <span className="text-[0.55rem] font-bold uppercase tracking-wider text-muted-foreground block">
              Status
            </span>
            <span className="font-bold text-emerald-600">{assignment.status}</span>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <span className="text-[0.55rem] font-bold uppercase tracking-wider text-muted-foreground block">
              Work Date
            </span>
            <span className="font-semibold text-card-foreground">{assignment.work_date}</span>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <span className="text-[0.55rem] font-bold uppercase tracking-wider text-muted-foreground block">
              Lead Officer
            </span>
            <span className="font-semibold text-card-foreground">{assignment.lead_name}</span>
          </div>
        </div>

        {assignment.venue && (
          <div className="rounded-lg border border-border bg-background p-3 text-xs">
            <span className="text-[0.55rem] font-bold uppercase tracking-wider text-muted-foreground block">
              Venue
            </span>
            <span className="font-semibold text-card-foreground">{assignment.venue}</span>
          </div>
        )}

        <div>
          <span className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
            Assigned Crew Members ({assignment.member_names.length})
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
            {assignment.member_names.map((name) => (
              <span
                key={name}
                className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-card-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <button
            type="button"
            onClick={() => {
              onExport?.(assignment)
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-card-foreground hover:bg-accent"
          >
            <Download className="size-3.5" />
            Export Roster (PDF)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function TaskDetailModal({
  task,
  onClose,
  onReject,
  onConfirm,
}: {
  task: ManningTask
  onClose: () => void
  onReject: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl bg-card p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div>
            <span className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-primary">
              48h Confirmation Task Detail
            </span>
            <h2 className="font-serif text-xl font-medium text-card-foreground">{task.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground leading-relaxed">
          <span className="text-[0.55rem] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Task Description
          </span>
          {task.description}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-border bg-background p-3">
            <span className="text-[0.55rem] font-bold uppercase tracking-wider text-muted-foreground block">
              Lead Officer
            </span>
            <span className="font-semibold text-card-foreground">{task.lead_name}</span>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <span className="text-[0.55rem] font-bold uppercase tracking-wider text-muted-foreground block">
              Status
            </span>
            <span className="font-bold text-amber-600">{task.status}</span>
          </div>
        </div>

        {task.status === 'Submitted' && (
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => {
                onReject()
                onClose()
              }}
              className="rounded-md border border-destructive/40 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
            >
              Reject Task
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-700"
            >
              Confirm Task
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


