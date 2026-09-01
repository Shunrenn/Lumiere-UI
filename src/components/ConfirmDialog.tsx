import type { ReactNode } from 'react'
import { AlertTriangle, ShieldCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  title: string
  /* Short eyebrow label shown above the title */
  eyebrow?: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'destructive'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  eyebrow = 'Confirmation Required',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null

  const destructive = tone === 'destructive'
  const Icon = destructive ? AlertTriangle : ShieldCheck

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
                destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
              )}
            >
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {eyebrow}
              </p>
              <h2 className="mt-0.5 font-serif text-xl font-medium leading-tight text-card-foreground">
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground transition hover:text-foreground"
            aria-label="Cancel"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        {description && (
          <div className="px-6 py-5 text-sm leading-relaxed text-muted-foreground">
            {description}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-input bg-background px-5 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-foreground transition hover:bg-muted"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'rounded-md px-5 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90',
              destructive ? 'bg-destructive' : 'bg-primary',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
