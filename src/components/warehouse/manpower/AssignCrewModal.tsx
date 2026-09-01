import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeftRight, X, XCircle } from 'lucide-react'
import type { PortalEvent } from '@/lib/types'
import {
  assignCrewToEvent,
  crewHasConflict,
  type AssignMode,
  type CrewRow,
  type PresetSquad,
} from '@/lib/warehouse-crew'
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
  const [mode, setMode] = useState<AssignMode>('fifo')
  const [eventId, setEventId] = useState(events[0]?.id ?? '')
  const [task, setTask] = useState(FIELD_TASKS[0])
  const [slotCount, setSlotCount] = useState(3)
  const [manualIds, setManualIds] = useState<Set<string>>(new Set())
  const [presetId, setPresetId] = useState(presetSquads[0]?.id ?? '')
  const [swappedOut, setSwappedOut] = useState<Set<string>>(new Set())
  const [slotsFullNotice, setSlotsFullNotice] = useState(false)

  const selectedEvent = events.find((e) => e.id === eventId)
  const available = useMemo(() => crewRows.filter((row) => row.status === 'Available'), [crewRows])

  const fifoPicks = useMemo(() => available.slice(0, slotCount), [available, slotCount])

  const preset = presetSquads.find((s) => s.id === presetId)
  const presetMembers = useMemo(() => {
    if (!preset) return []
    return preset.memberIds
      .filter((id) => !swappedOut.has(id))
      .map((id) => crewRows.find((row) => row.staffId === id))
      .filter((row): row is CrewRow => Boolean(row))
  }, [preset, crewRows, swappedOut])

  // Toggling is driven from a single handler on the row button. The row used
  // to also contain a live checkbox, so a click on the checkbox fired both
  // the input's onChange and the row's onClick — two toggles that cancelled
  // each other out and left the counter pinned at 0.
  const toggleManual = (staffId: string) => {
    setSlotsFullNotice(false)
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

  const finalPicks: CrewRow[] =
    mode === 'fifo' ? fifoPicks : mode === 'manual' ? crewRows.filter((r) => manualIds.has(r.staffId)) : presetMembers

  const canConfirm = Boolean(selectedEvent) && finalPicks.length > 0

  const handleConfirm = () => {
    if (!selectedEvent) return
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
        className="flex h-full max-h-[42rem] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Manpower &amp; Crew
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
            {mode === 'fifo' && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  The next {slotCount} available crew members will be auto-assigned, in roster order.
                </p>
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                  {fifoPicks.length === 0 && (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">No available crew right now.</p>
                  )}
                  {fifoPicks.map((row) => (
                    <div key={row.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                      <Avatar name={row.name} />
                      <div>
                        <p className="text-xs font-semibold text-card-foreground">{row.name}</p>
                        <p className="text-[0.6rem] text-muted-foreground">{row.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    // Only crew on leave are hard-blocked; already-assigned
                    // crew stay pickable so a manager can reassign them.
                    const disabled = row.status === 'On Leave' && !selected
                    return (
                      <button
                        key={row.id}
                        type="button"
                        disabled={disabled}
                        aria-pressed={selected}
                        onClick={() => toggleManual(row.staffId)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition',
                          selected ? 'bg-primary/10 ring-1 ring-primary/40' : 'hover:bg-muted',
                          disabled && 'cursor-not-allowed opacity-40',
                        )}
                      >
                        <Avatar name={row.name} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-card-foreground">{row.name}</p>
                          <p className="truncate text-[0.6rem] text-muted-foreground">
                            {row.role} · {row.status}
                            {row.status === 'Assigned' && row.allocation ? ` on ${row.allocation.event}` : ''}
                          </p>
                        </div>
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
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

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
                      return (
                        <div
                          key={staffId}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-2 py-1.5',
                            removed && 'opacity-40',
                          )}
                        >
                          <Avatar
                            name={row.name}
                            className={cn(conflict && !removed && 'ring-2 ring-destructive')}
                          />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-card-foreground">{row.name}</p>
                            <p className="text-[0.6rem] text-muted-foreground">
                              {removed ? 'Removed from squad' : row.status}
                              {row.allocation && !removed ? ` · ${row.allocation.event}` : ''}
                            </p>
                          </div>
                          {conflict && !removed && (
                            <span className="inline-flex items-center gap-1 text-[0.55rem] font-bold uppercase tracking-[0.08em] text-destructive">
                              <AlertTriangle className="size-3" /> Conflict
                            </span>
                          )}
                          {conflict && !removed && (
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
    </div>
  )
}
