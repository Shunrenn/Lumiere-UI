import { useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, List, Search, UserPlus, X } from 'lucide-react'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { getPresetSquads, useCrewRows, type CrewRow, type CrewRowStatus } from '@/lib/warehouse-crew'
import type { CrewAssignmentStatus, EventCrewAssignment } from '@/lib/event-detail'
import { CrewListView } from '@/components/warehouse/manpower/CrewListView'
import { CrewCalendarView } from '@/components/warehouse/manpower/CrewCalendarView'
import { CrewOpsGrid } from '@/components/warehouse/manpower/CrewOpsGrid'
import { AssignCrewModal } from '@/components/warehouse/manpower/AssignCrewModal'
import { CrewInfoModal } from '@/components/warehouse/event-detail/CrewInfoModal'
import { cn } from '@/lib/utils'

// Maps the Manpower module's own status vocabulary onto the Event Detail
// panel's EventCrewAssignment status so the same CrewInfoModal (built for
// the event detail Manning/Crew panel) can be reused here unmodified.
const ROW_STATUS_TO_ASSIGNMENT: Record<CrewRowStatus, CrewAssignmentStatus> = {
  Available: 'Pending',
  Assigned: 'Confirmed',
  'On Leave': 'Unavailable',
}
function toCrewAssignment(row: CrewRow): EventCrewAssignment {
  return { id: row.id, name: row.name, role: row.role, status: ROW_STATUS_TO_ASSIGNMENT[row.status] }
}

type ScheduleMode = 'event' | 'ops'
type ViewMode = 'list' | 'calendar'

interface ManpowerModuleProps {
  onClose: () => void
}

export function ManpowerModule({ onClose }: ManpowerModuleProps) {
  const { staff, events } = usePortal()
  const { hasFullWarehouseAccess, isManningOfficer } = useAuth()
  const crewRows = useCrewRows(staff, events)
  const presetSquads = useMemo(() => getPresetSquads(staff), [staff])

  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('event')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('All Roles')
  const [statusFilter, setStatusFilter] = useState<'All Statuses' | CrewRowStatus>('All Statuses')
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedCrewRow, setSelectedCrewRow] = useState<CrewRow | null>(null)

  // Same permission gate as the Event Detail page's Manning/Crew panel: full
  // access or the Manning Officer sub-role sees contact/session detail; every
  // other sub-role gets the modal's built-in muted restricted state.
  const canViewFullCrewDetail = hasFullWarehouseAccess || isManningOfficer

  const crewRoles = useMemo(
    () => ['All Roles', ...Array.from(new Set(crewRows.map((row) => row.role)))],
    [crewRows],
  )

  const filtered = useMemo(() => {
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

  const totalCrew = crewRows.length
  const available = crewRows.filter((row) => row.status === 'Available').length
  const autoScheduled = crewRows.filter((row) => row.status === 'Assigned').length
  const pendingLeaves = crewRows.filter((row) => row.status === 'On Leave').length

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:px-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.24em] text-primary">Warehouse module</p>
            <h1 className="mt-1 font-serif text-2xl font-medium text-foreground">Manpower &amp; Crew</h1>
            <p className="mt-1 text-sm text-muted-foreground">Crew roster, availability, and scheduling conflicts.</p>
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
            { label: 'Total Crew', value: totalCrew, border: 'border-l-foreground/30' },
            { label: 'Available', value: available, border: 'border-l-primary' },
            { label: 'Auto-scheduled', value: autoScheduled, border: 'border-l-accent-foreground/40' },
            { label: 'Pending Leaves', value: pendingLeaves, border: 'border-l-destructive' },
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

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-md border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setScheduleMode('event')}
              aria-pressed={scheduleMode === 'event'}
              className={cn(
                'rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                scheduleMode === 'event' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              Event Schedule
            </button>
            <button
              type="button"
              onClick={() => setScheduleMode('ops')}
              aria-pressed={scheduleMode === 'ops'}
              className={cn(
                'rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                scheduleMode === 'ops' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              Daily-Weekly Ops
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90"
          >
            <UserPlus className="size-3.5" />
            Assign Crew
          </button>
        </div>

        {scheduleMode === 'event' && (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border border-border bg-background p-1" aria-label="Crew view">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  className={cn(
                    'flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                    viewMode === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <List className="size-3.5" />
                  List View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  aria-pressed={viewMode === 'calendar'}
                  className={cn(
                    'flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                    viewMode === 'calendar' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <CalendarDays className="size-3.5" />
                  Calendar View
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, role, event, or task…"
                  className="w-64 rounded-md border border-input bg-background py-2.5 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  aria-label="Filter by role"
                  className="appearance-none rounded-md border border-border bg-background py-2.5 pl-3.5 pr-9 text-xs font-medium text-card-foreground outline-none transition hover:bg-muted focus:border-primary focus:ring-2 focus:ring-ring/30"
                >
                  {crewRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  aria-label="Filter by status"
                  className="appearance-none rounded-md border border-border bg-background py-2.5 pl-3.5 pr-9 text-xs font-medium text-card-foreground outline-none transition hover:bg-muted focus:border-primary focus:ring-2 focus:ring-ring/30"
                >
                  {(['All Statuses', 'Available', 'Assigned', 'On Leave'] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 px-6 py-6 sm:px-10">
        {scheduleMode === 'ops' ? (
          <CrewOpsGrid staff={staff} />
        ) : viewMode === 'list' ? (
          <CrewListView rows={filtered} onSelect={setSelectedCrewRow} />
        ) : (
          <CrewCalendarView rows={filtered} events={events} onSelect={setSelectedCrewRow} />
        )}
      </div>

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
