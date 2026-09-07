import { useState, useMemo } from 'react'
import { ChevronDown, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortal } from '@/lib/store'
import { useClickFlash } from '@/lib/use-click-flash'
import { getOperationalEvents, type OperationalEventStatus } from '@/lib/operational-events'

const statusDot: Record<OperationalEventStatus, string> = {
  Success: 'bg-emerald-500',
  Flagged: 'bg-rose-500',
  Approved: 'bg-sky-500',
  Pending: 'bg-amber-500',
}

interface ExecutiveLiveFeedProps {
  onViewLogs: () => void
}

export function ExecutiveLiveFeed({ onViewLogs }: ExecutiveLiveFeedProps) {
  const { events, damageExceptions, procurement } = usePortal()
  const [expanded, setExpanded] = useState<string | null>(null)
  const { flashing, trigger } = useClickFlash(onViewLogs)

  const feedEvents = useMemo(
    () => getOperationalEvents(events, damageExceptions, procurement),
    [events, damageExceptions, procurement],
  )

  return (
    <section
      role="button"
      tabIndex={0}
      onClick={trigger}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          trigger()
        }
      }}
      className={cn(
        'flex h-full min-h-0 min-w-0 cursor-pointer flex-col rounded-xl border border-border bg-card p-4 text-card-foreground transition hover:border-primary/40 hover:bg-muted/40',
        flashing && 'ring-2 ring-primary/60 border-primary/60',
      )}
    >
      <h2 className="shrink-0 text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
        Live Operations Feed
      </h2>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {feedEvents.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">No recent operational events.</p>
        ) : (
          <ul className="space-y-4">
            {feedEvents.map((op) => {
              const open = expanded === op.id
              const dotColor = statusDot[op.status]

              return (
                <li key={op.id} className="flex items-start gap-3">
                  <span
                    className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', dotColor)}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      {op.timestamp}
                    </span>
                    <p className="mt-1 text-xs leading-relaxed text-card-foreground">
                      <span className="font-medium">{op.eventType}</span>
                      <span className="text-muted-foreground"> — {op.title}</span>
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpanded(open ? null : op.id)
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
                        {op.detail}
                      </p>
                    )}
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
    </section>
  )
}