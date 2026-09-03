import { useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Plus, Star, AlertTriangle } from 'lucide-react'
import type { CrewRow, PresetSquad, WarehouseZone } from '@/lib/warehouse-crew'
import { getDailyDutyAssignments, removeDailyDutyAssignment } from '@/lib/warehouse-crew'
import { AssignDailyDutyModal } from './AssignDailyDutyModal'

const WAREHOUSE_ZONES: WarehouseZone[] = [
  'Logistics & Movement',
  'Artificials Inventory',
  'Centerpieces Inventory',
  'Drapery & Fabrics',
  'Lighting & Rigging',
  'Staging & Hardware',
]

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

interface DailyZoneDutyViewProps {
  crewRows: CrewRow[]
  presetSquads: PresetSquad[]
}

export function DailyZoneDutyView({ crewRows, presetSquads }: DailyZoneDutyViewProps) {
  const [selectedDate, setSelectedDate] = useState('2026-08-20')
  const [modalTarget, setModalTarget] = useState<{
    department: 'Warehouse' | 'Production'
    zone?: WarehouseZone
  } | null>(null)

  // Force re-render on mutation
  const [, setRevision] = useState(0)
  const refresh = () => setRevision((r) => r + 1)

  const dailyDuties = useMemo(() => {
    return getDailyDutyAssignments(selectedDate)
  }, [selectedDate, refresh])

  const productionDuties = useMemo(() => {
    return dailyDuties.filter((d) => d.dutyCategory === 'Production')
  }, [dailyDuties])

  const handlePrevDay = () => {
    const d = new Date(`${selectedDate}T00:00:00`)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const handleNextDay = () => {
    const d = new Date(`${selectedDate}T00:00:00`)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const dateLabelFormatted = useMemo(() => {
    const d = new Date(`${selectedDate}T00:00:00`)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }, [selectedDate])

  return (
    <div className="space-y-6">
      {/* ─── Date Picker Controls ─── */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-primary" />
            <h2 className="font-serif text-lg font-bold text-card-foreground">Daily Duty Breakdown</h2>
          </div>
          <p className="text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">
            Per-day department &amp; zone duty assignments. Gap callouts highlight unstaffed zones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevDay}
            className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
            <span>{dateLabelFormatted}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="w-4 bg-transparent opacity-60 cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* ─── Production Department Section ─── */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-purple-500/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Department
              </span>
              <h3 className="font-serif text-base font-bold text-card-foreground">Production Duty</h3>
            </div>
            <p className="text-[0.62rem] text-muted-foreground mt-0.5">
              Bespoke item fabrication and workshop commitments for {selectedDate}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalTarget({ department: 'Production' })}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-primary-foreground transition hover:opacity-90 shadow-xs"
          >
            <Plus className="size-3.5" />
            Assign Production
          </button>
        </div>

        {productionDuties.length === 0 ? (
          <div className="flex items-center justify-between rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-xs text-amber-700 dark:text-amber-400">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="size-4 shrink-0 text-amber-500" />
              <div>
                <p className="font-bold uppercase tracking-wider text-[0.68rem]">No Crew Assigned</p>
                <p className="text-[0.65rem] text-muted-foreground">No production crew members scheduled for bespoke fabrication on this date.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModalTarget({ department: 'Production' })}
              className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-amber-700 hover:bg-amber-500/20"
            >
              + Assign Crew
            </button>
          </div>
        ) : (
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {productionDuties.map((duty) => (
              <div
                key={duty.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <Avatar name={duty.staffName} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-foreground">{duty.staffName}</p>
                      {duty.isTeamLeadToday && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.2 text-[0.55rem] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <Star className="size-2.5 fill-amber-500 text-amber-500" />
                          Lead Today
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[0.58rem] uppercase tracking-wider text-muted-foreground">
                      Bespoke Item Fabrication
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    removeDailyDutyAssignment(duty.id)
                    refresh()
                  }}
                  className="rounded px-2 py-1 text-[0.55rem] font-bold uppercase tracking-wider text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Warehouse Department Section (Grouped by Zones) ─── */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-500/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Department
            </span>
            <h3 className="font-serif text-base font-bold text-card-foreground">Warehouse Operations</h3>
          </div>
          <p className="text-[0.62rem] text-muted-foreground mt-0.5">
            Physical inventory management and logistics sub-divided by warehouse zones.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {WAREHOUSE_ZONES.map((zone) => {
            const zoneDuties = dailyDuties.filter(
              (d) => d.dutyCategory === 'Warehouse' && d.zone === zone,
            )
            const hasLead = zoneDuties.some((d) => d.isTeamLeadToday)

            return (
              <div
                key={zone}
                className="rounded-lg border border-border bg-background p-4 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">{zone}</h4>
                    </div>
                    <span className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">
                      {zoneDuties.length} assigned
                    </span>
                  </div>

                  {zoneDuties.length === 0 ? (
                    <div className="rounded-md border border-dashed border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        <span className="text-[0.65rem] font-semibold">No Crew Assigned</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModalTarget({ department: 'Warehouse', zone })}
                        className="text-[0.58rem] font-bold uppercase tracking-wider text-destructive hover:underline"
                      >
                        + Assign
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {!hasLead && (
                        <div className="rounded bg-amber-500/10 px-2 py-1 text-[0.6rem] font-medium text-amber-700 dark:text-amber-400 mb-2">
                          ⚠️ No Lead Designated for this Zone today.
                        </div>
                      )}
                      {zoneDuties.map((duty) => (
                        <div
                          key={duty.id}
                          className="flex items-center justify-between rounded-md border border-border bg-card p-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar name={duty.staffName} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-xs font-semibold text-foreground">{duty.staffName}</p>
                                {duty.isTeamLeadToday && (
                                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.2 text-[0.52rem] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                    <Star className="size-2 fill-amber-500 text-amber-500" />
                                    Lead Today
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              removeDailyDutyAssignment(duty.id)
                              refresh()
                            }}
                            className="text-[0.55rem] font-bold uppercase text-muted-foreground hover:text-destructive"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-border/60 pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModalTarget({ department: 'Warehouse', zone })}
                    className="inline-flex items-center gap-1 rounded border border-border bg-card px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-foreground hover:bg-accent transition"
                  >
                    <Plus className="size-3" />
                    Assign to {zone}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Modal Target Rendering ─── */}
      {modalTarget && (
        <AssignDailyDutyModal
          date={selectedDate}
          department={modalTarget.department}
          zone={modalTarget.zone}
          crewRows={crewRows}
          presetSquads={presetSquads}
          onClose={() => setModalTarget(null)}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}
