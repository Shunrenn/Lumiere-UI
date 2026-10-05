import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils'

interface DashboardCalendarCardProps {
  icon: LucideIcon
  title: string
  subtitle: string
  controls: ReactNode
  legend?: ReactNode
  children: ReactNode
  className?: string
}

/** Shared dashboard calendar card frame; each role supplies its own calendar data and cells. */
export function DashboardCalendarCard({ icon: Icon, title, subtitle, controls, legend, children, className }: DashboardCalendarCardProps) {
  return (
    <section className={cn('flex min-h-0 flex-col rounded-2xl border border-border/90 bg-card/95 p-5 shadow-sm backdrop-blur-xs sm:p-6', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-serif text-xl font-medium text-card-foreground">{title}</h2>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">{controls}</div>
      </header>
      {legend && <div className="my-3.5 shrink-0">{legend}</div>}
      {children}
    </section>
  )
}
