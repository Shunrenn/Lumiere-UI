import { ScrollText } from 'lucide-react'

interface Incident {
  dotColor: string
  time: string
  description: string
}

const incidents: Incident[] = [
  {
    dotColor: 'bg-amber-400',
    time: '08:41 UTC',
    description:
      'Repeated login failure — Terminal T-04 recorded 9 consecutive failed authentication attempts from IP 192.168.4.88. Auto-lockout engaged.',
  },
  {
    dotColor: 'bg-rose-400',
    time: '07:55 UTC',
    description:
      'Elevated permission request — User token UID-5592 requested root-level database export privileges outside approved scope. Auto-denied and flagged.',
  },
  {
    dotColor: 'bg-emerald-400',
    time: '06:14 UTC',
    description:
      'Routine audit log integrity check passed — 06:00 UTC checksum verification completed across 14 audit nodes. Zero tamper indicators.',
  },
  {
    dotColor: 'bg-sky-400',
    time: '05:32 UTC',
    description:
      'Perimeter firewall heartbeat nominal — all ingress rules synchronized across edge nodes.',
  },
]

interface Props {
  onViewLogs?: () => void
}

export function SecurityIncidents({ onViewLogs }: Props = {}) {
  return (
    <section className="flex flex-col rounded-xl bg-sidebar p-7 text-sidebar-foreground">
      <h2 className="font-serif text-3xl font-medium leading-tight text-sidebar-primary text-balance">
        Live Security Feed
      </h2>

      <ul className="mt-6 space-y-4">
        {incidents.map((incident) => (
          <li key={incident.description} className="flex items-start gap-3">
            <span
              className={`mt-1.5 size-2.5 shrink-0 rounded-full ${incident.dotColor}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/45">
                {incident.time}
              </span>
              <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/75">
                {incident.description}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {onViewLogs && (
        <div className="mt-6 border-t border-sidebar-border/50 pt-5">
          <button
            type="button"
            onClick={onViewLogs}
            className="inline-flex items-center gap-2 rounded-md border border-sidebar-border px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-sidebar-primary transition-colors hover:bg-sidebar-accent"
          >
            <ScrollText className="size-3.5" aria-hidden="true" />
            System Logs
          </button>
        </div>
      )}
    </section>
  )
}
