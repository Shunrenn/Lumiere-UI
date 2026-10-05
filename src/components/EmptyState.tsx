import { SearchX, type LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils'

interface EmptyStateProps {
  title?: string
  message?: string
  icon?: LucideIcon
  actionLabel?: string
  onAction?: () => void
  className?: string
  compact?: boolean
}

export function EmptyState({
  title = 'No matching items found',
  message = 'Try adjusting your search query or clear filters to see more results.',
  icon: Icon = SearchX,
  actionLabel,
  onAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center text-center',
        compact ? 'p-6 py-8' : 'min-h-[260px] p-6 sm:p-10',
        className,
      )}
    >
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted/70 text-muted-foreground ring-1 ring-border">
        <Icon className="size-6 text-muted-foreground/80" />
      </div>
      <h3 className="mt-4 font-serif text-base font-medium text-foreground sm:text-lg">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center justify-center rounded-md border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
