import { CalendarClock, ShieldAlert, PackageSearch, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ExecutivePendingItem {
  id: string
  title: string
  subtitle: string
  tone: 'sky' | 'rose' | 'amber'
  icon: LucideIcon
  actionLabel?: string
  onAction: () => void
}

interface ExecutivePendingActionsProps {
  items: ExecutivePendingItem[]
}

const toneStyles = {
  sky: 'text-sky-400',
  rose: 'text-rose-400',
  amber: 'text-amber-400',
}

export function ExecutivePendingActions({ items }: ExecutivePendingActionsProps) {
  const isEmpty = items.length === 0

  return (
    <section className="flex h-[24rem] flex-col rounded-xl border border-border bg-card p-5 text-card-foreground">
      <h2 className="shrink-0 font-serif text-2xl font-medium leading-tight text-foreground text-balance sm:text-3xl">
        Pending Actions
      </h2>

      {isEmpty ? (
        <p className="mt-4 text-xs italic text-muted-foreground">
          No pending operational actions — all portfolios and reports clear.
        </p>
      ) : (
        <ul className="mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 border-t border-border/60 py-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <Icon
                    className={cn('mt-0.5 size-4 shrink-0', toneStyles[item.tone] || 'text-primary')}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                    <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={item.onAction}
                  className="inline-flex w-full shrink-0 items-center justify-center rounded-md border border-border px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:bg-muted sm:w-auto"
                >
                  {item.actionLabel || 'Open'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
