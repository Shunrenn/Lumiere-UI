import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PwaCardProps {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  headerClassName?: string
}

export function PwaCard({
  title,
  subtitle,
  action,
  children,
  className,
  headerClassName,
}: PwaCardProps) {
  return (
    <div
      className={cn(
        'min-w-0 max-w-full rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      {(title || subtitle || action) && (
        <div className={cn('mb-3 flex items-start justify-between gap-3 border-b border-border/60 pb-3', headerClassName)}>
          <div className="min-w-0">
            {title && <h3 className="font-serif text-base font-semibold tracking-tight text-foreground">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
