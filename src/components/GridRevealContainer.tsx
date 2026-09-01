import { type ReactNode, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface GridRevealContainerProps {
  children: ReactNode
  className?: string
  /* Optional custom max-height class or style override */
  maxHeightClass?: string
}

/**
 * GridRevealContainer provides an internal scroll container designed to show
 * exactly 4 full rows of cards with a partial peek of the 5th row at the bottom edge,
 * providing an intuitive scroll affordance with internal scroll containment.
 */
export const GridRevealContainer = forwardRef<HTMLDivElement, GridRevealContainerProps>(
  ({ children, className, maxHeightClass = 'max-h-[calc(100vh-280px)] min-h-[420px]' }, ref) => {
    return (
      <div className="relative w-full">
        <div
          ref={ref}
          className={cn(
            'overflow-y-auto overscroll-contain rounded-xl pr-1.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/40',
            maxHeightClass,
            className,
          )}
        >
          {children}
        </div>
      </div>
    )
  },
)

GridRevealContainer.displayName = 'GridRevealContainer'
