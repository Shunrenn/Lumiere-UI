import { useEffect, useMemo, useState } from 'react'
import { X, AlertCircle, MapPin, Users, Truck, Target, CalendarDays, Pencil, Check, Sparkles, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortal } from '@/lib/store'

interface Props {
  isOpen: boolean
  onClose: () => void
  onInitialize: (deployment: {
    event: string
    venue: string
    task: string
    date: string
    crewLeads: string[]
    staffMembers: string[]
    vehicle: string
  }) => void
}

interface CrewCandidate {
  id: string
  name: string
  role: string
  available: boolean
}

// Available senior stylists eligible to lead a deployment for the selected date range.
const LEAD_POOL: CrewCandidate[] = [
  { id: 'lead-1', name: 'Eleanor Vance', role: 'Senior Event Stylist', available: true },
  { id: 'lead-2', name: 'Sebastian Cross', role: 'Lead Décor Stylist', available: true },
  { id: 'lead-3', name: 'Isadora Wren', role: 'Senior Floral Designer', available: true },
  { id: 'lead-4', name: 'Marcus Sterling', role: 'Lighting Director', available: false },
]

// Logistics & technical staff pool. Only `available` members surface as suggestions.
const STAFF_POOL: CrewCandidate[] = [
  { id: 'staff-1', name: 'J. Moreau', role: 'Logistics Technician', available: true },
  { id: 'staff-2', name: 'R. Nakamura', role: 'Rigging & Lighting', available: true },
  { id: 'staff-3', name: 'S. Chen', role: 'Fleet Coordinator', available: true },
  { id: 'staff-4', name: 'D. Okafor', role: 'Setup Technician', available: true },
  { id: 'staff-5', name: 'P. Alvarez', role: 'Décor Assembly', available: false },
]

const AUTO_STAFF_COUNT = 2

function initials(name: string) {
  return name
    .replace(/\./g, '')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
}

