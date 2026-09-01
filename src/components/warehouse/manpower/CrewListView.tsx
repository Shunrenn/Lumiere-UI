import { CalendarDays } from 'lucide-react'
import type { CrewRow } from '@/lib/warehouse-crew'
import { clearCrewAssignment } from '@/lib/warehouse-crew'
import { Pill } from '@/components/warehouse/shared/Pill'
import { KebabMenu } from '@/components/warehouse/shared/KebabMenu'
import type { Tone } from '@/components/warehouse/event-detail/status-tone'

const STATUS_TONE: Record<CrewRow['status'], Tone> = {
  Available: 'positive',
  Assigned: 'progress',
  'On Leave': 'caution',
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.65rem] font-bold uppercase tracking-wide text-primary ring-1 ring-border">
      {initials}
    </span>
  )
}

interface CrewListViewProps {
  rows: CrewRow[]
  onSelect: (row: CrewRow) => void
}

export function CrewListView({ rows, onSelect }: CrewListViewProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[940px] text-left">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-5 py-4 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Staff Member
            </th>
            <th className="px-5 py-4 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Role
            </th>
            <th className="px-5 py-4 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Allocated Event
            </th>
            <th className="px-5 py-4 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Date
            </th>
            <th className="px-5 py-4 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Field Task
            </th>
            <th className="px-5 py-4 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Status
            </th>
            <th className="px-5 py-4 text-right text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-16 text-center text-xs text-muted-foreground">
                No crew members match your search.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onSelect(row)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(row)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${row.name}`}
                className="cursor-pointer border-t border-border/60 align-middle transition hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={row.name} />
                    <p className="text-sm font-semibold text-card-foreground">{row.name}</p>
                  </div>
                </td>
                <td className="px-5 py-4 text-xs text-card-foreground">{row.role}</td>
                <td className="px-5 py-4">
                  {row.allocation ? (
                    <div>
                      <p className="text-xs font-semibold text-card-foreground">{row.allocation.event}</p>
                      <p className="text-[0.65rem] text-muted-foreground">{row.allocation.venue}</p>
                    </div>
                  ) : (
                    <span className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">
                      Unassigned
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {row.allocation ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-card-foreground">
                      <CalendarDays className="size-3.5 text-muted-foreground" />
                      {row.allocation.date}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-5 py-4 text-xs text-card-foreground">
                  {row.allocation ? row.allocation.task : <span className="text-muted-foreground/50">—</span>}
                </td>
                <td className="px-5 py-4">
                  <Pill tone={STATUS_TONE[row.status]}>{row.status}</Pill>
                </td>
                <td className="px-5 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                  <KebabMenu
                    label={`Actions for ${row.name}`}
                    actions={
                      row.allocation
                        ? [{ label: 'Unassign from event', onSelect: () => clearCrewAssignment(row.staffId), destructive: true }]
                        : [{ label: 'No actions available', onSelect: () => undefined }]
                    }
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
