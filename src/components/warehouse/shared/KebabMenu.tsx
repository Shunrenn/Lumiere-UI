import { useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { FloatingPanel } from '@/components/warehouse/shared/FloatingPanel'
import { cn } from '@/lib/utils'

export interface KebabMenuAction {
  label: string
  onSelect: () => void
  destructive?: boolean
}

interface KebabMenuProps {
  actions: KebabMenuAction[]
  align?: 'left' | 'right'
  label?: string
}

export function KebabMenu({ actions, align = 'right', label = 'Open actions menu' }: KebabMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </button>
      <FloatingPanel
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        align={align}
        width={180}
        label={label}
        className="py-1"
      >
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              action.onSelect()
            }}
            className={cn(
              'block w-full px-3.5 py-2 text-left text-xs font-medium transition-colors hover:bg-accent',
              action.destructive ? 'text-destructive' : 'text-card-foreground',
            )}
          >
            {action.label}
          </button>
        ))}
      </FloatingPanel>
    </div>
  )
}
