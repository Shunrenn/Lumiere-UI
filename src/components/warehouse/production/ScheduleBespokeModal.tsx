import { useState, useMemo } from 'react'
import { X, Calendar, Users, Sun, Moon, Zap, ArrowRight, ShieldCheck } from 'lucide-react'
import {
  calculateProductionSchedule,
  scheduleBespokeItem,
  SHIFT_CONFIGS,
  type ShiftType,
} from '@/lib/warehouse-production'
import {
  getCatalogAssets,
  getBespokeSubCategoryConfigs,
  formatSmartDuration,
} from '@/lib/warehouse-catalog'
import { usePortal } from '@/lib/store'
import { cn } from '@/lib/utils'

interface ScheduleBespokeModalProps {
  onClose: () => void
  onScheduled?: () => void
}

export function ScheduleBespokeModal({ onClose, onScheduled }: ScheduleBespokeModalProps) {
  const { events } = usePortal()
  const bespokeAssets = useMemo(() => getCatalogAssets().filter((a) => a.category === 'Bespoke'), [])
  const subCategoryConfigs = useMemo(() => getBespokeSubCategoryConfigs(), [])

  const [selectedAssetId, setSelectedAssetId] = useState(bespokeAssets[0]?.id || '')
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '')
  const [quota, setQuota] = useState(6)
  const [assignedWorkers, setAssignedWorkers] = useState(3)
  const [shiftSelection, setShiftSelection] = useState<ShiftType>('morning')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))

  const selectedAsset = useMemo(
    () => bespokeAssets.find((a) => a.id === selectedAssetId) || bespokeAssets[0],
    [bespokeAssets, selectedAssetId],
  )
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || { id: '', title: 'General Stock Build' },
    [events, selectedEventId],
  )

  const subCat = selectedAsset?.subCategory || 'Fabrication / Backdrops'
  const maxParallel = subCategoryConfigs[subCat]?.maxParallelWorkers ?? 3
  const baseMinutes = selectedAsset?.baseSingleWorkerTimeMinutes || 48

  // Real-time calculation preview
  const previewSchedule = useMemo(() => {
    return calculateProductionSchedule({
      quota,
      baseSingleWorkerMinutes: baseMinutes,
      maxParallelWorkers: maxParallel,
      assignedWorkers,
      shift: shiftSelection,
      startDate,
    })
  }, [quota, baseMinutes, maxParallel, assignedWorkers, shiftSelection, startDate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAsset) return

    scheduleBespokeItem({
      asset: selectedAsset,
      eventId: selectedEvent.id,
      eventTitle: selectedEvent.title,
      quota,
      assignedWorkers,
      shiftSelection,
      startDate,
    })

    onScheduled?.()
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
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl border border-border max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/15 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-primary">
                Production Module
              </span>
              <span className="text-xs text-muted-foreground">Gantt Dispatch Scheduler</span>
            </div>
            <h2 className="mt-1 font-serif text-xl font-medium text-foreground">Schedule Bespoke Fabrication</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-6 text-xs gap-5">
          {/* Asset & Event Selection */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                Bespoke Item Type <span className="text-destructive">*</span>
              </label>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
              >
                {bespokeAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} ({asset.subCategory || 'Bespoke'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                Target Event Allocation
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="">General Stock / Cross-Event Build</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.targetDate})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quota & Workers Inputs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                Production Quota (Qty)
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={quota}
                onChange={(e) => setQuota(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono font-bold text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                Assigned Crew (Workers)
              </label>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground shrink-0" />
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={assignedWorkers}
                  onChange={(e) => setAssignedWorkers(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono font-bold text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                Start Date
              </label>
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground shrink-0" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Shift Selection Pills */}
          <div className="flex flex-col gap-2">
            <label className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
              Workshop Shift Selection
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {(Object.keys(SHIFT_CONFIGS) as ShiftType[]).map((st) => {
                const cfg = SHIFT_CONFIGS[st]
                const isSelected = shiftSelection === st
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setShiftSelection(st)}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/50',
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {st === 'morning' && <Sun className="size-3.5" />}
                      {st === 'night' && <Moon className="size-3.5" />}
                      {st === 'both' && <Zap className="size-3.5" />}
                      <span className="font-semibold text-xs text-foreground">{cfg.label}</span>
                    </div>
                    <span className="text-[0.6rem] text-muted-foreground">{cfg.window}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Scheduling Calculation Engine Output */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-primary/20 pb-2">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-primary">
                Engine Derivation &amp; Diminishing Returns
              </span>
              <span className="font-mono text-[0.62rem] text-muted-foreground">
                Base: {formatSmartDuration(baseMinutes)} · Cap: {maxParallel} workers
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
              <div className="rounded-md border border-border/80 bg-background/80 p-2.5">
                <p className="text-[0.55rem] font-bold uppercase text-muted-foreground">Time Per Unit</p>
                <p className="mt-1 font-mono font-bold text-foreground">
                  {formatSmartDuration(previewSchedule.computedMinutesPerItem)}
                </p>
                {assignedWorkers > maxParallel && (
                  <p className="text-[0.52rem] text-amber-500 font-semibold">Capped at {maxParallel} crew</p>
                )}
              </div>

              <div className="rounded-md border border-border/80 bg-background/80 p-2.5">
                <p className="text-[0.55rem] font-bold uppercase text-muted-foreground">Total Work Hours</p>
                <p className="mt-1 font-mono font-bold text-foreground">
                  {previewSchedule.computedTotalWorkHours}h
                </p>
                <p className="text-[0.52rem] text-muted-foreground">{quota} units total</p>
              </div>

              <div className="rounded-md border border-border/80 bg-background/80 p-2.5">
                <p className="text-[0.55rem] font-bold uppercase text-muted-foreground">Required Work Days</p>
                <p className="mt-1 font-mono font-bold text-primary text-base">
                  {previewSchedule.computedWorkDays} Day{previewSchedule.computedWorkDays === 1 ? '' : 's'}
                </p>
                <p className="text-[0.52rem] text-muted-foreground">
                  {SHIFT_CONFIGS[shiftSelection].effectiveWorkHours}h/day net
                </p>
              </div>

              <div className="rounded-md border border-primary/40 bg-primary/10 p-2.5">
                <p className="text-[0.55rem] font-bold uppercase text-primary">Computed Completion</p>
                <p className="mt-1 font-mono font-bold text-primary text-sm">
                  {previewSchedule.computedEndDate}
                </p>
                <span className="text-[0.52rem] font-semibold text-primary/80 uppercase">Read-Only</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[0.62rem] text-muted-foreground pt-1">
              <ShieldCheck className="size-3.5 text-primary shrink-0" />
              <span>
                Snapshot will lock baseline at <strong className="text-foreground">{formatSmartDuration(baseMinutes)}</strong>.
                Future simulation tests will not shift this scheduled job.
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground transition hover:opacity-90"
            >
              Confirm &amp; Place on Gantt
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
