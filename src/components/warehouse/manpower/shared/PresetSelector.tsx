import { useMemo, useState } from 'react'
import { ArrowLeftRight, Plus, Settings, Trash2, X, XCircle } from 'lucide-react'
import type { CrewRow, PresetSquad } from '@/lib/warehouse-crew'
import type { Staff } from '@/lib/types'
import { checkSymmetricConflict, crewHasConflict, isTeamLead, savePresetSquad, deletePresetSquad } from '@/lib/warehouse-crew'
import { cn } from '@/lib/utils'

const FIELD_TASKS = [
  'Setup & Staging',
  'AV & Lighting',
  'Logistics & Loading',
  'Décor styling',
  'Floral install',
  'Load-out & strike',
  'Vehicle marshaling',
  'Client liaison',
  'Rigging & lighting',
  'Site supervision',
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

interface PresetSelectorProps {
  presetSquads: PresetSquad[]
  presetId: string
  onPresetChange: (id: string) => void
  presetMembers: CrewRow[]
  crewRows: CrewRow[]
  eventId?: string
  date?: string
  targetCategory?: string
  overriddenStaffIds?: Set<string>
  onSwapMember?: (outStaffId: string, inStaffId: string) => void
  onRemove?: (staffId: string) => void
  onSquadsUpdated?: () => void
  onTaskChange?: (task: string) => void
  staffList?: Staff[]
  declarations?: any[]
}

export function PresetSelector({
  presetSquads,
  presetId,
  onPresetChange,
  presetMembers,
  crewRows,
  eventId,
  date,
  targetCategory = 'Field',
  onSwapMember,
  onRemove,
  onSquadsUpdated,
  onTaskChange,
  staffList = [],
  declarations = [],
}: PresetSelectorProps) {
  const [managerOpen, setManagerOpen] = useState(false)
  const [swappingMemberId, setSwappingMemberId] = useState<string | null>(null)

  const currentSquad = presetSquads.find((s) => s.id === presetId)
  const [currentTask, setCurrentTask] = useState<string>(currentSquad?.defaultTask || FIELD_TASKS[0])

  // Derive available replacement candidates using FIFO availability rules
  const availableCandidates = useMemo(() => {
    const activeMemberIds = new Set(presetMembers.map((m) => m.staffId))
    return crewRows.filter((row) => {
      if (activeMemberIds.has(row.staffId)) return false
      if (row.status !== 'Available') return false
      if (eventId && crewHasConflict(row, eventId)) return false
      if (date) {
        const symmetric = checkSymmetricConflict(row.staffId, date, targetCategory as any)
        if (symmetric.hasConflict) return false
      }
      return true
    })
  }, [crewRows, presetMembers, eventId, date, targetCategory])

  const handleTaskSelect = (task: string) => {
    setCurrentTask(task)
    if (currentSquad) {
      savePresetSquad({ ...currentSquad, defaultTask: task })
    }
    if (onTaskChange) onTaskChange(task)
  }

  return (
    <div className="space-y-4">
      {/* Squad Dropdown, Task Badge & Squad Manager Trigger */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[0.58rem] text-muted-foreground">
              Preset Squad:
            </span>
            <select
              value={presetId}
              onChange={(e) => {
                onPresetChange(e.target.value)
                const sq = presetSquads.find((s) => s.id === e.target.value)
                if (sq?.defaultTask) {
                  setCurrentTask(sq.defaultTask)
                  if (onTaskChange) onTaskChange(sq.defaultTask)
                }
              }}
              className="rounded-md border border-input bg-card px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              {presetSquads.map((squad) => (
                <option key={squad.id} value={squad.id}>
                  {squad.name} ({squad.memberIds.length} members)
                </option>
              ))}
            </select>
          </label>

          {/* Per-Team Field Task Badge & Selector */}
          <div className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs">
            <span className="text-[0.58rem] font-bold uppercase tracking-wider text-primary">Team Task:</span>
            <select
              value={currentTask}
              onChange={(e) => handleTaskSelect(e.target.value)}
              className="bg-transparent font-semibold text-primary outline-none cursor-pointer text-xs"
            >
              {FIELD_TASKS.map((t) => (
                <option key={t} value={t} className="bg-card text-foreground">
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setManagerOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-foreground hover:bg-accent transition"
        >
          <Settings className="size-3.5 text-muted-foreground" />
          Manage Squads
        </button>
      </div>

      {/* Preset Member Cards */}
      {presetMembers.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No eligible members in this squad preset.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {presetMembers.map((crew) => {
            const isLead = isTeamLead(crew, staffList, declarations, date)
            const isSwapping = swappingMemberId === crew.staffId

            return (
              <div
                key={crew.id}
                className="flex flex-col justify-between rounded-lg border border-border bg-card p-3 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <Avatar name={crew.name} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-semibold text-card-foreground">{crew.name}</p>
                        {isLead && (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.2 text-[0.52rem] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            Lead
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[0.58rem] uppercase tracking-wider text-muted-foreground">
                        {crew.role}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Swap candidate"
                      onClick={() => setSwappingMemberId(isSwapping ? null : crew.staffId)}
                      className={cn(
                        'flex size-7 items-center justify-center rounded transition',
                        isSwapping
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <ArrowLeftRight className="size-3.5" />
                    </button>

                    {onRemove && (
                      <button
                        type="button"
                        title="Remove member from assignment"
                        onClick={() => onRemove(crew.staffId)}
                        className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                      >
                        <XCircle className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Candidate Replacement Dropdown */}
                {isSwapping && (
                  <div className="rounded-md border border-primary/40 bg-primary/5 p-2 space-y-1.5">
                    <p className="text-[0.58rem] font-bold uppercase tracking-wider text-primary">
                      Select Replacement Candidate (FIFO Available)
                    </p>
                    {availableCandidates.length === 0 ? (
                      <p className="text-[0.62rem] text-muted-foreground">No non-conflicting available candidates found.</p>
                    ) : (
                      <select
                        onChange={(e) => {
                          if (e.target.value && onSwapMember) {
                            onSwapMember(crew.staffId, e.target.value)
                            setSwappingMemberId(null)
                          }
                        }}
                        className="w-full rounded border border-input bg-background p-1.5 text-xs text-foreground outline-none focus:border-primary"
                      >
                        <option value="">Choose candidate...</option>
                        {availableCandidates.map((cand) => (
                          <option key={cand.staffId} value={cand.staffId}>
                            {cand.name} — {cand.role} (Available)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Squad Management Modal */}
      {managerOpen && (
        <PresetSquadManagerModal
          presetSquads={presetSquads}
          onClose={() => setManagerOpen(false)}
          onSquadsUpdated={() => {
            if (onSquadsUpdated) onSquadsUpdated()
          }}
        />
      )}
    </div>
  )
}

function PresetSquadManagerModal({
  presetSquads,
  onClose,
  onSquadsUpdated,
}: {
  presetSquads: PresetSquad[]
  onClose: () => void
  onSquadsUpdated: () => void
}) {
  const [squads, setSquads] = useState<PresetSquad[]>(presetSquads)
  const [newSquadName, setNewSquadName] = useState('')
  const [selectedTask, setSelectedTask] = useState(FIELD_TASKS[0])
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())

  const handleCreateNew = async () => {
    if (!newSquadName.trim()) return
    const newSquad: PresetSquad = {
      id: `squad-${Date.now()}`,
      name: newSquadName.trim(),
      defaultTask: selectedTask,
      memberIds: Array.from(selectedMemberIds),
    }
    await savePresetSquad(newSquad)
    setSquads((prev) => [...prev, newSquad])
    setNewSquadName('')
    setSelectedMemberIds(new Set())
    onSquadsUpdated()
  }

  const handleDelete = async (id: string) => {
    await deletePresetSquad(id)
    setSquads((prev) => prev.filter((s) => s.id !== id))
    onSquadsUpdated()
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[40rem] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl space-y-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div>
            <span className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-primary">
              Squad Management
            </span>
            <h2 className="font-serif text-lg font-bold text-card-foreground">
              Preset Squads Registry
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

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Create New Squad Section */}
          <div className="rounded-lg border border-border bg-background p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Create New Squad</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={newSquadName}
                onChange={(e) => setNewSquadName(e.target.value)}
                placeholder="Squad name (e.g. Squad Delta)..."
                className="rounded-md border border-input bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              />
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="rounded-md border border-input bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              >
                {FIELD_TASKS.map((t) => (
                  <option key={t} value={t}>
                    Task: {t}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleCreateNew}
              disabled={!newSquadName.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
            >
              <Plus className="size-3.5" />
              Save New Squad
            </button>
          </div>

          {/* Existing Squad List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Existing Squads</h3>
            {squads.map((sq) => (
              <div key={sq.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-foreground">{sq.name}</p>
                    {sq.defaultTask && (
                      <span className="rounded bg-primary/10 px-2 py-0.2 text-[0.55rem] font-bold uppercase text-primary border border-primary/20">
                        {sq.defaultTask}
                      </span>
                    )}
                  </div>
                  <p className="text-[0.6rem] text-muted-foreground mt-0.5">{sq.memberIds.length} designated members</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(sq.id)}
                  className="flex size-7 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-border pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
