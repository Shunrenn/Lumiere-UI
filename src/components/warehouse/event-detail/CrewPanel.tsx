import type { CrewAssignmentStatus, EventCrewAssignment } from '@/lib/event-detail'
import { EventDetailSection, SectionButton } from '@/components/warehouse/event-detail/EventDetailSection'
import { toneClasses, toneDot, type Tone } from '@/components/warehouse/event-detail/status-tone'

const STATUS_TONE: Record<CrewAssignmentStatus, Tone> = {
  Confirmed: 'positive',
  Pending: 'progress',
  Unavailable: 'critical',
}

interface CrewPanelProps {
  crew: EventCrewAssignment[]
  onManage: () => void
  onSelect: (member: EventCrewAssignment) => void
}

export function CrewPanel({ crew, onManage, onSelect }: CrewPanelProps) {
  return (
    <EventDetailSection
      title="Manning / Crew"
      action={<SectionButton onClick={onManage}>+ Add / Reassign Crew</SectionButton>}
    >
      {crew.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-background px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">No crew assigned yet.</p>
          <button
            type="button"
            onClick={onManage}
            className="rounded-md bg-primary px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            Assign Crew
          </button>
        </div>
      ) : (
        <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {crew.map((member) => {
            const tone = STATUS_TONE[member.status]
            return (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => onSelect(member)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-card-foreground">{member.name}</p>
                    <p className="truncate text-[0.62rem] uppercase tracking-[0.06em] text-muted-foreground">
                      {member.role}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.06em] ${toneClasses[tone]}`}
                  >
                    <span className={`size-1.5 rounded-full ${toneDot[tone]}`} aria-hidden="true" />
                    {member.status}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </EventDetailSection>
  )
}
