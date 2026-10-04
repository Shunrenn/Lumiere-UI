import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface UpcomingEventsPanelProps {
  title: string
  count: number
  subtitle: string
  headerAction?: ReactNode
  children: ReactNode
  className?: string
}

/** Shared dashboard roster card frame with a fixed header and independently scrolling list. */
export function UpcomingEventsPanel({ title, count, subtitle, headerAction, children, className }: UpcomingEventsPanelProps) {
  return (
    <aside className={cn('flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/90 bg-card/95 p-5 shadow-sm backdrop-blur-xs sm:p-6', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4 shrink-0">
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-medium text-card-foreground truncate">{title} ({count})</h2>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">{subtitle}</p>
        </div>
        {headerAction}
      </header>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1.5 scrollbar-thin">{children}</div>
    </aside>
  )
}
