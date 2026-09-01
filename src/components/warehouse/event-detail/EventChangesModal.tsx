import { X, Bell } from 'lucide-react'
import type { EditedEventField } from '@/lib/event-detail'

interface EventChangesModalProps {
  eventTitle: string
  // Fields the Admin edited since the viewer's last visit. Highlighted in the
  // accent color so the specific changes stand out from unchanged context.
  editedFields: EditedEventField[]
  onClose: () => void
}

export function EventChangesModal({ eventTitle, editedFields, onClose }: EventChangesModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Admin changes to ${eventTitle}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header — mirrors the sibling CrewInfoModal shell */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive ring-1 ring-destructive/30">
              <Bell className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Updated by admin
              </p>
              <h2 className="mt-0.5 font-serif text-2xl font-medium leading-tight text-card-foreground text-balance">
                What changed
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            An admin edited the following {editedFields.length === 1 ? 'field' : 'fields'} on{' '}
            <span className="font-semibold text-card-foreground">{eventTitle}</span> since your last view. Edited
            values are highlighted.
          </p>

          <ul className="space-y-2.5">
            {editedFields.map((field) => (
              <li
                key={field.key}
                className="flex items-center justify-between gap-4 rounded-lg border border-accent bg-accent/40 px-4 py-3"
              >
                <span className="text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  {field.label}
                </span>
                <span className="min-w-0 truncate rounded-md bg-accent px-2.5 py-1 text-sm font-semibold text-accent-foreground">
                  {field.value}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-6 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
