import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeftRight, Lock, ShieldAlert, UserCheck, X, XCircle } from 'lucide-react'
import type { PortalEvent } from '@/lib/types'
import {
  assignCrewToEvent,
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

function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.65rem] font-bold uppercase tracking-wide text-primary ring-1 ring-border',
        className,
      )}
    >
      {initials}
    </span>
  )
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
  const [slotsFullNotice, setSlotsFullNotice] = useState(false)

  // Emergency Override State & Persistence
  const [overriddenStaffIds, setOverriddenStaffIds] = useState<Set<string>>(new Set())
  const [overrideModal, setOverrideModal] = useState<{
    row: CrewRow
    conflictType: 'On Leave' | 'Double Booked'
  } | null>(null)
  const [justification, setJustification] = useState('')
  const [submittingOverride, setSubmittingOverride] = useState(false)

  const selectedEvent = events.find((e) => e.id === eventId)

  // FIFO Mode: picks strictly available non-conflicting crew members
  const available = useMemo(
    () => crewRows.filter((row) => row.status === 'Available' && !crewHasConflict(row, eventId)),
    [crewRows, eventId],
  )
  const fifoPicks = useMemo(() => available.slice(0, slotCount), [available, slotCount])

  // Preset Mode: filters out conflicting squad members UNLESS overridden
  const preset = presetSquads.find((s) => s.id === presetId)
  const presetMembers = useMemo(() => {
    if (!preset) return []
    return preset.memberIds
      .filter((id) => !swappedOut.has(id))
      .map((id) => crewRows.find((row) => row.staffId === id))
      .filter((row): row is CrewRow => {
        if (!row) return false
        if (!selectedEvent) return true
        const hasConflict = crewHasConflict(row, selectedEvent.id)
        if (hasConflict && !overriddenStaffIds.has(row.staffId)) return false
        return true
      })
  }, [preset, crewRows, swappedOut, selectedEvent, overriddenStaffIds])

  const toggleManual = (row: CrewRow) => {
    setSlotsFullNotice(false)
    const staffId = row.staffId
    const isConflict = selectedEvent ? crewHasConflict(row, selectedEvent.id) : false

    if (isConflict && !overriddenStaffIds.has(staffId) && !manualIds.has(staffId)) {
      const conflictType: 'On Leave' | 'Double Booked' =
        row.status === 'On Leave' ? 'On Leave' : 'Double Booked'
      setOverrideModal({ row, conflictType })
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
    () => crewRows.filter((row) => isTeamLead(row, staff, declarations)),
    [crewRows, staff, declarations],
  )
  const hasTeamLeadInPool = poolLeads.length > 0

  const hasTeamLeadPicked = useMemo(
    () => finalPicks.some((row) => isTeamLead(row, staff, declarations)),
    [finalPicks, staff, declarations],
  )

  const canConfirm = Boolean(selectedEvent) && finalPicks.length > 0 && hasTeamLeadPicked

  const handleConfirm = () => {
    if (!selectedEvent) return
    if (!hasTeamLeadPicked) return

    finalPicks.forEach((row) => {
      assignCrewToEvent(row.staffId, {
        eventId: selectedEvent.id,
        event: selectedEvent.title,
        venue: selectedEvent.venue,
        date: selectedEvent.targetDate,
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
              Manning &amp; Crew
            </p>
            <h2 className="mt-1 font-serif text-xl font-medium text-card-foreground">Assign Crew</h2>
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

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Team Lead Status / Escalation Banners */}
          {!hasTeamLeadInPool ? (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-wider">No Team Lead Available in Pool</p>
                <p className="mt-0.5 text-[0.7rem] text-destructive/90">
                  No qualified Team Leads are available in the crew pool for this assignment. Finalization is blocked.
                  Please contact Admin or escalate via Manning SLA to provision a Team Lead.
                </p>
              </div>
            </div>
          ) : !hasTeamLeadPicked && finalPicks.length > 0 ? (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-wider">Team Lead Required</p>
                <p className="mt-0.5 text-[0.7rem]">
                  At least 1 Team Lead must be included in this assignment before finalizing. Select a crew member tagged as Team Lead (e.g. Field Lead / Event Admin).
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Target event
              </span>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
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
                Field task
              </span>
              <select
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              >
                {FIELD_TASKS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
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
                className="rounded-md border border-input bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </label>
          </div>

          <div className="mt-5 inline-flex rounded-md border border-border bg-background p-1">
            {(['fifo', 'manual', 'preset'] as AssignMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={cn(
                  'rounded-sm px-3.5 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                  mode === m ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {m === 'fifo' ? 'FIFO (Auto)' : m === 'manual' ? 'Manual' : 'Preset'}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {/* FIFO Mode */}
            {mode === 'fifo' && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  The next {slotCount} available, non-conflicting crew members will be auto-assigned.
                </p>
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                  {fifoPicks.length === 0 && (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">No available crew right now.</p>
                  )}
                  {fifoPicks.map((row) => {
                    const lead = isTeamLead(row, staff, declarations)
                    return (
                      <div key={row.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                        <Avatar name={row.name} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-card-foreground">{row.name}</p>
                            {lead && (
                              <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-primary">
                                <UserCheck className="size-2.5" /> Team Lead
                              </span>
                            )}
                          </div>
                          <p className="text-[0.6rem] text-muted-foreground">{row.role}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Manual Mode */}
            {mode === 'manual' && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Pick crew one by one —{' '}
                    <span className="font-semibold text-card-foreground">
                      {manualIds.size} / {slotCount} selected
                    </span>
                    .
                  </p>
                  {slotsFullNotice && (
                    <p className="text-[0.62rem] font-semibold text-destructive">
                      All {slotCount} slots are filled — deselect someone or raise the slot count.
                    </p>
                  )}
                </div>
                <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto rounded-lg border border-border bg-background p-2">
                  {crewRows.map((row) => {
                    const selected = manualIds.has(row.staffId)
                    const isConflict = selectedEvent ? crewHasConflict(row, selectedEvent.id) : false
                    const isOverridden = overriddenStaffIds.has(row.staffId)
                    const lead = isTeamLead(row, staff, declarations)

                    return (
                      <button
                        key={row.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleManual(row)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition',
                          selected
                            ? 'bg-primary/10 ring-1 ring-primary/40'
                            : isConflict && !isOverridden
                              ? 'bg-destructive/5 hover:bg-destructive/10 border border-destructive/30'
                              : 'hover:bg-muted',
                        )}
                      >
                        <Avatar name={row.name} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-card-foreground">{row.name}</p>
                            {lead && (
                              <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-primary">
                                <UserCheck className="size-2.5" /> Team Lead
                              </span>
                            )}
                            {isConflict && !isOverridden && (
                              <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-destructive">
                                <Lock className="size-2.5" /> Hard-Blocked ({row.status})
                              </span>
                            )}
                            {isOverridden && (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-amber-600">
                                <ShieldAlert className="size-2.5" /> Overridden
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[0.6rem] text-muted-foreground">
                            {row.role} · {row.status}
                            {row.status === 'Assigned' && row.allocation ? ` on ${row.allocation.event}` : ''}
                          </p>
                        </div>
                        {isConflict && !isOverridden && !selected ? (
                          <span className="rounded bg-destructive px-2 py-1 text-[0.58rem] font-bold uppercase tracking-wider text-destructive-foreground hover:opacity-90">
                            Override
                          </span>
                        ) : (
                          <span
                            aria-hidden="true"
                            className={cn(
                              'flex size-4 shrink-0 items-center justify-center rounded-sm border transition',
                              selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card',
                            )}
                          >
                            {selected && (
                              <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M2.5 6.5 5 9l4.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Preset Mode */}
            {mode === 'preset' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {presetSquads.map((squad) => (
                    <button
                      key={squad.id}
                      type="button"
                      onClick={() => {
                        setPresetId(squad.id)
                        setSwappedOut(new Set())
                      }}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] transition',
                        presetId === squad.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {squad.name} · {squad.memberIds.length}
                    </button>
                  ))}
                </div>
                {preset && (
                  <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                    {preset.memberIds.map((staffId) => {
                      const row = crewRows.find((r) => r.staffId === staffId)
                      if (!row) return null
                      const removed = swappedOut.has(staffId)
                      const conflict = !removed && selectedEvent ? crewHasConflict(row, selectedEvent.id) : false
                      const isOverridden = overriddenStaffIds.has(staffId)
                      const isBlocked = conflict && !isOverridden
                      const lead = isTeamLead(row, staff, declarations)

                      return (
                        <div
                          key={staffId}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-2 py-1.5',
                            removed && 'opacity-40',
                            isBlocked && 'bg-destructive/5 border border-destructive/20',
                          )}
                        >
                          <Avatar
                            name={row.name}
                            className={cn(isBlocked && 'ring-2 ring-destructive')}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-card-foreground">{row.name}</p>
                              {lead && (
                                <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-primary">
                                  <UserCheck className="size-2.5" /> Team Lead
                                </span>
                              )}
                              {isBlocked && (
                                <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-destructive">
                                  <Lock className="size-2.5" /> Hard-Blocked
                                </span>
                              )}
                              {isOverridden && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-amber-600">
                                  <ShieldAlert className="size-2.5" /> Overridden
                                </span>
                              )}
                            </div>
                            <p className="text-[0.6rem] text-muted-foreground">
                              {removed ? 'Removed from squad' : row.status}
                              {row.allocation && !removed ? ` · ${row.allocation.event}` : ''}
                            </p>
                          </div>

                          {isBlocked ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setOverrideModal({
                                    row,
                                    conflictType: row.status === 'On Leave' ? 'On Leave' : 'Double Booked',
                                  })
                                  setJustification('')
                                }}
                                className="rounded bg-destructive px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-wider text-destructive-foreground hover:opacity-90 flex items-center gap-1"
                              >
                                <ShieldAlert className="size-3" /> Emergency Override
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemove(staffId)}
                                title="Remove from squad"
                                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-destructive"
                              >
                                <XCircle className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            conflict && !removed && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSwap(staffId)}
                                  title="Swap for another available crew member"
                                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                                >
                                  <ArrowLeftRight className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemove(staffId)}
                                  title="Remove from this assignment"
                                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-destructive"
                                >
                                  <XCircle className="size-3.5" />
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <p className="text-[0.6rem] text-muted-foreground">
            {finalPicks.length} crew member{finalPicks.length === 1 ? '' : 's'} will be assigned to{' '}
            {selectedEvent?.title ?? 'the selected event'}.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border bg-background px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirm Assignment
            </button>
          </div>
        </div>
      </div>

      {/* ─── Emergency Override Modal ─── */}
      {overrideModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Emergency Override Required</h3>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-card-foreground">{overrideModal.row.name}</span> is currently{' '}
              <span className="font-bold text-destructive">
                {overrideModal.conflictType === 'On Leave' ? 'On Leave' : `Assigned to ${overrideModal.row.allocation?.event ?? 'another event'}`}
              </span>
              . Hard-blocking prevents assignment without an emergency override.
            </p>

            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Mandatory Justification <span className="text-destructive">*</span>
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Enter mandatory override justification (e.g. Critical site shortfall requiring emergency recall)..."
                rows={3}
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/20"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOverrideModal(null)}
                className="rounded-md border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!justification.trim() || submittingOverride}
                onClick={handleConfirmOverride}
                className="rounded-md bg-destructive px-4 py-2 text-xs font-bold uppercase tracking-wider text-destructive-foreground hover:opacity-90 disabled:opacity-40"
              >
                {submittingOverride ? 'Saving...' : 'Submit Override & Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
