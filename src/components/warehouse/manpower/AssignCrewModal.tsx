import { useMemo, useState } from 'react'
import { AlertTriangle, Lock, ShieldAlert, UserCheck, X, XCircle } from 'lucide-react'
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
import { createOverride } from '@/lib/manning'
import { useAuth } from '@/lib/auth'
import { usePortal } from '@/lib/store'
import { useGroundCrewDeclarations } from '@/lib/ground-crew-declarations'
import { cn } from '@/lib/utils'
import { FifoSelector } from './shared/FifoSelector'
import { PresetSelector } from './shared/PresetSelector'
import { ManualCrewPicker } from './shared/ManualCrewPicker'

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

export function AssignCrewModal({ events, crewRows, presetSquads, onClose }: AssignCrewModalProps) {
  const { adminName, adminEmail } = useAuth()
  const { staff } = usePortal()
  const declarations = useGroundCrewDeclarations()
  const actor = adminName || adminEmail || 'Manning Manager'

  const [mode, setMode] = useState<AssignMode>('fifo')
  const [eventId, setEventId] = useState(events[0]?.id ?? '')
  const [task, setTask] = useState(FIELD_TASKS[0])
  const [slotCount, setSlotCount] = useState(3)
  const [manualIds, setManualIds] = useState<Set<string>>(new Set())
  const [presetId, setPresetId] = useState(presetSquads[0]?.id ?? '')
  const [swappedOut, setSwappedOut] = useState<Set<string>>(new Set())
  const [swaps, setSwaps] = useState<Record<string, string>>({})
  const [slotsFullNotice, setSlotsFullNotice] = useState(false)

  // Emergency Override State & Persistence
  const [overriddenStaffIds, setOverriddenStaffIds] = useState<Set<string>>(new Set())
  const [overrideModal, setOverrideModal] = useState<{
    row: CrewRow
    conflictType: 'On Leave' | 'Double Booked'
    conflictDetails?: string
  } | null>(null)
  const [justification, setJustification] = useState('')
  const [submittingOverride, setSubmittingOverride] = useState(false)

  const selectedEvent = events.find((e) => e.id === eventId)
  const [assignmentDate, setAssignmentDate] = useState(selectedEvent?.targetDate ?? '2026-08-20')

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

  // Preset Mode: filters out conflicting squad members UNLESS overridden or swapped
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
    setSlotsFullNotice(false)
    const staffId = row.staffId
    const isEventConflict = selectedEvent ? crewHasConflict(row, selectedEvent.id) : false
    const symmetric = targetDate ? checkSymmetricConflict(staffId, targetDate, 'Field') : { hasConflict: false }
    const isConflict = isEventConflict || symmetric.hasConflict

    if (isConflict && !overriddenStaffIds.has(staffId) && !manualIds.has(staffId)) {
      const conflictType: 'On Leave' | 'Double Booked' =
        row.status === 'On Leave' ? 'On Leave' : 'Double Booked'
      const details = symmetric.details || (row.status === 'On Leave' ? 'Crew member is on leave' : 'Double booked for another event')
      setOverrideModal({ row, conflictType, conflictDetails: details })
      setJustification('')
      return
    }

    setManualIds((prev) => {
      const next = new Set(prev)
      if (next.has(staffId)) {
        next.delete(staffId)
        return next
      }
      if (next.size >= slotCount) {
        setSlotsFullNotice(true)
        return prev
      }
      next.add(staffId)
      return next
    })
  }

  const handleSwap = (outStaffId: string) => {
    setSwappedOut((prev) => new Set(prev).add(outStaffId))
  }

  const handleRemove = (outStaffId: string) => {
    setSwappedOut((prev) => new Set(prev).add(outStaffId))
  }

  const handleConfirmOverride = async () => {
    if (!overrideModal || !selectedEvent || !justification.trim()) return
    setSubmittingOverride(true)
    try {
      await createOverride({
        staff_id: overrideModal.row.staffId,
        staff_name: overrideModal.row.name,
        event_id: selectedEvent.id,
        event_title: selectedEvent.title,
        conflict_type: overrideModal.conflictType,
        justification: justification.trim(),
        overridden_by: actor,
      })

      setOverriddenStaffIds((prev) => new Set(prev).add(overrideModal.row.staffId))

      if (mode === 'manual') {
        setManualIds((prev) => new Set(prev).add(overrideModal.row.staffId))
      }

      setOverrideModal(null)
      setJustification('')
    } finally {
      setSubmittingOverride(false)
    }
  }

  const finalPicks: CrewRow[] =
    mode === 'fifo'
      ? fifoPicks
      : mode === 'manual'
        ? crewRows.filter((r) => manualIds.has(r.staffId))
        : presetMembers

  // ─── Team Lead Minimum Validation & Escalation ───
  const poolLeads = useMemo(
    () => crewRows.filter((row) => isTeamLead(row, staff, declarations, targetDate)),
    [crewRows, staff, declarations, targetDate],
  )
  const hasTeamLeadInPool = poolLeads.length > 0

  const hasTeamLeadPicked = useMemo(
    () => finalPicks.some((row) => isTeamLead(row, staff, declarations, targetDate)),
    [finalPicks, staff, declarations, targetDate],
  )

  const canConfirm = Boolean(selectedEvent) && finalPicks.length > 0 && hasTeamLeadPicked && !isPastEventDate

  const handleConfirm = () => {
    if (!selectedEvent || isPastEventDate) return
    if (!hasTeamLeadPicked) return

    finalPicks.forEach((row) => {
      assignCrewToEvent(row.staffId, {
        eventId: selectedEvent.id,
        event: selectedEvent.title,
        venue: selectedEvent.venue,
        date: assignmentDate,
        task,
      })
    })
    onClose()
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
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Manning Delegation
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

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
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
                  At least 1 Team Lead must be included in this assignment before finalizing. Select a crew member tagged as Team Lead.
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
                  Selected assignment date ({assignmentDate}) cannot be past the event's actual date ({selectedEvent?.targetDate}). Finalization is blocked.
                </p>
              </div>
            </div>
          )}

          {/* Event, Date & Task Inputs */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Target event
              </span>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
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
                onChange={(e) => setAssignmentDate(e.target.value)}
                className={cn(
                  'rounded-md border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary',
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
                onChange={(e) => {
                  setSlotsFullNotice(false)
                  setSlotCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
                }}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
          </div>

          {/* Field Task Dropdown (Visible in FIFO & Manual modes; in Preset mode, task is set per-team) */}
          {mode !== 'preset' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-1">
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Field task
                </span>
                <select
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                >
                  {FIELD_TASKS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

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
          <span className="text-xs text-muted-foreground">
            {finalPicks.length} member{finalPicks.length === 1 ? '' : 's'} staged
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent"
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
              Finalize Field Assignment
            </button>
          </div>
        </div>
      </div>

      {/* ─── Emergency Override Dialog (Foundation A Infrastructure) ─── */}
      {overrideModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-foreground/70 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onClick={() => setOverrideModal(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl bg-card p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-destructive" />
                <h3 className="font-serif text-lg font-bold text-card-foreground">
                  Emergency Override Required
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOverrideModal(null)}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{overrideModal.row.name}</span> is currently hard-blocked ({overrideModal.conflictDetails || overrideModal.conflictType}). Double-duty requires an Emergency Override.
            </p>

            <label className="flex flex-col gap-1.5">
              <span className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">
                Mandatory Operational Justification
              </span>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Explain why double-duty assignment is required for this operation..."
                rows={3}
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setOverrideModal(null)}
                className="rounded-md border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOverride}
                disabled={!justification.trim() || submittingOverride}
                className={cn(
                  'rounded-md bg-destructive px-4 py-2 text-xs font-bold uppercase tracking-wider text-destructive-foreground transition',
                  justification.trim() && !submittingOverride ? 'hover:opacity-90' : 'opacity-50 cursor-not-allowed',
                )}
              >
                {submittingOverride ? 'Recording...' : 'Authorize Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
