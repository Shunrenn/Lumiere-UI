import { X, Mail, Phone, IdCard, Clock, Lock, ShieldAlert } from 'lucide-react'
import type { CrewAssignmentStatus, EventCrewAssignment } from '@/lib/event-detail'
import type { Staff } from '@/lib/types'
import { toneClasses, toneDot, type Tone } from '@/components/warehouse/event-detail/status-tone'

const STATUS_TONE: Record<CrewAssignmentStatus, Tone> = {
  Confirmed: 'positive',
  Pending: 'progress',
  Unavailable: 'critical',
}

interface CrewInfoModalProps {
  member: EventCrewAssignment
  // Full staff record resolved from the roster (crew row id === Staff.id).
  // Null when no matching record exists in the store.
  staff: Staff | null
  // Permission gate: does the viewing user's sub-role have visibility rights
  // to full crew detail? Derived in the page from useAuth() role flags,
  // mirroring how isProductionManager gates the Production detail modal.
  canViewFullDetail: boolean
  onClose: () => void
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm text-card-foreground">{value}</p>
      </div>
    </div>
  )
}

export function CrewInfoModal({ member, staff, canViewFullDetail, onClose }: CrewInfoModalProps) {
  const tone = STATUS_TONE[member.status]
  const initials = member.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Crew details for ${member.name}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold uppercase tracking-wide text-muted-foreground ring-1 ring-border">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Manning / Crew
              </p>
              <h2 className="mt-0.5 font-serif text-2xl font-medium leading-tight text-card-foreground text-balance">
                {member.name}
              </h2>
            </div>
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

        {/* Body */}
        <div className="space-y-6 px-6 py-6">
          {/* Role + status chips — always visible regardless of permission */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-accent px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-accent-foreground">
              {member.role}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.06em] ${toneClasses[tone]}`}
            >
              <span className={`size-1.5 rounded-full ${toneDot[tone]}`} aria-hidden="true" />
              {member.status}
            </span>
          </div>

          {canViewFullDetail ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow icon={IdCard} label="Employee ID" value={staff?.employeeId ?? '—'} />
              <InfoRow icon={ShieldAlert} label="Session" value={staff?.sessionStatus ?? '—'} />
              <InfoRow icon={Mail} label="Email" value={staff?.email ?? '—'} />
              <InfoRow icon={Phone} label="Contact" value={staff?.contact ?? '—'} />
              <div className="sm:col-span-2">
                <InfoRow icon={Clock} label="Last Access" value={staff?.lastAccess ?? '—'} />
              </div>
            </div>
          ) : (
            // Restricted state — reuses the muted / no-access visual language
            // from the grayed-out edit affordances (Lock icon, muted-foreground,
            // reduced opacity) rather than inventing new styling.
            <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-5 opacity-80">
              <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Limited info</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  You don&apos;t have visibility rights to full crew detail. Contact the Manning Officer for
                  contact and assignment records.
                </p>
              </div>
            </div>
          )}
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
