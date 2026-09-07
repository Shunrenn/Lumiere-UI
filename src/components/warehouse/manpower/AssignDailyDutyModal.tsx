import { useMemo, useState } from 'react'
import { AlertTriangle, Lock, ShieldAlert, UserCheck, X } from 'lucide-react'
import type { CrewRow, PresetSquad, WarehouseZone, DutyCategory } from '@/lib/warehouse-crew'
import { assignDailyDuty, checkSymmetricConflict, crewHasConflict, isTeamLead, type AssignMode } from '@/lib/warehouse-crew'
import { createOverride, useManningData } from '@/lib/manning'
import { useAuth } from '@/lib/auth'
import { usePortal } from '@/lib/store'
import { useGroundCrewDeclarations } from '@/lib/ground-crew-declarations'
import { cn } from '@/lib/utils'
import { FifoSelector } from './shared/FifoSelector'
import { PresetSelector } from './shared/PresetSelector'
import { ManualCrewPicker } from './shared/ManualCrewPicker'

interface AssignDailyDutyModalProps {
  date: string
  department: 'Warehouse' | 'Production'
  zone?: WarehouseZone
  crewRows: CrewRow[]
  presetSquads: PresetSquad[]
  onClose: () => void
  onSuccess?: () => void
}

export function AssignDailyDutyModal({
  date,
  department,
  zone,
  crewRows,
  presetSquads,
  onClose,
  onSuccess,
}: AssignDailyDutyModalProps) {
  const { adminName, adminEmail } = useAuth()
  const { staff } = usePortal()
  const { assignments: activeFieldAssignments } = useManningData()
  const declarations = useGroundCrewDeclarations()
  const actor = adminName || adminEmail || 'Manning Manager'

  const [mode, setMode] = useState<AssignMode>('fifo')
  const [slotCount, setSlotCount] = useState(2)
  const [manualIds, setManualIds] = useState<Set<string>>(new Set())
  const [presetId, setPresetId] = useState(presetSquads[0]?.id ?? '')
  const [swappedOut, setSwappedOut] = useState<Set<string>>(new Set())
  const [isTeamLeadToday, setIsTeamLeadToday] = useState(false)
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

  // FIFO Mode: picks strictly available non-conflicting crew members
  const available = useMemo(() => {
    return crewRows.filter((row) => {
      if (row.status !== 'Available') return false
      const symmetric = checkSymmetricConflict(row.staffId, date, department, activeFieldAssignments)
      if (symmetric.hasConflict) return false
      return true
    })
  }, [crewRows, date, department, activeFieldAssignments])

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
        const symmetric = checkSymmetricConflict(row.staffId, date, department, activeFieldAssignments)
        if (symmetric.hasConflict && !overriddenStaffIds.has(row.staffId)) return false
        return true
      })
  }, [preset, crewRows, swappedOut, date, department, activeFieldAssignments, overriddenStaffIds])

  const toggleManual = (row: CrewRow) => {
    setSlotsFullNotice(false)
    const staffId = row.staffId
    const symmetric = checkSymmetricConflict(staffId, date, department, activeFieldAssignments)

    if (symmetric.hasConflict && !overriddenStaffIds.has(staffId) && !manualIds.has(staffId)) {
      const conflictType: 'On Leave' | 'Double Booked' =
        row.status === 'On Leave' ? 'On Leave' : 'Double Booked'
      setOverrideModal({
        row,
        conflictType,
        conflictDetails: symmetric.details || `Assigned as Field Crew on target date ${date}`,
      })
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
    if (!overrideModal || !justification.trim()) return
    setSubmittingOverride(true)
    try {
      await createOverride({
        staff_id: overrideModal.row.staffId,
        staff_name: overrideModal.row.name,
        event_id: `daily-duty-${date}`,
        event_title: `Daily Duty Assignment (${department}${zone ? ` · ${zone}` : ''})`,
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

  const canConfirm = finalPicks.length > 0

  const handleConfirm = () => {
    if (finalPicks.length === 0) return

    finalPicks.forEach((row, idx) => {
      assignDailyDuty({
        date,
        staffId: row.staffId,
        staffName: row.name,
        dutyCategory: department,
        zone: department === 'Warehouse' ? zone : undefined,
        // Designate Team Lead for the first picked worker or explicit toggle
        isTeamLeadToday: idx === 0 ? isTeamLeadToday || isTeamLead(row, staff, declarations, date) : false,
        assignedBy: actor,
      })
    })

    if (onSuccess) onSuccess()
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
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-primary">
              Daily Duty Assignment
            </p>
            <h2 className="mt-1 font-serif text-xl font-medium text-card-foreground">
              Assign {department} Crew {zone ? `— ${zone}` : ''}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Target Date: <span className="font-semibold text-foreground">{date}</span></p>
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
          {/* Team Lead Designation Checkbox */}
          <div className="rounded-lg border border-border bg-background p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">Designate Team Lead for Today</p>
              <p className="text-[0.68rem] text-muted-foreground">
                Assign Lead status to the primary worker for this {department} duty on {date}.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isTeamLeadToday}
                onChange={(e) => setIsTeamLeadToday(e.target.checked)}
                className="size-4 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Lead Today</span>
            </label>
          </div>

          {/* Slots & Config */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
              />
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
                date={date}
              />
            )}

            {mode === 'preset' && (
              <PresetSelector
                presetSquads={presetSquads}
                presetId={presetId}
                onPresetChange={setPresetId}
                presetMembers={presetMembers}
                onSwapOut={handleSwap}
                onRemove={handleRemove}
                staffList={staff}
                declarations={declarations}
                date={date}
              />
            )}

            {mode === 'manual' && (
              <ManualCrewPicker
                crewRows={crewRows}
                selectedIds={manualIds}
                onToggle={toggleManual}
                date={date}
                targetCategory={department}
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
            {finalPicks.length} worker{finalPicks.length === 1 ? '' : 's'} staged
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
              Assign {department} Duty
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
              <span className="font-semibold text-foreground">{overrideModal.row.name}</span> is currently hard-blocked ({overrideModal.conflictDetails || overrideModal.conflictType}). Assigning Daily Duty requires an Emergency Override.
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
