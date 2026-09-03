import { useState } from 'react'
import { ChevronLeft, ChevronRight, Save, RotateCcw, Check, X } from 'lucide-react'
import type { Staff } from '@/lib/types'
import {
  batchUpdateShifts,
  dayLabel,
  getCrewPool,
  getOpsWeekDates,
  useShiftGrid,
  type ShiftCode,
} from '@/lib/warehouse-crew'
import { cn } from '@/lib/utils'

const SHIFT_STYLE: Record<ShiftCode, string> = {
  AM: 'bg-primary/15 text-primary',
  PM: 'bg-accent text-accent-foreground',
  OFF: 'bg-muted text-muted-foreground',
}

const CYCLE: ShiftCode[] = ['AM', 'PM', 'OFF']

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.6rem] font-bold uppercase tracking-wide text-primary ring-1 ring-border">
      {initials}
    </span>
  )
}

interface CrewOpsGridProps {
  staff: Staff[]
}

// Daily-Weekly Ops — a shift-roster grid (days as columns, crew as rows) for
// non-event-bound warehouse staffing, independent of any specific event.
export function CrewOpsGrid({ staff }: CrewOpsGridProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [draftGrid, setDraftGrid] = useState<Record<string, ShiftCode>>({})
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [discardModalOpen, setDiscardModalOpen] = useState(false)

  const dates = getOpsWeekDates(weekOffset)
  const grid = useShiftGrid(staff, dates)
  const pool = getCrewPool(staff)

  // Calculate actual pending changes where draft value differs from persisted grid value
  const pendingChanges = Object.entries(draftGrid).filter(
    ([key, draftShift]) => (grid[key] ?? 'OFF') !== draftShift,
  )
  const pendingCount = pendingChanges.length

  const handleCellClick = (staffId: string, date: string) => {
    const key = `${staffId}__${date}`
    const currentShift = draftGrid[key] ?? grid[key] ?? 'OFF'
    const nextShift = CYCLE[(CYCLE.indexOf(currentShift) + 1) % CYCLE.length]
    setDraftGrid((prev) => ({ ...prev, [key]: nextShift }))
  }

  const handleConfirmSave = () => {
    if (pendingCount === 0) return
    batchUpdateShifts(draftGrid)
    setDraftGrid({})
    setSaveModalOpen(false)
  }

  const handleConfirmDiscard = () => {
    setDraftGrid({})
    setDiscardModalOpen(false)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* ─── Header Row & Controls ─── */}
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg font-bold text-card-foreground">Daily-Weekly Ops</h2>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {pendingCount} staged edit{pendingCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <p className="text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">
            Shift roster for warehouse staffing — click cell to stage AM / PM / OFF, then click Save to commit.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 mr-2">
              <button
                type="button"
                onClick={() => setDiscardModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <RotateCcw className="size-3.5" />
                Discard
              </button>
              <button
                type="button"
                onClick={() => setSaveModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                <Save className="size-3.5" />
                Save Changes ({pendingCount})
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 border-l border-border pl-2">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              aria-label="Previous week"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              aria-label="Next week"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Scrollable Table Body with Sticky Headers ─── */}
      <div className="max-h-[28rem] overflow-y-auto overflow-x-auto">
        <table className="w-full min-w-[880px] text-left border-collapse">
          <thead>
            <tr className="sticky top-0 z-20 border-b border-border bg-muted/95 backdrop-blur-sm shadow-xs">
              <th className="sticky left-0 top-0 z-30 bg-muted px-5 py-3 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground border-r border-border/80">
                Crew Member
              </th>
              {dates.map((date) => (
                <th
                  key={date}
                  className="px-3 py-3 text-center text-[0.56rem] font-bold uppercase tracking-[0.1em] text-muted-foreground"
                >
                  {dayLabel(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pool.length === 0 ? (
              <tr>
                <td colSpan={dates.length + 1} className="px-5 py-16 text-center text-xs text-muted-foreground">
                  No field &amp; production crew on the roster yet.
                </td>
              </tr>
            ) : (
              pool.map((member) => (
                <tr key={member.id} className="border-t border-border/60 align-middle transition-colors hover:bg-accent/30">
                  <td className="sticky left-0 z-10 bg-card px-5 py-2.5 border-r border-border/80 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={`${member.firstName} ${member.surname}`} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-card-foreground">
                          {member.firstName} {member.surname}
                        </p>
                        <p className="truncate text-[0.58rem] uppercase tracking-[0.06em] text-muted-foreground">
                          {member.employeeId}
                        </p>
                      </div>
                    </div>
                  </td>
                  {dates.map((date) => {
                    const key = `${member.id}__${date}`
                    const persistedShift = grid[key] ?? 'OFF'
                    const currentShift = draftGrid[key] ?? persistedShift
                    const isDraft = key in draftGrid && draftGrid[key] !== persistedShift

                    return (
                      <td key={date} className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleCellClick(member.id, date)}
                          aria-label={`Cycle shift for ${member.firstName} ${member.surname} on ${dayLabel(date)}, currently ${currentShift}`}
                          className={cn(
                            'relative w-full rounded-md px-2 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.06em] transition',
                            SHIFT_STYLE[currentShift],
                            isDraft && 'ring-2 ring-amber-500/90 ring-offset-1 font-extrabold shadow-xs',
                          )}
                        >
                          {currentShift}
                          {isDraft && (
                            <span className="absolute -top-1 -right-1 flex size-2.5 items-center justify-center rounded-full bg-amber-500 text-white font-mono text-[0.45rem]">
                              •
                            </span>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Save Changes Confirmation Modal ─── */}
      {saveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setSaveModalOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl bg-card p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <span className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-primary">
                  Confirm Shift Changes
                </span>
                <h3 className="font-serif text-lg font-bold text-card-foreground mt-0.5">
                  Save {pendingCount} Staged Shift Edit{pendingCount === 1 ? '' : 's'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Review the roster modifications about to be committed to the Daily Operations schedule:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {pendingChanges.map(([key, nextShift]) => {
                const [staffId, date] = key.split('__')
                const member = pool.find((m) => m.id === staffId)
                const oldShift = grid[key] ?? 'OFF'
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-card-foreground">
                        {member ? `${member.firstName} ${member.surname}` : staffId}
                      </p>
                      <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">{dayLabel(date)}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold">
                      <span className="text-muted-foreground/80">{oldShift}</span>
                      <span className="text-muted-foreground">➔</span>
                      <span className="rounded bg-primary/15 px-2 py-0.5 text-primary">{nextShift}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="rounded-md border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm hover:opacity-90"
              >
                <Check className="size-4" />
                Confirm &amp; Commit Shifts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Discard Safety Prompt Modal ─── */}
      {discardModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setDiscardModalOpen(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl bg-card p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <span className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-destructive">
                  Discard Staged Edits
                </span>
                <h3 className="font-serif text-lg font-bold text-card-foreground mt-0.5">
                  Discard {pendingCount} Shift Edit{pendingCount === 1 ? '' : 's'}?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDiscardModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to discard all uncommitted shift modifications? Staged edits will be wiped and reset to current persisted shifts.
            </p>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setDiscardModalOpen(false)}
                className="rounded-md border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent"
              >
                Keep Edits
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="rounded-md bg-destructive px-4 py-2 text-xs font-bold uppercase tracking-wider text-destructive-foreground hover:opacity-90"
              >
                Discard Edits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
