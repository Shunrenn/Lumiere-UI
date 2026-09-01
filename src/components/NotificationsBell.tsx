import { useEffect, useRef, useState } from 'react'
import { Bell, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NotificationEntry {
  id: string
  icon: LucideIcon
  color: string
  text: string
  time: string
  unread: boolean
}

interface NotificationsBellProps {
  notifications: NotificationEntry[]
  /* 'sm' matches the Design Canvas trigger scale; 'md' matches the Admin /
     Executive top-bar scale (size-10 buttons). */
  size?: 'sm' | 'md'
}

// Single shared notification bell + dropdown. Originally built for the Event
// Planner design canvas hub — every other console (Admin, Executive) reuses
// this exact trigger/panel instead of re-implementing its own, only swapping
// which `notifications` list is passed in.
export function NotificationsBell({ notifications, size = 'sm' }: NotificationsBellProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const unreadCount = notifications.filter((n) => n.unread).length
  const isMd = size === 'md'

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'relative flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-foreground',
          isMd ? 'size-10' : 'size-8',
        )}
      >
        <Bell className="size-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute rounded-full bg-primary',
              isMd ? 'right-2.5 top-2.5 size-1.5' : '-right-0.5 -top-0.5 size-2',
            )}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 z-50 w-80 rounded-xl border border-border bg-popover shadow-2xl',
            isMd ? 'top-12' : 'top-10',
          )}
          role="menu"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="font-serif text-xs font-medium text-popover-foreground">Notifications</span>
            <span className="text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-primary">
              {unreadCount} New
            </span>
          </div>
          <div className="flex max-h-80 flex-col overflow-y-auto py-1">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-[0.65rem] text-muted-foreground">
                You&apos;re all caught up.
              </p>
            ) : (
              notifications.map((n) => {
                const Icon = n.icon
                return (
                  <div
                    key={n.id}
                    role="menuitem"
                    className={cn(
                      'flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-accent',
                      n.unread && 'bg-primary/5',
                    )}
                  >
                    <Icon className={cn('mt-0.5 size-3.5 shrink-0', n.color)} aria-hidden="true" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="text-[0.68rem] leading-snug text-popover-foreground">{n.text}</p>
                      <span className="text-[0.55rem] uppercase tracking-[0.08em] text-muted-foreground">
                        {n.time}
                      </span>
                    </div>
                    {n.unread && (
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
