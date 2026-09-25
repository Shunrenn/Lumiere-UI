import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { GroundCrewSubRole } from '@/lib/types'

interface PwaBadgeProps {
  subRole?: GroundCrewSubRole | string
  label?: string
  variant?: 'subrole' | 'status' | 'neutral' | 'accent' | 'destructive'
  children?: ReactNode
  className?: string
}

const SUBROLE_STYLES: Record<string, string> = {
  Field: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  Warehouse: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  Inventory: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  Production: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  EventAdmin: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
}

export function PwaBadge({ subRole, label, variant = 'subrole', children, className }: PwaBadgeProps) {
  const displayLabel = label || children || subRole || 'General'
  const key = subRole ? String(subRole) : String(displayLabel)
  const style = SUBROLE_STYLES[key] || 'bg-sidebar-accent/40 text-sidebar-foreground border-sidebar-border'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.14em] transition-colors',
        variant === 'subrole' && style,
        variant === 'neutral' && 'bg-muted/60 text-muted-foreground border-border',
        variant === 'accent' && 'bg-primary/10 text-primary border-primary/20',
        variant === 'destructive' && 'bg-destructive/15 text-destructive border-destructive/30',
        className
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-80" aria-hidden="true" />
      {displayLabel}
    </span>
  )
}
