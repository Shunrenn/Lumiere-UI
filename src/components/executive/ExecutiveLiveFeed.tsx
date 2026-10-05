import { useState } from 'react'
import { ChevronDown, ScrollText, X } from 'lucide-react'
import { cn } from '@/shared/utils'
import { usePortal } from '@/lib/store'
import { useClickFlash } from '@/lib/use-click-flash'
import type { EventUpdateStatus } from '@/shared/types'

const statusDot: Record<EventUpdateStatus, string> = {
  Scheduled: 'bg-sky-500',
  'Action Required': 'bg-amber-500',
  Completed: 'bg-emerald-500',
}

const feedTimes = ['09:12 UTC', '08:47 UTC', '07:58 UTC', '07:20 UTC', '06:41 UTC', '05:15 UTC']

const feedDetails: Record<string, string> = {
  'eu-1': 'Grand Ballroom Gala setup completed ahead of schedule. All lighting rigs and staging passed safety validation.',
  'eu-2': 'Loading dock inspection flagged 2 damaged glassware crates from transit. Routing to Damage Validation queue.',
  'eu-3': 'Aurelio Wedding ingress logistics dispatched from main warehouse depot with 4-ton transit transport.',
  'eu-4': 'Executive sign-off confirmed for chandelier replacement units. Inventory status restored to Available.',
}

interface ExecutiveLiveFeedProps {
  onViewLogs?: () => void
}

export function ExecutiveLiveFeed({ onViewLogs }: ExecutiveLiveFeedProps) {
  const { eventUpdates } = usePortal()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedUpdate, setSelectedUpdate] = useState<{ id: string; title: string; status: EventUpdateStatus; time: string; detail: string } | null>(null)
  const noop = () => {}
  const { flashing, trigger } = useClickFlash(onViewLogs || noop)

  return (
    <section className={cn('flex h-full min-h-0 min-w-0 flex-col rounded-xl border border-border bg-card p-4 text-card-foreground transition', flashing && 'ring-2 ring-primary/60 border-primary/60')}>

      <h2 className="shrink-0 text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
        Live Operations Feed
      </h2>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {eventUpdates.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">No recent operational events.</p>
        ) : (
          <ul className="space-y-4">
            {eventUpdates.map((update, i) => {
              const open = expanded === update.id
              const detail = feedDetails[update.id] || `Operational update status marked as ${update.status}. Logged to central event registry.`
              return (
                <li key={update.id} className="flex items-start gap-3">
                  <div role="button" tabIndex={0} onClick={() => setSelectedUpdate({ id: update.id, title: update.title, status: update.status, time: feedTimes[i % feedTimes.length], detail })} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedUpdate({ id: update.id, title: update.title, status: update.status, time: feedTimes[i % feedTimes.length], detail }) } }} className="group flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

                  <span
                    className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', statusDot[update.status] ?? 'bg-sky-500')}
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpanded(open ? null : update.id)
                      }}
                      aria-expanded={open}
                      className="mt-1.5 inline-flex items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary"
                    >
                      Details
                      <ChevronDown
                        className={cn('size-3 transition-transform', open && 'rotate-180')}
                        aria-hidden="true"
                      />
                    </button>
                    {open && (
                      <p className="admin-fade mt-2 rounded-md bg-muted/60 px-3 py-2 text-[0.7rem] leading-relaxed text-muted-foreground">
                        {detail}
                      </p>
                    )}
                  </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 shrink-0 border-t border-border pt-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            trigger()
          }}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-card-foreground transition-colors hover:bg-muted"
        >
          <ScrollText className="size-3.5" aria-hidden="true" />
          Operational Logs
        </button>
      </div>
      {selectedUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="executive-feed-detail-title" onClick={() => setSelectedUpdate(null)}>
          <section className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Live Operations Feed</p><h3 id="executive-feed-detail-title" className="mt-1 font-serif text-xl font-medium text-foreground">{selectedUpdate.title}</h3></div>
              <button type="button" onClick={() => setSelectedUpdate(null)} aria-label="Close feed details" className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" aria-hidden="true" /></button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.65rem] text-muted-foreground"><span>{selectedUpdate.time}</span><span className="rounded-full border border-border px-2 py-0.5 font-semibold uppercase tracking-wider">{selectedUpdate.status}</span></div>
            <p className="mt-4 rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-card-foreground">{selectedUpdate.detail}</p>
            <div className="mt-5 flex justify-end"><button type="button" onClick={() => setSelectedUpdate(null)} className="rounded-md border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-muted">Close</button></div>
          </section>
        </div>
      )}
    </section>
  )
}
