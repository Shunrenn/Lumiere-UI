import { useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, ShieldAlert, UserCheck, X } from 'lucide-react'
import type { PortalEvent } from '@/lib/types'
import {
  assignCrewToEvent,
  checkSymmetricConflict,
  crewHasConflict,
  isTeamLead,
  type AssignMode,
  type CrewRow,
  type PresetSquad,
} from '@/lib/warehouse-crew'
import { useAuth } from '@/lib/auth'
import { usePortal } from '@/lib/store'
import { useGroundCrewDeclarations } from '@/lib/ground-crew-declarations'
import { cn } from '@/lib/utils'
import { FifoSelector } from './shared/FifoSelector'
import { PresetSelector } from './shared/PresetSelector'
import { ManualCrewPicker } from './shared/ManualCrewPicker'
import {
  assignManningApi,
  overrideManningApi,
  fetchManningForEvent,
  canPerformRoutineAssignment,
  canPerformResourceOverride,
  type ManningRecordDto,
} from '@/lib/manningApi'

const FIELD_TASKS = [
  'Load-in & setup',
  'Décor styling',
  'Floral install',
  'Load-out & strike',
  'Vehicle marshaling',
  'Client liaison',
]

interface AssignCrewModalProps {
  events: PortalEvent[]
  crewRows: CrewRow[]
  presetSquads: PresetSquad[]
  onClose: () => void
}

interface ActiveConflictReview {
  row: CrewRow
  conflicts: ManningRecordDto[]
  requested: {
    eventId: string
    eventTitle: string
    userId: string
    userName: string
    roleName: string
    shiftDate: string
    shiftStartTime?: string | null
    shiftEndTime?: string | null
  }
}

