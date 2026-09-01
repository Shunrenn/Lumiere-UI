// Portal-rendered floating panel for dropdowns and popovers that live inside
// scrolling table containers. Rendering in place clips the panel against the
// table's `overflow-x-auto` wrapper (the browser resolves the cross axis to
// `auto`), which is what made row action menus unreachable — the options were
// cut off and the container refused to scroll to them. Rendering into
// document.body with fixed positioning sidesteps the clip entirely, and the
// panel itself scrolls when its content is taller than the viewport gap.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

const GAP = 6
const MIN_SPACE = 140

interface FloatingPanelProps {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  align?: 'left' | 'right'
  width?: number
  className?: string
  label?: string
  children: ReactNode
}

export function FloatingPanel({
  anchorRef,
  open,
  onClose,
  align = 'right',
  width = 176,
  className,
  label,
  children,
}: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<{ top: number; left: number; maxHeight: number } | null>(null)

  const reposition = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - GAP * 2
    const spaceAbove = rect.top - GAP * 2
    const placeAbove = spaceBelow < MIN_SPACE && spaceAbove > spaceBelow
    const maxHeight = Math.max(MIN_SPACE, Math.min(288, placeAbove ? spaceAbove : spaceBelow))
    const rawLeft = align === 'right' ? rect.right - width : rect.left
    const left = Math.max(GAP, Math.min(rawLeft, window.innerWidth - width - GAP))
    const top = placeAbove ? Math.max(GAP, rect.top - maxHeight - GAP) : rect.bottom + GAP
    setStyle({ top, left, maxHeight })
  }, [align, anchorRef, width])

  useLayoutEffect(() => {
    if (!open) {
      setStyle(null)
      return
    }
    reposition()
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, onClose, reposition, anchorRef])

  if (!open || !style) return null

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-label={label}
      style={{ top: style.top, left: style.left, width, maxHeight: style.maxHeight }}
      className={cn(
        'fixed z-[60] overflow-y-auto overscroll-contain rounded-md border border-border bg-card shadow-xl',
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  )
}
