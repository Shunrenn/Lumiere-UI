import { ScrollText } from 'lucide-react'
import { usePortal } from '@/lib/store'
import type { EventUpdateStatus } from '@/lib/types'

// Colored status dot per operations feed entry.
const statusDot: Record<EventUpdateStatus, string> = {
  Scheduled: 'bg-sky-500',
  'Action Required': 'bg-amber-500',
  Completed: 'bg-emerald-500',
}

// Deterministic mock timestamps so the feed reads like a live log.
const feedTimes = ['09:12 UTC', '08:47 UTC', '07:58 UTC', '07:20 UTC', '06:41 UTC']

interface Props {
  onViewLogs?: () => void
}

export function EventUpdates({ onViewLogs }: Props = {}) {
  const { eventUpdates } = usePortal()

  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-6 sm:p-7">
      <h2 className="font-serif text-2xl font-medium leading-tight text-card-foreground text-balance sm:text-3xl">
        Live Operations Feed
      </h2>

      <ul className="mt-6 space-y-4">
        {eventUpdates.map((update, i) => (
          <li key={update.id} className="flex items-start gap-3">
            <span
              className={`mt-1.5 size-2.5 shrink-0 rounded-full ${statusDot[update.status]}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {feedTimes[i % feedTimes.length]}
              </span>
              <p className="mt-1 text-xs leading-relaxed text-card-foreground">
                <span className="font-medium">{update.title}</span>
                <span className="text-muted-foreground"> — {update.status}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>

      {onViewLogs && (
        <div className="mt-6 border-t border-border pt-5">
          <button
            type="button"
            onClick={onViewLogs}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-card-foreground transition-colors hover:bg-muted"
          >
            <ScrollText className="size-3.5" aria-hidden="true" />
            System Logs
          </button>
        </div>
      )}
    </section>
  )
}
