import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PendingActionTone = 'rose' | 'amber' | 'emerald' | 'sky'

export interface PendingActionItem {
  id: string
  title: string
  subtitle: string
  tone?: PendingActionTone
  icon: LucideIcon
}

const toneColor: Record<PendingActionTone, string> = {
  rose: 'text-rose-400',
  amber: 'text-amber-400',
  emerald: 'text-emerald-400',
  sky: 'text-sky-400',
}

interface Props {
  /* "dark" => deep mauve overview panel, "light" => card */
  variant?: 'dark' | 'light'
  items: PendingActionItem[]
  /* Invoked when the "Open" button for an item is clicked */
  onOpen: (item: PendingActionItem) => void
}

export function PendingUserActions({ variant = 'dark', items, onOpen }: Props) {
  const dark = variant === 'dark'

  return (
    <section
      className={cn(
        'flex flex-col rounded-xl p-6 sm:p-7',
        dark
          ? 'bg-sidebar text-sidebar-foreground'
          : 'border border-border bg-card text-card-foreground',
      )}
    >
      <h2
        className={cn(
          'font-serif text-2xl font-medium leading-tight text-balance sm:text-3xl',
          dark ? 'text-sidebar-primary' : 'text-card-foreground',
        )}
      >
        Pending Actions
      </h2>

      {items.length === 0 ? (
        <p
          className={cn(
            'mt-5 text-sm italic',
            dark ? 'text-sidebar-foreground/50' : 'text-muted-foreground',
          )}
        >
          All actions completed — no pending requests.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <li
                key={item.id}
                className={cn(
                  'flex flex-col gap-3 border-t py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between',
                  dark ? 'border-sidebar-border/50' : 'border-border',
                )}
              >
                {/* Left: icon + label */}
                <div className="flex min-w-0 items-start gap-3">
                  <Icon
                    className={cn('mt-0.5 size-4 shrink-0', toneColor[item.tone ?? 'amber'])}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        dark ? 'text-sidebar-primary' : 'text-card-foreground',
                      )}
                    >
                      {item.title}
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 truncate text-xs',
                        dark ? 'text-sidebar-foreground/65' : 'text-muted-foreground',
                      )}
                    >
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                {/* Right: Open button */}
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className={cn(
                    'inline-flex w-full items-center justify-center rounded-md px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.1em] transition-colors sm:w-auto',
                    dark
                      ? 'border border-sidebar-border text-sidebar-primary hover:bg-sidebar-accent'
                      : 'border border-border text-primary hover:bg-muted',
                  )}
                >
                  Open
                </button>
              </li>
            )
          })}
        </ul>
      )}


    </section>
  )
}