export function DeployTaskForceModal({ isOpen, onClose, onInitialize }: Props) {
  const { events } = usePortal()
  const [selectedEvent, setSelectedEvent] = useState('')
  const [setupStartDate, setSetupStartDate] = useState('')
  const [stylingDeadline, setStylingDeadline] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState('Truck Alpha (6-Ton)')
  const [operationalBrief, setOperationalBrief] = useState('')
  const [initializing, setInitializing] = useState(false)

  // Auto-allocation state — populated on open with the first available crew.
  const [leadId, setLeadId] = useState('')
  const [staffIds, setStaffIds] = useState<string[]>([])
  const [editingLead, setEditingLead] = useState(false)
  const [editingStaffSlot, setEditingStaffSlot] = useState<number | null>(null)

  // Automated task allocation: assign the first available lead + staff on open.
  useEffect(() => {
    if (!isOpen) return
    const availableLeads = LEAD_POOL.filter((c) => c.available)
    const availableStaff = STAFF_POOL.filter((c) => c.available)
    setLeadId(availableLeads[0]?.id ?? '')
    setStaffIds(availableStaff.slice(0, AUTO_STAFF_COUNT).map((c) => c.id))
    setEditingLead(false)
    setEditingStaffSlot(null)
  }, [isOpen])

  const lead = useMemo(() => LEAD_POOL.find((c) => c.id === leadId) ?? null, [leadId])
  const assignedStaff = useMemo(
    () => staffIds.map((id) => STAFF_POOL.find((c) => c.id === id)).filter(Boolean) as CrewCandidate[],
    [staffIds],
  )

  // Suggestions only ever include AVAILABLE crew not already assigned.
  const leadSuggestions = LEAD_POOL.filter((c) => c.available && c.id !== leadId)
  const staffSuggestions = STAFF_POOL.filter((c) => c.available && !staffIds.includes(c.id))

  if (!isOpen) return null

  const activeEvents = events.filter(
    (event) => Boolean(event.title && event.venue && event.targetDate && event.moodPlan),
  )
  const selectedEventDetails = activeEvents.find((event) => event.title === selectedEvent) ?? null

  const eventOptions = [
    { value: '', label: 'Select active event...' },
    ...activeEvents.map((event) => ({ value: event.title, label: event.title })),
  ]

  const vehicles = [
    { name: 'Truck Alpha (6-Ton)', type: 'Heavy Freight' },
    { name: 'Van Beta (Transit)', type: 'Mid Cargo' },
    { name: 'None — External Courier', type: 'Third-party logistics' },
  ]

  const canInitialize =
    selectedEventDetails &&
    selectedEvent &&
    setupStartDate &&
    stylingDeadline &&
    leadId &&
    operationalBrief.trim().length > 0

  const swapLead = (id: string) => {
    setLeadId(id)
    setEditingLead(false)
  }

  const swapStaff = (slot: number, id: string) => {
    setStaffIds((prev) => prev.map((s, i) => (i === slot ? id : s)))
    setEditingStaffSlot(null)
  }

  const removeStaff = (slot: number) => {
    setStaffIds((prev) => prev.filter((_, i) => i !== slot))
    setEditingStaffSlot(null)
  }

  const addStaffSlot = (id: string) => {
    setStaffIds((prev) => [...prev, id])
    setEditingStaffSlot(null)
  }

  const handleInitialize = () => {
    if (!canInitialize) return
    setInitializing(true)
    setTimeout(() => {
      onInitialize({
        event: selectedEventDetails.title,
        venue: selectedEventDetails.venue,
        task: operationalBrief.trim(),
        date: setupStartDate,
        crewLeads: [LEAD_POOL.find((lead) => lead.id === leadId)?.name ?? leadId],
        staffMembers: staffIds.map((id) => STAFF_POOL.find((staff) => staff.id === id)?.name ?? id),
        vehicle: selectedVehicle,
      })
      onClose()
    }, 500)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-3xl overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between bg-primary px-6 py-5 text-primary-foreground">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
              LUMIÈRE · DEPLOYMENTS — CREATE MODE
            </p>
            <h2 className="mt-1 font-serif text-2xl font-medium tracking-tight md:text-3xl">
              Deploy Task Force
            </h2>
            <p className="mt-1 text-xs text-primary-foreground/80">REF: NEW-DEP-PENDING</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-primary-foreground/70 transition hover:text-primary-foreground"
          >
            <X className="size-6" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Select an event with its own destination details */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Target className="size-4 text-primary" />
              <h3 className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                SELECT ACTIVE EVENT
              </h3>
            </div>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            >
              {eventOptions.map((event) => (
                <option key={event.value || 'placeholder'} value={event.value} disabled={!event.value}>
                  {event.label}
                </option>
              ))}
            </select>
            {selectedEventDetails && (
              <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5 text-primary" />{selectedEventDetails.venue}</span>
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5 text-primary" />{selectedEventDetails.targetDate}</span>
                </div>
                <p className="mt-2 text-card-foreground">{selectedEventDetails.moodPlan}</p>
              </div>
            )}

            {/* Calendar date pickers */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                  SETUP START DATE
                </p>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
                  <input
                    type="date"
                    value={setupStartDate}
                    onChange={(e) => setSetupStartDate(e.target.value)}
                    className="w-full rounded-md border border-input bg-card py-2.5 pl-9 pr-3 text-sm text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>
              <div>
                <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                  STYLING DEADLINE
                </p>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
                  <input
                    type="date"
                    value={stylingDeadline}
                    min={setupStartDate || undefined}
                    onChange={(e) => setStylingDeadline(e.target.value)}
                    className="w-full rounded-md border border-input bg-card py-2.5 pl-9 pr-3 text-sm text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Assign Operational Field Crew — Automated Allocation */}
          <div className="border-t border-border pt-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h3 className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  ASSIGN OPERATIONAL FIELD CREW
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-emerald-700">
                <Sparkles className="size-3" />
                Auto-Allocated
              </span>
            </div>

            {/* Crew Lead slot */}
            <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
              DESIGNATED CREW LEAD
            </p>
            {lead ? (
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-[0.65rem] font-bold uppercase text-primary ring-1 ring-border">
                      {initials(lead.name)}
                    </span>
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-card-foreground">
                        <Crown className="size-3.5 text-amber-500" />
                        {lead.name}
                      </p>
                      <p className="text-[0.6rem] text-muted-foreground">
                        {lead.role} · <span className="text-emerald-600 font-semibold">Available</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingLead((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition hover:bg-muted"
                  >
                    <Pencil className="size-3" />
                    Edit
                  </button>
                </div>

                {editingLead && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-2 text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Swap with available senior stylist
                    </p>
                    {leadSuggestions.length === 0 ? (
                      <p className="text-[0.6rem] italic text-muted-foreground">
                        No other available crew leads for this date range.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {leadSuggestions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => swapLead(c.id)}
                            className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-card-foreground transition hover:border-primary hover:bg-muted"
                          >
                            {c.name}
                            <span className="text-[0.55rem] text-muted-foreground">{c.role}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-[0.65rem] italic text-muted-foreground">
                No available crew lead could be auto-assigned.
              </div>
            )}

            {/* Logistics & Tech Staff slots */}
            <div className="mt-4">
              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                LOGISTICS & TECH STAFF
              </p>
              <div className="space-y-2">
                {assignedStaff.map((member, slot) => (
                  <div key={member.id} className="rounded-lg border border-border bg-muted/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-[0.6rem] font-bold uppercase text-primary ring-1 ring-border">
                          {initials(member.name)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-card-foreground">{member.name}</p>
                          <p className="text-[0.6rem] text-muted-foreground">
                            {member.role} · <span className="text-emerald-600 font-semibold">Available</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingStaffSlot((v) => (v === slot ? null : slot))
                          }
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition hover:bg-muted"
                        >
                          <Pencil className="size-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStaff(slot)}
                          aria-label={`Remove ${member.name}`}
                          className="text-muted-foreground transition hover:text-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>

                    {editingStaffSlot === slot && (
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="mb-2 text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Swap with available staff
                        </p>
                        {staffSuggestions.length === 0 ? (
                          <p className="text-[0.6rem] italic text-muted-foreground">
                            No other available staff for this date range.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {staffSuggestions.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => swapStaff(slot, c.id)}
                                className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-card-foreground transition hover:border-primary hover:bg-muted"
                              >
                                {c.name}
                                <span className="text-[0.55rem] text-muted-foreground">{c.role}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add another available staff member */}
              {staffSuggestions.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    + Add available staff member
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {staffSuggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => addStaffSlot(c.id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-card-foreground transition hover:border-primary hover:bg-muted"
                      >
                        <Check className="size-3 text-emerald-600" />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <p className="text-[0.6rem] text-amber-700">
                  Crew is auto-allocated by the scheduler. Only crew members available for the
                  selected date range are suggested when editing an assignment.
                </p>
              </div>
            </div>
          </div>

          {/* Fleet Transit Allocation */}
          <div className="border-t border-border pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="size-4 text-primary" />
              <h3 className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                FLEET TRANSIT ALLOCATION
              </h3>
            </div>
            <div>
              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
                ASSIGN LOGISTICS VEHICLE
              </p>
              <div className="space-y-2">
                {vehicles.map((v) => (
                  <label
                    key={v.name}
                    className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border bg-muted/40 transition hover:bg-muted"
                  >
                    <input
                      type="radio"
                      name="vehicle"
                      value={v.name}
                      checked={selectedVehicle === v.name}
                      onChange={(e) => setSelectedVehicle(e.target.value)}
                      className="size-4 accent-primary cursor-pointer"
                    />
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{v.name}</p>
                      <p className="text-[0.6rem] text-muted-foreground">{v.type} · Available</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Initial Operational Brief */}
          <div className="border-t border-border pt-6">
            <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
              INITIAL OPERATIONAL BRIEF / INSTRUCTIONS
            </p>
            <textarea
              value={operationalBrief}
              onChange={(e) => setOperationalBrief(e.target.value)}
              placeholder="Enter high-level styling and delivery directives for the crew lead..."
              rows={4}
              className="w-full resize-none rounded-lg border border-input bg-muted/40 px-3 py-2.5 text-sm text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-border bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md border border-border bg-card px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-card-foreground transition hover:bg-muted order-2 sm:order-1"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleInitialize}
            disabled={!canInitialize || initializing}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] transition order-1 sm:order-2',
              canInitialize && !initializing
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'cursor-not-allowed bg-muted text-muted-foreground',
            )}
          >
            <Target className="size-4" />
            INITIALIZE DISPATCH
          </button>
        </div>
      </div>
    </div>
  )
}
