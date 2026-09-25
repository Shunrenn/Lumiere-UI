import type { ElementType } from 'react'
import { cn } from '@/lib/utils'

export interface PwaNavItem {
  id: string
  label: string
  icon: ElementType
  badgeCount?: number
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
        'fixed bottom-0 left-1/2 z-30 flex w-full max-w-[430px] -translate-x-1/2 items-center justify-around border-t border-border bg-card/95 px-2 py-2.5 backdrop-blur-md transition-all',
        className
      )}
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const Icon = item.icon
        const isActive = activeId === item.id

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
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
