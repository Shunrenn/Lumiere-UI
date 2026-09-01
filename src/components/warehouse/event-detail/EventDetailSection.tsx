import type { ReactNode } from 'react'

interface EventDetailSectionProps {
  title: string
  action?: ReactNode
  children: ReactNode
}

export function EventDetailSection({ title, action, children }: EventDetailSectionProps) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="font-serif text-lg font-medium text-card-foreground">{title}</h2>
        {action}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  )
}

interface SectionButtonProps {
  onClick: () => void
  children: ReactNode
}

export function SectionButton({ onClick, children }: SectionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-md border border-border bg-background px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition-colors hover:bg-accent"
    >
      {children}
    </button>
  )
}
