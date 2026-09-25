import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PwaBadge } from './PwaBadge'
import type { GroundCrewSubRole } from '@/lib/types'

interface PwaHeaderProps {
  title: string
  subtitle?: string
  roleName?: string
  subRole?: GroundCrewSubRole | string
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PwaHeader({
  title,
  subtitle,
  roleName = 'Ground Crew',
  subRole,
  icon,
  actions,
  className,
}: PwaHeaderProps) {
  return (
    <header
      className={cn(
        'relative overflow-hidden bg-sidebar px-5 pb-5 pt-4 text-sidebar-foreground shadow-sm',
        className
      )}
      style={{ paddingTop: 'calc(0.875rem + env(safe-area-inset-top))' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground shadow-inner">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-serif text-lg font-bold tracking-[0.2em] text-sidebar-foreground">LUMIÈRE</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/75">
                {roleName}
              </span>
              {subRole && <PwaBadge subRole={subRole} />}
            </div>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      <div className="mt-4 min-w-0">
        <h1 className="text-balance font-serif text-2xl font-semibold leading-tight text-sidebar-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-pretty text-xs leading-relaxed text-sidebar-foreground/75">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  )
}
