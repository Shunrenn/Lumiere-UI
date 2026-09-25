import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PwaButton } from './PwaButton'

interface PwaLoadingStateProps {
  message?: string
  className?: string
}

export function PwaLoadingState({ message = 'Loading operational data...', className }: PwaLoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="relative mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <RefreshCw className="size-6 animate-spin" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{message}</p>
    </div>
  )
}

interface PwaEmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function PwaEmptyState({
  title,
  description,
  icon,
  action,
  className,
}: PwaEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center bg-card/50', className)}>
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        {icon || <Inbox className="size-6" />}
      </div>
      <h3 className="font-serif text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-xs text-muted-foreground leading-relaxed">{description}</p>}
      {action && (
        <PwaButton onClick={action.onClick} variant="outline" size="sm" className="mt-4">
          {action.label}
        </PwaButton>
      )}
    </div>
  )
}

interface PwaErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export function PwaErrorState({
  title = 'Operational Warning',
  message,
  onRetry,
  className,
}: PwaErrorStateProps) {
  return (
    <div className={cn('rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-left', className)}>
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
          <AlertTriangle className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-sm text-foreground">{title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{message}</p>
          {onRetry && (
            <div className="mt-3">
              <PwaButton onClick={onRetry} variant="destructive" size="sm" icon={<RefreshCw className="size-3.5" />}>
                Retry Action
              </PwaButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