export function AssignCrewModal({ events, crewRows, presetSquads, onClose }: AssignCrewModalProps) {
  const { adminRole, subRole, hasFullWarehouseAccess } = useAuth()
  const { staff } = usePortal()
  const declarations = useGroundCrewDeclarations()

  // Role permissions mirroring authoritative backend authority
  const canAssign = canPerformRoutineAssignment({ role: adminRole, subRole })
  const canOverride = canPerformResourceOverride({ role: adminRole, subRole, fullWarehouseAccess: hasFullWarehouseAccess })

  const [mode, setMode] = useState<AssignMode>('fifo')
  const [eventId, setEventId] = useState(events[0]?.id ?? '')
  const [task, setTask] = useState(FIELD_TASKS[0])
  const [slotCount, setSlotCount] = useState(3)
  const [manualIds, setManualIds] = useState<Set<string>>(new Set())
  const [presetId, setPresetId] = useState(presetSquads[0]?.id ?? '')
  const [swappedOut, setSwappedOut] = useState<Set<string>>(new Set())
  const [swaps, setSwaps] = useState<Record<string, string>>({})

  // Shift start and end time inputs (optional half-open interval)
  const [shiftStartTime, setShiftStartTime] = useState<string>('')
  const [shiftEndTime, setShiftEndTime] = useState<string>('')

  // State for tracked successful overrides
  const [overriddenStaffIds, setOverriddenStaffIds] = useState<Set<string>>(new Set())

  // Authoritative Conflict Review state (populated when backend returns 409 MANNING_OVERLAP)
  const [conflictReview, setConflictReview] = useState<ActiveConflictReview | null>(null)

  // Manual Resource Override Modal state (WOM/Admin only)
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false)
  const [justification, setJustification] = useState('')
  const [submittingOverride, setSubmittingOverride] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [staleStateDetected, setStaleStateDetected] = useState(false)

  // Routine assignment progress state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionProgress, setSubmissionProgress] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [overrideSuccessBanner, setOverrideSuccessBanner] = useState<string | null>(null)

  const selectedEvent = events.find((e) => e.id === eventId)
  const [assignmentDate, setAssignmentDate] = useState(() => selectedEvent?.targetDate ?? new Date().toISOString().slice(0, 10))

  // Keep assignmentDate in sync with selectedEvent targetDate when event changes
  useMemo(() => {
    if (selectedEvent?.targetDate) {
      setAssignmentDate(selectedEvent.targetDate)
    }
  }, [eventId])

  const targetDate = assignmentDate

  // Block assignment if target date is past the event's actual targetDate
  const isPastEventDate = useMemo(() => {
    if (!selectedEvent?.targetDate || !assignmentDate) return false
    return new Date(assignmentDate).getTime() > new Date(selectedEvent.targetDate).getTime()
  }, [assignmentDate, selectedEvent])

  // FIFO Mode: picks strictly available non-conflicting crew members
  const available = useMemo(() => {
    return crewRows.filter((row) => {
      if (row.status !== 'Available') return false
      if (crewHasConflict(row, eventId)) return false
      if (targetDate) {
        const symmetric = checkSymmetricConflict(row.staffId, targetDate, 'Field')
        if (symmetric.hasConflict) return false
      }
      return true
    })
  }, [crewRows, eventId, targetDate])

  const fifoPicks = useMemo(() => available.slice(0, slotCount), [available, slotCount])

  // Preset Mode
  const preset = presetSquads.find((s) => s.id === presetId)
  const presetMembers = useMemo(() => {
    if (!preset) return []
    return preset.memberIds
      .filter((id) => !swappedOut.has(id))
      .map((id) => {
        const effectiveId = swaps[id] || id
        return crewRows.find((row) => row.staffId === effectiveId)
      })
      .filter((row): row is CrewRow => {
        if (!row) return false
        if (!selectedEvent) return true
        const hasEventConflict = crewHasConflict(row, selectedEvent.id)
        const symmetric = targetDate ? checkSymmetricConflict(row.staffId, targetDate, 'Field') : { hasConflict: false }
        const hasConflict = hasEventConflict || symmetric.hasConflict

        if (hasConflict && !overriddenStaffIds.has(row.staffId)) return false
        return true
      })
  }, [preset, crewRows, swappedOut, swaps, selectedEvent, targetDate, overriddenStaffIds])

  const toggleManual = (row: CrewRow) => {
    const staffId = row.staffId
    setManualIds((prev) => {
      const next = new Set(prev)
      if (next.has(staffId)) {
        next.delete(staffId)
        return next
      }
      if (next.size >= slotCount) {
        return prev
      }
      next.add(staffId)
      return next
    })
  }

  const handleRemove = (outStaffId: string) => {
    setSwappedOut((prev) => new Set(prev).add(outStaffId))
  }

  const finalPicks: CrewRow[] =
    mode === 'fifo'
      ? fifoPicks
      : mode === 'manual'
        ? crewRows.filter((r) => manualIds.has(r.staffId))
        : presetMembers

  // Team Lead Minimum Validation
  const poolLeads = useMemo(
    () => crewRows.filter((row) => isTeamLead(row, staff, declarations, targetDate)),
    [crewRows, staff, declarations, targetDate],
  )
  const hasTeamLeadInPool = poolLeads.length > 0

  const hasTeamLeadPicked = useMemo(
    () => finalPicks.some((row) => isTeamLead(row, staff, declarations, targetDate)),
    [finalPicks, staff, declarations, targetDate],
  )

  const canConfirm =
    canAssign &&
    Boolean(selectedEvent) &&
    finalPicks.length > 0 &&
    hasTeamLeadPicked &&
    !isPastEventDate &&
    !isSubmitting

  /**
   * Finalize Routine Assignments:
   * Calls POST /api/manning/assign without isOverride.
   * On 201: Applies authoritative response to local overlay.
   * On 409 MANNING_OVERLAP: Opens authoritative Conflict Review with returned conflict IDs.
   */
  const handleConfirm = async () => {
    if (!canAssign) {
      setErrorMessage('Your current role is not authorized to submit crew assignments.')
      return
    }
    if (!selectedEvent || isPastEventDate || !hasTeamLeadPicked) return

    setErrorMessage(null)
    setIsSubmitting(true)

    for (let i = 0; i < finalPicks.length; i++) {
      const row = finalPicks[i]

      // If already successfully overridden, preserve and continue
      if (overriddenStaffIds.has(row.staffId)) {
        continue
      }

      setSubmissionProgress(`Assigning ${row.name} (${i + 1}/${finalPicks.length})...`)

      const result = await assignManningApi({
        eventId: selectedEvent.id,
        userId: row.staffId,
        roleName: task,
        shiftDate: assignmentDate,
        shiftStartTime: shiftStartTime.trim() || null,
        shiftEndTime: shiftEndTime.trim() || null,
      })

      if (result.success) {
        // Authoritative confirmation: apply to local store
        assignCrewToEvent(row.staffId, {
          eventId: selectedEvent.id,
          event: selectedEvent.title,
          venue: selectedEvent.venue,
          date: assignmentDate,
          task,
        })
      } else if (!result.success && result.status === 409 && 'conflictingAssignments' in result) {
        // Present authoritative conflict
        setIsSubmitting(false)
        setSubmissionProgress(null)
        setConflictReview({
          row,
          conflicts: result.conflictingAssignments,
          requested: {
            eventId: selectedEvent.id,
            eventTitle: selectedEvent.title,
            userId: row.staffId,
            userName: row.name,
            roleName: task,
            shiftDate: assignmentDate,
            shiftStartTime: shiftStartTime.trim() || null,
            shiftEndTime: shiftEndTime.trim() || null,
          },
        })
        return
      } else {
        // General error
        setIsSubmitting(false)
        setSubmissionProgress(null)
        setErrorMessage(`Assignment failed for ${row.name}: ${result.error}`)
        return
      }
    }

    setIsSubmitting(false)
    setSubmissionProgress(null)
    onClose()
  }

  /**
   * Handle Manual Resource Override (WOM / Admin only)
   * Sends POST /api/manning/override with exact expectedConflictingAssignmentIds and non-blank justification.
   */
  const handleCommitOverride = async () => {
    if (!canOverride) {
      setOverrideError('Only Warehouse Operations Managers (WOM) and Administrators can authorize Manual Resource Overrides.')
      return
    }
    if (!conflictReview || !justification.trim()) return

    setSubmittingOverride(true)
    setOverrideError(null)

    const expectedIds = conflictReview.conflicts.map((c) => c.id)

    const result = await overrideManningApi({
      eventId: conflictReview.requested.eventId,
      userId: conflictReview.requested.userId,
      roleName: conflictReview.requested.roleName,
      shiftDate: conflictReview.requested.shiftDate,
      shiftStartTime: conflictReview.requested.shiftStartTime,
      shiftEndTime: conflictReview.requested.shiftEndTime,
      justification: justification.trim(),
      expectedConflictingAssignmentIds: expectedIds,
    })

    setSubmittingOverride(false)

    if (result.success) {
      // Authoritative override confirmed
      const staffId = conflictReview.requested.userId
      setOverriddenStaffIds((prev) => new Set(prev).add(staffId))

      assignCrewToEvent(staffId, {
        eventId: conflictReview.requested.eventId,
        event: conflictReview.requested.eventTitle,
        venue: selectedEvent?.venue ?? '',
        date: conflictReview.requested.shiftDate,
        task: conflictReview.requested.roleName,
      })

      if (mode === 'manual') {
        setManualIds((prev) => new Set(prev).add(staffId))
      }

      setOverrideSuccessBanner(
        `Manual Resource Override committed for ${conflictReview.row.name} (Assignment ID: ${result.data.id.slice(0, 8)}).`,
      )
      setIsOverrideModalOpen(false)
      setConflictReview(null)
      setJustification('')
    } else if (result.status === 409 && result.code === 'MANNING_STALE_STATE') {
      // Defense-critical Stale State UX
      setStaleStateDetected(true)
      setOverrideError('Manning state changed on server while reviewing this conflict. The conflict set is stale.')

      // Refetch authoritative Manning state for the event
      try {
        await fetchManningForEvent(conflictReview.requested.eventId)
      } catch (err) {
        console.warn('[AssignCrewModal] Refetch on stale state encountered error:', err)
      }

      // Clear the stale reviewed conflict set and close override modal
      // Operator must review the updated conflict state before attempting another override
      setTimeout(() => {
        setIsOverrideModalOpen(false)
        setConflictReview(null)
        setStaleStateDetected(false)
      }, 3500)
    } else {
      setOverrideError(result.error)
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
        className="flex h-full max-h-[44rem] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Manning Delegation · Authoritative API
            </p>
            <h2 className="mt-1 font-serif text-xl font-medium text-card-foreground">Assign Field Crew</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Override Success Alert Banner */}
          {overrideSuccessBanner && (
            <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 shrink-0" />
                <span className="font-semibold">{overrideSuccessBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setOverrideSuccessBanner(null)}
                className="text-xs underline hover:no-underline font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* General Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-wider">Assignment Submission Error</p>
                <p className="mt-0.5 text-[0.7rem] text-destructive/90">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Role Check Warning */}
          {!canAssign && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-wider">Read-Only Manning Access</p>
                <p className="mt-0.5 text-[0.7rem] text-destructive/90">
                  Your current account role does not have Manning mutation authority. Assignments cannot be created.
                </p>
              </div>
            </div>
          )}

          {/* Team Lead Status / Escalation Banners */}
          {!hasTeamLeadInPool ? (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-wider">No Team Lead Available in Pool</p>
                <p className="mt-0.5 text-[0.7rem] text-destructive/90">
                  No qualified Team Leads are available in the crew pool for this assignment. Finalization is blocked.
                </p>
              </div>
            </div>
          ) : !hasTeamLeadPicked && finalPicks.length > 0 ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-wider">Team Lead Required</p>
                <p className="mt-0.5 text-[0.7rem]">
                  At least 1 Team Lead must be included in this assignment before finalizing.
                </p>
              </div>
            </div>
          ) : null}

          {/* Past Event Date Warning Banner */}
          {isPastEventDate && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-wider">Invalid Assignment Date</p>
                <p className="mt-0.5 text-[0.7rem] text-destructive/90">
                  Selected assignment date ({assignmentDate}) cannot be past the event's actual date ({selectedEvent?.targetDate}).
                </p>
              </div>
            </div>
          )}

          {/* Event, Date & Slot Inputs */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Target event
              </span>
              <select
                value={eventId}
                disabled={isSubmitting}
                onChange={(e) => setEventId(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary disabled:opacity-50"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Assignment date
              </span>
              <input
                type="date"
                value={assignmentDate}
                disabled={isSubmitting}
                onChange={(e) => setAssignmentDate(e.target.value)}
                className={cn(
                  'rounded-md border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary disabled:opacity-50',
                  isPastEventDate ? 'border-destructive ring-1 ring-destructive' : 'border-input',
                )}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Slots to fill
              </span>
              <input
                type="number"
                min={1}
                max={10}
                value={slotCount}
                disabled={isSubmitting}
                onChange={(e) => {
                  setSlotCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
                }}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary disabled:opacity-50"
              />
            </label>
          </div>

          {/* Shift Time Interval (Half-Open Interval) & Field Task */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 sm:col-span-1">
              <span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Shift Start (optional)
              </span>
              <input
                type="time"
                value={shiftStartTime}
                disabled={isSubmitting}
                onChange={(e) => setShiftStartTime(e.target.value)}
                className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary disabled:opacity-50"
              />
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-1">
              <span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Shift End (optional)
              </span>
              <input
                type="time"
                value={shiftEndTime}
                disabled={isSubmitting}
                onChange={(e) => setShiftEndTime(e.target.value)}
                className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary disabled:opacity-50"
              />
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-1">
              <span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Field task
              </span>
              <select
                value={task}
                disabled={isSubmitting}
                onChange={(e) => setTask(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary disabled:opacity-50"
              >
                {FIELD_TASKS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Assignment Mode Tabs */}
          <div className="flex flex-col gap-3">
            <div className="flex border-b border-border text-xs">
              <button
                type="button"
                onClick={() => setMode('fifo')}
                className={cn(
                  'pb-2 pt-1 font-bold uppercase tracking-wider transition-colors',
                  mode === 'fifo' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                FIFO (Auto)
              </button>
              <button
                type="button"
                onClick={() => setMode('preset')}
                className={cn(
                  'ml-6 pb-2 pt-1 font-bold uppercase tracking-wider transition-colors',
                  mode === 'preset' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Preset Squad
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={cn(
                  'ml-6 pb-2 pt-1 font-bold uppercase tracking-wider transition-colors',
                  mode === 'manual' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Manual Picker ({manualIds.size}/{slotCount})
              </button>
            </div>

            {/* Sub-Component Rendering */}
            {mode === 'fifo' && (
              <FifoSelector
                fifoPicks={fifoPicks}
                slotCount={slotCount}
                availableCount={available.length}
                staffList={staff}
                declarations={declarations}
                date={targetDate}
              />
            )}

            {mode === 'preset' && (
              <PresetSelector
                presetSquads={presetSquads}
                presetId={presetId}
                onPresetChange={setPresetId}
                presetMembers={presetMembers}
                crewRows={crewRows}
                eventId={eventId}
                date={targetDate}
                targetCategory="Field"
                overriddenStaffIds={overriddenStaffIds}
                onSwapMember={(outId, inId) => setSwaps((prev) => ({ ...prev, [outId]: inId }))}
                onRemove={handleRemove}
                onTaskChange={(newTask) => setTask(newTask)}
                staffList={staff}
                declarations={declarations}
              />
            )}

            {mode === 'manual' && (
              <ManualCrewPicker
                crewRows={crewRows}
                selectedIds={manualIds}
                onToggle={toggleManual}
                eventId={eventId}
                date={targetDate}
                targetCategory="Field"
                overriddenStaffIds={overriddenStaffIds}
                staffList={staff}
                declarations={declarations}
              />
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {finalPicks.length} member{finalPicks.length === 1 ? '' : 's'} staged
            </span>
            {isSubmitting && (
              <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium animate-pulse">
                <RefreshCw className="size-3.5 animate-spin" />
                {submissionProgress || 'Submitting to server ledger...'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground transition shadow-sm',
                canConfirm ? 'bg-primary hover:opacity-90' : 'bg-primary/40 cursor-not-allowed',
              )}
            >
              <UserCheck className="size-4" />
              {isSubmitting ? 'Recording on Ledger...' : 'Finalize Field Assignment'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Conflict Review Dialog (HTTP 409 MANNING_OVERLAP) ─── */}
      {conflictReview && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-foreground/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onClick={() => setConflictReview(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl bg-card p-6 shadow-2xl space-y-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-500" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-card-foreground">
                    Scheduling Conflict Detected
                  </h3>
                  <p className="text-[0.62rem] font-mono text-muted-foreground">HTTP 409 MANNING_OVERLAP</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConflictReview(null)}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-300 space-y-2">
              <p className="font-semibold">
                Resource <span className="underline">{conflictReview.row.name}</span> cannot be scheduled due to overlapping shifts.
              </p>
              <div className="grid grid-cols-2 gap-2 text-[0.7rem]">
                <div>
                  <span className="font-bold block uppercase text-[0.6rem] text-muted-foreground">Requested Event:</span>
                  <span>{conflictReview.requested.eventTitle}</span>
                </div>
                <div>
                  <span className="font-bold block uppercase text-[0.6rem] text-muted-foreground">Requested Date & Role:</span>
                  <span>{conflictReview.requested.shiftDate} · {conflictReview.requested.roleName}</span>
                </div>
              </div>
            </div>

            {/* List of Verified Conflicting Assignments Returned by Backend */}
            <div className="space-y-2">
              <span className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground block">
                Current Conflicting Server Assignments ({conflictReview.conflicts.length})
              </span>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {conflictReview.conflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className="rounded-lg border border-border bg-background p-2.5 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {conflict.eventName || 'Existing Event Assignment'}
                      </span>
                      {conflict.isOverride ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.6rem] font-bold text-amber-600 dark:text-amber-400">
                          Prior Override
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6rem] font-bold text-muted-foreground">
                          Standard Shift
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[0.68rem] text-muted-foreground">
                      <span>Date: {conflict.shiftDate ? conflict.shiftDate.split('T')[0] : 'Same Day'}</span>
                      <span className="font-mono">
                        {conflict.shiftStartTime && conflict.shiftEndTime
                          ? `${conflict.shiftStartTime.slice(0, 5)} - ${conflict.shiftEndTime.slice(0, 5)}`
                          : 'All-Day Allocation'}
                      </span>
                    </div>
                    <div className="text-[0.62rem] text-muted-foreground/80 font-mono truncate">
                      Ref: {conflict.id}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Role Notice & Action Routing */}
            <div className="border-t border-border pt-4">
              {!canOverride ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Role Restriction:</span> Manning Officers cannot authorize Manual Resource Overrides. Adjust your crew selection or contact a Warehouse Operations Manager (WOM).
                  </p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setConflictReview(null)}
                      className="rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90"
                    >
                      Acknowledge &amp; Adjust Selection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setConflictReview(null)}
                    className="rounded-md border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOverrideModalOpen(true)
                      setOverrideError(null)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-amber-700 transition"
                  >
                    <ShieldAlert className="size-4" />
                    Proceed to Manual Resource Override
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Manual Resource Override Dialog (WOM / Admin only) ─── */}
      {isOverrideModalOpen && conflictReview && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-foreground/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsOverrideModalOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-amber-500/50 bg-card p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-card-foreground">
                    Manual Resource Override
                  </h3>
                  <p className="text-[0.62rem] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Supervisory Operational Action · Authoritative Audit Evidence
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={submittingOverride}
                onClick={() => setIsOverrideModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Stale State or General Error Banner */}
            {overrideError && (
              <div
                className={cn(
                  'rounded-md border p-3 text-xs font-medium',
                  staleStateDetected
                    ? 'border-destructive/60 bg-destructive/15 text-destructive'
                    : 'border-destructive/40 bg-destructive/10 text-destructive',
                )}
              >
                <p className="font-bold uppercase tracking-wider">
                  {staleStateDetected ? 'Stale Conflict Set (409 MANNING_STALE_STATE)' : 'Override Failed'}
                </p>
                <p className="mt-0.5 text-[0.7rem]">{overrideError}</p>
                {staleStateDetected && (
                  <p className="mt-1 text-[0.68rem] italic text-muted-foreground">
                    Authoritative state is being refetched. Closing dialog to require re-review of the latest conflict state...
                  </p>
                )}
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                Authorizing an override forces double-duty allocation for{' '}
                <span className="font-bold text-foreground">{conflictReview.row.name}</span> despite verified overlaps.
              </p>
              <div className="rounded border border-border bg-background/80 p-2.5 text-[0.7rem]">
                <span className="font-semibold block text-foreground">Verified Conflicts to Override:</span>
                <span className="font-mono text-[0.65rem] text-muted-foreground">
                  {conflictReview.conflicts.map((c) => c.id).join(', ')}
                </span>
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">
                Mandatory Operational Justification *
              </span>
              <textarea
                value={justification}
                disabled={submittingOverride || staleStateDetected}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Explain the operational necessity and supervisory authorization for this conflict override..."
                rows={3}
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground outline-none focus:border-primary disabled:opacity-50"
              />
            </label>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                disabled={submittingOverride}
                onClick={() => setIsOverrideModalOpen(false)}
                className="rounded-md border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitOverride}
                disabled={!justification.trim() || submittingOverride || staleStateDetected}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition shadow-sm',
                  justification.trim() && !submittingOverride && !staleStateDetected
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-amber-600/40 cursor-not-allowed',
                )}
              >
                {submittingOverride ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    Recording Authoritative Override...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="size-4" />
                    Commit Manual Resource Override
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
