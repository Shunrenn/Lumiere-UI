import { useState } from 'react'
import { X } from 'lucide-react'
import type { Staff } from '@/lib/types'
import type { CrewAssignmentStatus, EventCrewAssignment } from '@/lib/event-detail'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS: CrewAssignmentStatus[] = ['Confirmed', 'Pending', 'Unavailable']

interface AssignCrewModalProps {
  availableStaff: Staff[]
  assigned: EventCrewAssignment[]
  onClose: () => void
  onSave: (crew: EventCrewAssignment[]) => void
}

export function AssignCrewModal({ availableStaff, assigned, onClose, onSave }: AssignCrewModalProps) {
  const [selection, setSelection] = useState<Map<string, CrewAssignmentStatus>>(
    () => new Map(assigned.map((member) => [member.id, member.status])),
  )

  const toggle = (staff: Staff) => {
    setSelection((prev) => {
      const next = new Map(prev)
      if (next.has(staff.id)) next.delete(staff.id)
      else next.set(staff.id, 'Pending')
      return next
    })
  }

  const setStatus = (staffId: string, status: CrewAssignmentStatus) => {
    setSelection((prev) => new Map(prev).set(staffId, status))
  }

  const handleSave = () => {
    const crew: EventCrewAssignment[] = availableStaff
      .filter((staff) => selection.has(staff.id))
      .map((staff) => ({
        id: staff.id,
        name: `${staff.firstName} ${staff.surname}`,
        role: staff.role,
        status: selection.get(staff.id) ?? 'Pending',
      }))
    onSave(crew)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Manning &amp; crew
            </p>
            <h2 className="mt-1 font-serif text-xl font-medium text-card-foreground">Add / Reassign Crew</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {availableStaff.length === 0 ? (
            <p className="text-sm text-muted-foreground">No field crew available in the roster.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {availableStaff.map((staff) => {
                const checked = selection.has(staff.id)
                return (
                  <li
                    key={staff.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors',
                      checked ? 'border-primary/50 bg-primary/10' : 'border-border bg-background',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(staff)}
                      aria-label={`Assign ${staff.firstName} ${staff.surname}`}
                      className="size-4 shrink-0 accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-card-foreground">
                        {staff.firstName} {staff.surname}
                      </p>
                      <p className="truncate text-[0.65rem] uppercase tracking-[0.06em] text-muted-foreground">
                        {staff.role}
                      </p>
                    </div>
                    {checked && (
                      <select
                        value={selection.get(staff.id)}
                        onChange={(event) => setStatus(staff.id, event.target.value as CrewAssignmentStatus)}
                        aria-label={`Status for ${staff.firstName} ${staff.surname}`}
                        className="shrink-0 rounded-md border border-border bg-card px-2 py-1.5 text-[0.65rem] font-medium text-card-foreground outline-none focus:border-primary"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            Save crew
          </button>
        </div>
      </div>
    </div>
  )
}
