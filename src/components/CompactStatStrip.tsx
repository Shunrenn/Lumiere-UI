import { cn } from '@/lib/utils'

export interface StatItem {
  label: string
  value: string | number
}

interface CompactStatStripProps {
  stats: StatItem[]
  className?: string
}

export function CompactStatStrip({ stats, className }: CompactStatStripProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-border bg-muted/50 px-4 py-2 text-xs',
        className,
      )}
    >
      {stats.map((stat, i) => (
        <div key={stat.label} className="flex items-center gap-1.5">
          {i > 0 && <span className="h-3 w-px bg-border" aria-hidden="true" />}
          <span className="text-sm font-bold text-card-foreground">{stat.value}</span>
          <span className="text-[0.62rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  )
}
