import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function ProjectManagerModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const titleId = useId()
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
      if (event.key !== 'Tab') return
      const controls = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, textarea, [tabindex="0"]') || [])
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', handleKey); if (previous?.isConnected) previous.focus() }
  }, [])
  return createPortal(<div className="pm-account pm-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="pm-modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header><h2 id={titleId}>{title}</h2><button aria-label="Close dialog" onClick={onClose}><X size={20} /></button></header>
      <div className="pm-modal-body">{children}</div>
    </div>
  </div>, document.body)
}

export function PMFields({ fields }: { fields: [string, string | number | undefined][] }) {
  return <dl className="pm-fields">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value === undefined || value === '' ? 'Not available' : value}</dd></div>)}</dl>
}
