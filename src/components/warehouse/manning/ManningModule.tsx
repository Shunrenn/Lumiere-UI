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
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import {
  canPerformRoutineRemoval,
  canPerformOverrideRemoval,
  canPerformResourceOverride,
  overrideAssignmentApi,
} from '@/lib/manningApi'
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
import { PARENT_ROLES } from '@/lib/rbac'
import {
  closeAssignment,
  useManningData,
  type ManningAssignment,
} from '@/lib/manning'
import { cn } from '@/lib/utils'
import { WarehouseModuleHeader } from '@/components/warehouse/WarehouseModuleHeader'
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

type ManningView = 'weekly' | 'coverage' | 'events' | 'rosters'

interface ManningModuleProps {
  onClose: () => void
}

export function ManningModule({ onClose }: ManningModuleProps) {
  const { staff, events } = usePortal()

  // Shared Crew Data
  const crewRows = useCrewRows(staff, events)
  const presetSquads = useMemo(() => getPresetSquads(staff), [staff])

  // Manning Delegation Data
  const { assignments, reload, loading: assignmentsLoading, error: assignmentsError } = useManningData()
  const declarations = useGroundCrewDeclarations()

  // Navigation State
  const [view, setView] = useState<ManningView>('weekly')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  // Roster Directory Search & Filter State
  const [directoryQuery, setDirectoryQuery] = useState('')
  const [directoryStatusFilter, setDirectoryStatusFilter] = useState<'All' | 'Available' | 'Assigned' | 'On Leave'>('All')

  // Modal / Drawer States
  const [rosterOpen, setRosterOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [fullRosterModalOpen, setFullRosterModalOpen] = useState(false)

  // Card Click Inspection Detail Modals
  const [selectedAssignment, setSelectedAssignment] = useState<ManningAssignment | null>(null)

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null
  const selectedEventAssignments = selectedEvent
    ? assignments.filter((assignment) => assignment.event_name.toLowerCase() === selectedEvent.title.toLowerCase() || assignment.deployment_ref === selectedEvent.id)
    : assignments

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
      <div className="flex flex-col gap-4 border-b border-border px-0 py-7">
        <div className="flex items-start justify-between gap-4">
          <WarehouseModuleHeader title="Manning Delegation" description="Ground crew scheduling, event deployments, and zone duty rosters." />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close and return to dashboard"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* ─── Primary navigation: four peer views, grouped by purpose ─── */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="mb-1 px-1 text-[0.55rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Daily Operations</p>
              <div className="inline-flex rounded-lg border border-border bg-card p-1">
                <button type="button" onClick={() => setView('weekly')} aria-pressed={view === 'weekly'} className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition', view === 'weekly' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}><Clock className="size-3.5" />Weekly Roster</button>
                <button type="button" onClick={() => setView('coverage')} aria-pressed={view === 'coverage'} className={cn('rounded-md px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition', view === 'coverage' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>Daily Coverage</button>
              </div>
            </div>
            <div>
              <p className="mb-1 px-1 text-[0.55rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Event Staffing</p>
              <div className="inline-flex rounded-lg border border-border bg-card p-1">
                <button type="button" onClick={() => setView('events')} aria-pressed={view === 'events'} className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition', view === 'events' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}><CalendarClock className="size-3.5" />Upcoming Events</button>
                <button type="button" onClick={() => setView('rosters')} aria-pressed={view === 'rosters'} className={cn('rounded-md px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition', view === 'rosters' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>Event Rosters</button>
              </div>
            </div>
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

            {(view === 'events' || view === 'rosters') && (
              <button
                type="button"
                onClick={() => setAssignOpen(true)}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90"
              >
                <UserPlus className="size-3.5" />
                Assign Event Crew
              </button>
            )}
          </div>
        </div>

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
      <div className="flex-1 px-0 py-7">
        {view === 'weekly' || view === 'coverage' ? (
          view === 'weekly' ? (
            <CrewOpsGrid staff={staff} />
          ) : (
            <DailyZoneDutyView crewRows={crewRows} presetSquads={presetSquads} />
          )
        ) : (
          <div className="flex flex-col gap-5">
            {/* SUB-TAB: EVENT SCHEDULE */}
            {view === 'events' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-xl font-medium text-foreground">Upcoming Event Staffing</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Review crew readiness by event, then open the staffing plan for the event that needs attention.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {events.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
                      No active events scheduled in the pipeline.
                    </div>
                  ) : (
                    events.map((event) => {
                      const matchedAssignments = assignments.filter(
                        (a) => a.event_name.toLowerCase() === event.title.toLowerCase() || a.deployment_ref === event.id,
                      )
                      const activeAssignment = matchedAssignments.find((a) => a.status === 'Active') || matchedAssignments[0]
                      return (
                        <div
                          key={event.id}
                          className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="font-semibold text-foreground text-sm">{event.title}</span>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Target Date: <span className="font-medium text-foreground">{event.targetDate || 'TBD'}</span> · Venue:{' '}
                                <span className="font-medium text-foreground">{event.venue || 'TBD'}</span>
                              </p>
                            </div>
                            <span
                              className={cn(
                                'rounded px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider',
                                event.status === 'In Production' || event.status === 'Initialized'
                                  ? 'bg-emerald-500/15 text-emerald-600'
                                  : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {event.status || 'Active'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                            <span className="text-muted-foreground">
                              {activeAssignment ? (
                                <>Crew lead: <strong className="text-foreground">{activeAssignment.lead_name}</strong> · {activeAssignment.member_names.length} assigned</>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">No Ground Crew Deployment Assigned Yet</span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEventId(event.id)
                                setView('rosters')
                              }}
                              className="rounded border border-border bg-background px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-primary hover:bg-accent"
                            >
                              {activeAssignment ? 'Open Staffing Plan' : 'Staff This Event'}
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB: ASSIGNMENTS */}
            {view === 'rosters' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-xl font-medium text-foreground">{selectedEvent ? `${selectedEvent.title} Roster` : 'Event Rosters'}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{selectedEvent ? `${selectedEvent.targetDate || 'Date TBD'} · ${selectedEvent.venue || 'Venue TBD'} · review the event team before deployment.` : 'Open an event from Upcoming Events to focus on one staffing plan.'}</p>
                  </div>
                  {selectedEvent && <button type="button" onClick={() => { setSelectedEventId(null); setView('events') }} className="rounded-md border border-border px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground hover:bg-accent hover:text-foreground">Back to events</button>}
                </div>

                <div className="space-y-3">
                  {assignmentsLoading ? (
                    <div className="rounded-xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
                      Loading deployment rosters...
                    </div>
                  ) : assignmentsError ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-xs text-destructive">
                      <p className="font-semibold">Unable to load manning assignments</p>
                      <p className="mt-1 text-[0.7rem] text-muted-foreground">{assignmentsError}</p>
                    </div>
                  ) : selectedEventAssignments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                      <p>No crew roster has been created for this event.</p>
                      {selectedEvent && <button type="button" onClick={() => setAssignOpen(true)} className="mt-4 rounded-md bg-primary px-3 py-2 text-[0.6rem] font-bold uppercase tracking-wider text-primary-foreground">Assign crew</button>}
                    </div>
                  ) : (
                    selectedEventAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        onClick={() => setSelectedAssignment(assignment)}
                        className="rounded-xl border border-border bg-card p-4 shadow-sm cursor-pointer hover:border-primary/50 hover:bg-accent/40 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-sm">{assignment.event_name}</span>
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
                            {assignment.executionStatus && (
                              <span
                                className={cn(
                                  'rounded px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider',
                                  assignment.executionStatus === 'InProgress' || assignment.executionStatus === 'In Progress'
                                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                    : assignment.executionStatus === 'Blocked'
                                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                      : assignment.executionStatus === 'Completed'
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                        : 'bg-muted text-muted-foreground border border-border',
                                )}
                              >
                                {assignment.executionStatus === 'InProgress' ? 'In Progress' : assignment.executionStatus}
                              </span>
                            )}
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
                        {assignment.executionStatus === 'Blocked' && assignment.blockerReason && (
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200">
                            <span className="font-bold text-[0.65rem] uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                              Active Execution Blocker Reported by Crew:
                            </span>
                            <p className="mt-0.5 text-xs leading-relaxed font-medium">{assignment.blockerReason}</p>
                          </div>
                        )}
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
                    ))
                  )}
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
          initialEventId={selectedEventId ?? undefined}
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
          onAssignmentClosed={reload}
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
  onAssignmentClosed,
}: {
  assignment: ManningAssignment
  onClose: () => void
  onExport?: (assignment: ManningAssignment) => void
  onAssignmentClosed?: () => void
}) {
  const { staff, subRolesByParent } = usePortal()
  const { adminRole, subRole, hasFullWarehouseAccess } = useAuth()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)
  const [removalReason, setRemovalReason] = useState('')

  // Manual Resource Override state
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [selectedReplacementUserId, setSelectedReplacementUserId] = useState('')
  const [overrideJustification, setOverrideJustification] = useState('')
  const [submittingOverride, setSubmittingOverride] = useState(false)

  const isOverride = Boolean(assignment.is_override || assignment.isOverride)
  const canRoutineRemove = canPerformRoutineRemoval({ role: adminRole, subRole })
  const canOverrideRemove = canPerformOverrideRemoval({ role: adminRole, subRole, fullWarehouseAccess: hasFullWarehouseAccess })
  const canOverrideResource = canPerformResourceOverride({ role: adminRole, subRole, fullWarehouseAccess: hasFullWarehouseAccess })

  const rawExecStatus = assignment.executionStatus || 'Assigned'
  const isAssignedOnly = rawExecStatus === 'Assigned'

  // Replacement Ground Crew candidates from canonical workforce source
  const replacementCandidates = useMemo(() => {
    return staff.filter((s) => {
      if (s.accountStatus === 'Suspended' || s.archived) return false
      const roleLower = (s.role || '').toLowerCase()
      const subRoleLower = (s.subRole || '').toLowerCase()
      const isGroundCrew =
        roleLower.includes('ground') ||
        roleLower.includes('crew') ||
        roleLower.includes('member') ||
        roleLower.includes('field') ||
        subRoleLower.includes('ground') ||
        subRoleLower.includes('crew') ||
        s.role === 'Warehouse Lead' ||
        s.role === 'Warehouse Member' ||
        s.role === 'Ground Crew'
      const fullName = `${s.firstName} ${s.surname}`.trim()
      const isCurrentAssigned =
        fullName.toLowerCase() === (assignment.lead_name || '').toLowerCase() ||
        assignment.member_names.some((m) => m.toLowerCase() === fullName.toLowerCase())
      return isGroundCrew && !isCurrentAssigned
    })
  }, [staff, assignment])

  async function handleCloseAssignment() {
    const trimmedReason = removalReason.trim()
    if (!trimmedReason) {
      setErrorMsg('Mandatory operational reason is required for assignment removal.')
      return
    }

    if (isOverride && !canOverrideRemove) {
      setErrorMsg('Manning Officers cannot remove override assignments. Only Warehouse Operations Managers (WOM) and Administrators can authorize override removal.')
      return
    }

    if (!isOverride && !canRoutineRemove) {
      setErrorMsg('Your current role is not authorized to remove crew assignments.')
      return
    }

    setErrorMsg(null)
    setClosing(true)
    try {
      const targetSubRole = assignment.sub_role?.trim() || ''
      const allSubRoles = PARENT_ROLES.flatMap((p) => subRolesByParent[p.id] ?? [])
      const matched = allSubRoles.find(
        (s) =>
          s.name.toLowerCase() === targetSubRole.toLowerCase() ||
          s.id.toLowerCase() === targetSubRole.toLowerCase(),
      )
      await closeAssignment(
        assignment.id,
        matched ? { minTeamLeads: matched.minTeamLeads } : undefined,
        trimmedReason,
        isOverride,
      )
      onAssignmentClosed?.()
      onClose()
    } catch (err: any) {
      console.error('[ManningModule] close assignment failed:', err)
      setErrorMsg(err?.message || 'Failed to remove assignment from backend ledger')
      setClosing(false)
    }
  }

  async function handleConfirmOverride() {
    const trimmed = overrideJustification.trim()
    if (!trimmed) {
      setErrorMsg('Mandatory justification is required for Manual Resource Override.')
      return
    }
    if (!selectedReplacementUserId) {
      setErrorMsg('Please select a replacement Ground Crew member.')
      return
    }

    if (!isAssignedOnly) {
      setErrorMsg('In-progress, blocked, and completed assignments cannot be reassigned.')
      return
    }

    setErrorMsg(null)
    setSubmittingOverride(true)
    try {
      const res = await overrideAssignmentApi(assignment.id, {
        newUserId: selectedReplacementUserId,
        justification: trimmed,
      })

      if (res.success) {
        onAssignmentClosed?.()
        onClose()
      } else {
        setErrorMsg(res.error || 'Resource override failed.')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error performing resource override.')
    } finally {
      setSubmittingOverride(false)
    }
  }

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
            <div className="flex items-center gap-2">
              <span className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-primary">
                Manning Assignment Record
              </span>
              {isOverride && (
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[0.6rem] font-bold text-amber-600 dark:text-amber-400">
                  Manual Override
                </span>
              )}
            </div>
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

        {errorMsg && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs font-medium text-destructive">
            {errorMsg}
          </div>
        )}

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
              Assignment Status
            </span>
            <span className={cn('font-bold', assignment.status === 'Active' ? 'text-emerald-600' : 'text-muted-foreground')}>
              {assignment.status}
            </span>
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
          {assignment.executionStatus && (
            <div className="rounded-lg border border-border bg-background p-3 col-span-2">
              <span className="text-[0.55rem] font-bold uppercase tracking-wider text-muted-foreground block">
                Ground Execution State
              </span>
              <div className="mt-1 flex items-center justify-between">
                <span
                  className={cn(
                    'rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider',
                    assignment.executionStatus === 'InProgress' || assignment.executionStatus === 'In Progress'
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      : assignment.executionStatus === 'Blocked'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : assignment.executionStatus === 'Completed'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground',
                  )}
                >
                  {assignment.executionStatus === 'InProgress' ? 'In Progress' : assignment.executionStatus}
                </span>
                {(assignment.startedAt || assignment.completedAt) && (
                  <span className="text-[0.65rem] text-muted-foreground">
                    {assignment.completedAt
                      ? `Completed: ${new Date(assignment.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : assignment.startedAt
                        ? `Started: ${new Date(assignment.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : ''}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {assignment.executionStatus === 'Blocked' && assignment.blockerReason && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <span className="font-bold text-[0.65rem] uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
              Active Crew Blocker Reason:
            </span>
            <p className="text-xs leading-relaxed font-medium">{assignment.blockerReason}</p>
          </div>
        )}

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

        {/* Sub-Dialog for Manual Resource Override */}
        {overrideOpen ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-xs">
              <ShieldAlert className="size-4 shrink-0" />
              <span>Manual Resource Override</span>
            </div>

            <div className="rounded-lg border border-border/60 bg-background p-3 text-xs space-y-1">
              <p><strong className="text-foreground">Task Title:</strong> {assignment.event_name}</p>
              <p><strong className="text-foreground">Current Crew:</strong> {assignment.lead_name || assignment.member_names.join(', ') || 'Assigned Crew'}</p>
              {assignment.venue && <p><strong className="text-foreground">Venue/Area:</strong> {assignment.venue}</p>}
              <p><strong className="text-foreground">Shift Date:</strong> {assignment.work_date}</p>
              <p><strong className="text-foreground">Current Assignment Status:</strong> <span className="font-bold text-emerald-600">{rawExecStatus}</span></p>
            </div>

            {!isAssignedOnly ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200">
                In-progress, blocked, and completed assignments cannot be reassigned.
              </div>
            ) : (
              <>
                <label className="block text-xs font-semibold text-foreground">
                  Replacement Ground Crew <span className="text-destructive">*</span>
                  <select
                    value={selectedReplacementUserId}
                    disabled={submittingOverride}
                    onChange={(e) => setSelectedReplacementUserId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background p-2 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="">Select replacement Ground Crew member...</option>
                    {replacementCandidates.map((cand) => (
                      <option key={cand.id} value={cand.id}>
                        {cand.firstName} {cand.surname} ({cand.role}{cand.subRole ? ` • ${cand.subRole}` : ''})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-semibold text-foreground">
                  Justification <span className="text-destructive">*</span>
                  <textarea
                    value={overrideJustification}
                    disabled={submittingOverride}
                    onChange={(e) => setOverrideJustification(e.target.value)}
                    placeholder="State mandatory operational exception justification..."
                    rows={2}
                    className="mt-1 w-full rounded-md border border-input bg-background p-2 text-xs text-foreground outline-none focus:border-primary"
                  />
                  <span className="mt-1 text-[0.68rem] text-muted-foreground italic block">
                    Required for accountability and audit history.
                  </span>
                </label>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={submittingOverride}
                    onClick={() => {
                      setOverrideOpen(false)
                      setErrorMsg(null)
                    }}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-accent disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!overrideJustification.trim() || !selectedReplacementUserId || submittingOverride}
                    onClick={handleConfirmOverride}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition',
                      overrideJustification.trim() && selectedReplacementUserId && !submittingOverride
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-amber-600/40 cursor-not-allowed',
                    )}
                  >
                    {submittingOverride ? 'Submitting Resource Override...' : 'Confirm Resource Override'}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : confirmRemoveOpen ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-destructive font-semibold text-xs">
              <AlertTriangle className="size-4 shrink-0" />
              <span>
                {isOverride
                  ? 'Confirm Manual Resource Override Removal (POST /api/manning/{id}/remove-override)'
                  : 'Confirm Routine Crew Removal (POST /api/manning/{id}/remove)'}
              </span>
            </div>
            <p className="text-[0.72rem] text-muted-foreground">
              This action will permanently release the assigned crew slots on the authoritative server ledger. A non-blank operational reason is required for the audit trail.
            </p>
            <textarea
              value={removalReason}
              disabled={closing}
              onChange={(e) => setRemovalReason(e.target.value)}
              placeholder="State mandatory operational reason for removing this crew assignment..."
              rows={2}
              className="w-full rounded-md border border-input bg-background p-2 text-xs text-foreground outline-none focus:border-destructive"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={closing}
                onClick={() => setConfirmRemoveOpen(false)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-accent disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!removalReason.trim() || closing}
                onClick={handleCloseAssignment}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition',
                  removalReason.trim() && !closing
                    ? 'bg-destructive hover:bg-destructive/90'
                    : 'bg-destructive/40 cursor-not-allowed',
                )}
              >
                {closing ? 'Removing from Ledger...' : 'Confirm Authoritative Removal'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onExport?.(assignment)
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-card-foreground hover:bg-accent"
              >
                <Download className="size-3.5" />
                Export Roster (PDF)
              </button>

              {canOverrideResource && assignment.status === 'Active' && (
                <button
                  type="button"
                  disabled={closing || submittingOverride}
                  onClick={() => {
                    setErrorMsg(null)
                    setConfirmRemoveOpen(false)
                    setOverrideOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  Manual Resource Override
                </button>
              )}

              {assignment.status === 'Active' && (
                isOverride && !canOverrideRemove ? (
                  <div className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[0.62rem] text-amber-700 dark:text-amber-400">
                    <ShieldAlert className="size-3.5 shrink-0" />
                    <span>Override removal restricted to WOM / Admin</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={closing || (!isOverride && !canRoutineRemove)}
                    onClick={() => {
                      setErrorMsg(null)
                      setOverrideOpen(false)
                      setRemovalReason('')
                      setConfirmRemoveOpen(true)
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-destructive hover:bg-destructive/20 disabled:opacity-50',
                    )}
                  >
                    {isOverride ? 'Remove Override Assignment' : 'Remove Assignment'}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-accent"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


