import type { ElementType } from 'react'
import { cn } from '@/shared/utils'

export interface PwaNavItem {
  id: string
  label: string
  icon: ElementType
  badgeCount?: number
  isCenter?: boolean
}

interface PwaBottomNavProps {
  items: readonly PwaNavItem[]
  activeId: string
  onSelect: (id: string) => void
  ariaLabel?: string
  className?: string
}

export function PwaBottomNav({
  items,
  activeId,
  onSelect,
  ariaLabel = 'Mobile navigation',
  className,
}: PwaBottomNavProps) {
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-1/2 z-30 flex w-full max-w-[430px] -translate-x-1/2 items-end justify-around border-t border-border bg-card/95 px-2 py-2 backdrop-blur-md transition-all',
        className
      )}
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const Icon = item.icon
        const isActive = activeId === item.id
        const isCenter = Boolean(item.isCenter)

        if (isCenter) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className="group relative -top-3.5 flex min-h-[44px] flex-1 flex-col items-center justify-center focus:outline-none"
            >
              <div
                className={cn(
                  'relative flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 active:scale-95 group-hover:scale-105',
                  isActive ? 'ring-4 ring-primary/40 bg-primary font-bold scale-105' : 'hover:bg-primary/90'
                )}
              >
                <Icon className="size-6 transition-transform group-hover:scale-110" aria-hidden="true" />
                {Boolean(item.badgeCount && item.badgeCount > 0) && (
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[0.6rem] font-bold text-destructive-foreground ring-2 ring-background">
                    {item.badgeCount! > 9 ? '9+' : item.badgeCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'mt-1 text-[0.6rem] font-bold tracking-wider uppercase',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </span>
            </button>
          )
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs transition-all active:scale-95',
              isActive
                ? 'bg-primary/10 font-bold text-primary'
                : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
            )}
          >
            <div className="relative">
              <Icon className={cn('size-5 transition-transform', isActive && 'scale-110')} aria-hidden="true" />
              {Boolean(item.badgeCount && item.badgeCount > 0) && (
                <span className="absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[0.55rem] font-bold text-destructive-foreground">
                  {item.badgeCount! > 9 ? '9+' : item.badgeCount}
                </span>
              )}
            </div>
            <span className="text-[0.625rem] tracking-tight">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
