import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PwaModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function PwaModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
}: PwaModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-all">
      <div
        className={cn(
          'relative flex max-h-[90vh] w-full max-w-[440px] flex-col rounded-t-3xl sm:rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
          <div className="min-w-0 pr-3">
            <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 shrink-0"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-border/80 bg-muted/20 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  )
}
