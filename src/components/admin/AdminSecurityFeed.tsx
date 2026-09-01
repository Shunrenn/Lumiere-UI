import { useState } from 'react'
import { ChevronDown, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SECURITY_EVENTS } from '@/lib/security-events'
import { useClickFlash } from '@/lib/use-click-flash'

const feedEvents = SECURITY_EVENTS.map((event) => ({
  ...event,
  time: `${event.timestamp.slice(0, 5)} UTC`,
  headline: event.action,
  details: event.note,
}))

interface AdminSecurityFeedProps {
  onSystemLogs: () => void
}

// Read-only Live Security Feed. Headlines stay plain-language; IPs/terminal IDs
// and other technical specifics are tucked into a per-entry Details expander.
export function AdminSecurityFeed({ onSystemLogs }: AdminSecurityFeedProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const { flashing, trigger } = useClickFlash(onSystemLogs)

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
        Live Security Feed
      </h2>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {feedEvents.length === 0 ? (
          <p className="text-sm italic text-sidebar-foreground/50">No recent security events.</p>
        ) : (
          <ul className="space-y-4">
            {feedEvents.map((event) => {
              const open = expanded === event.id
              return (
                <li key={event.id} className="flex items-start gap-3">
                  <span
                    className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', event.dotColor)}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/45">
                      {event.time}
                    </span>
                    <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/75">
                      {event.headline}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpanded(open ? null : event.id)
                      }}
                      aria-expanded={open}
                      className="mt-1.5 inline-flex items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50 transition-colors hover:text-sidebar-primary"
                    >
                      Details
                      <ChevronDown
                        className={cn('size-3 transition-transform', open && 'rotate-180')}
                        aria-hidden="true"
                      />
                    </button>
                    {open && (
                      <p className="admin-fade mt-2 rounded-md bg-sidebar-accent/60 px-3 py-2 text-[0.7rem] leading-relaxed text-sidebar-foreground/70">
                        {event.details}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 shrink-0 border-t border-sidebar-border/50 pt-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            trigger()
          }}
          className="inline-flex items-center gap-2 rounded-md border border-sidebar-border px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-sidebar-primary transition-colors hover:bg-sidebar-accent"
        >
          <ScrollText className="size-3.5" aria-hidden="true" />
          View Full Security Log
        </button>
      </div>
    </section>
  )
}
