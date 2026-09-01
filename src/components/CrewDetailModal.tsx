import { X, Mail, Phone, CalendarDays, MapPin, Briefcase, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CrewStatus = 'Available' | 'Assigned' | 'On Leave'

export interface CrewAllocation {
  event: string
  venue: string
  date: string
  task: string
}

export interface CrewDetail {
  name: string
  employeeId: string
  role: string
  status: CrewStatus
  week: ('on' | 'off' | 'leave')[]
  allocation: CrewAllocation | null
}

interface Props {
  member: CrewDetail | null
  onClose: () => void
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const statusBadge: Record<CrewStatus, string> = {
  Available: 'bg-emerald-100 text-emerald-700',
  Assigned: 'bg-amber-100 text-amber-800',
  'On Leave': 'bg-rose-100 text-rose-700',
}

const dayMeta: Record<'on' | 'off' | 'leave', { dot: string; label: string }> = {
  on: { dot: 'bg-emerald-400', label: 'Working' },
  off: { dot: 'bg-muted-foreground/30', label: 'Rest' },
  leave: { dot: 'bg-rose-300', label: 'Leave' },
}

export function CrewDetailModal({ member, onClose }: Props) {
  if (!member) return null

  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')

  const slug = member.name.toLowerCase().replace(/[^a-z]+/g, '.')
  const onCount = member.week.filter((d) => d === 'on').length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-700/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Crew details for ${member.name}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between bg-sidebar px-6 py-5 text-sidebar-foreground">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-bold uppercase tracking-wide text-sidebar-accent-foreground ring-1 ring-sidebar-border">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/60">
                {member.employeeId}
              </p>
              <h2 className="mt-0.5 font-serif text-2xl font-medium leading-tight text-sidebar-primary text-balance">
                {member.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sidebar-foreground/70 transition hover:text-sidebar-primary"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 px-6 py-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-accent px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-accent-foreground">
              {member.role}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                statusBadge[member.status],
              )}
            >
              {member.status}
            </span>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Email
                </p>
                <p className="mt-0.5 truncate text-sm text-card-foreground">{slug}@lumiere.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Contact
                </p>
                <p className="mt-0.5 text-sm text-card-foreground">+63 917 000 0000</p>
              </div>
            </div>
          </div>

          {/* Live event allocation (auto-deployed) */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-primary">
                Auto-Allocated Deployment
              </p>
            </div>
            {member.allocation ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Allocated Event
                  </p>
                  <p className="mt-0.5 font-serif text-lg font-medium leading-tight text-card-foreground">
                    {member.allocation.event}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                        Venue
                      </p>
                      <p className="mt-0.5 text-sm text-card-foreground">{member.allocation.venue}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                        Schedule Date
                      </p>
                      <p className="mt-0.5 text-sm text-card-foreground">{member.allocation.date}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 sm:col-span-2">
                    <Briefcase className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                        Field Task
                      </p>
                      <p className="mt-0.5 text-sm text-card-foreground">{member.allocation.task}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No active allocation. This member is currently unassigned and will be auto-deployed on
                their next availability window.
              </p>
            )}
          </div>

          {/* Weekly manning */}
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Weekly Manning · {onCount} days on
              </p>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {DAYS.map((d, idx) => {
                const meta = dayMeta[member.week[idx]]
                return (
                  <div key={d} className="flex flex-col items-center gap-2">
                    <span className="text-[0.55rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      {d}
                    </span>
                    <span className={cn('size-3 rounded-full', meta.dot)} title={meta.label} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-6 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
