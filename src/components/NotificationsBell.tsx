import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, RefreshCw, AlertCircle, Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  fetchNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  type NotificationDto,
} from '@/lib/notificationsApi'

export interface NotificationEntry {
  id: string
  icon?: LucideIcon
  color?: string
  text: string
  time: string
  unread: boolean
  onClick?: () => void
}

interface NotificationsBellProps {
  notifications?: NotificationEntry[]
  /* 'sm' matches the Design Canvas trigger scale; 'md' matches the Admin /
     Executive top-bar scale (size-10 buttons). */
  size?: 'sm' | 'md'
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return 'Recently'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return 'Recently'
  }
}

export function NotificationsBell({ notifications: propNotifications, size = 'sm' }: NotificationsBellProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Canonical state when no prop is provided
  const [canonicalItems, setCanonicalItems] = useState<NotificationDto[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const isControlled = Boolean(propNotifications)

  const loadNotifications = useCallback(async (isBackground = false) => {
    if (isControlled) return
    if (!isBackground) {
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'loading'))
    }
    setErrorMessage(null)
    setActionError(null)

    try {
      const data = await fetchNotificationsApi()
      setCanonicalItems(data)
      setStatus('ready')
    } catch (err: any) {
      if (!isBackground) {
        setStatus('error')
        setErrorMessage(err?.message || 'Unable to load notifications.')
      }
    }
  }, [isControlled])

  // Initial load + Polling and Invalidation listener
  useEffect(() => {
    if (isControlled) return

    loadNotifications(false)

    const intervalId = setInterval(() => {
      loadNotifications(true)
    }, 30000)

    const handleInvalidation = () => {
      loadNotifications(true)
    }

    const handleFocus = () => {
      loadNotifications(true)
    }

    window.addEventListener('lumiere:realtime_invalidation', handleInvalidation)
    window.addEventListener('lumiere:realtime_reconnected', handleInvalidation)
    window.addEventListener('lumiere:notification_invalidation', handleInvalidation)
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('lumiere:realtime_invalidation', handleInvalidation)
      window.removeEventListener('lumiere:realtime_reconnected', handleInvalidation)
      window.removeEventListener('lumiere:notification_invalidation', handleInvalidation)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadNotifications, isControlled])

  // Click outside listener
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Derived notification items
  const displayItems = isControlled
    ? propNotifications!
    : canonicalItems.map((n) => ({
        id: n.id,
        text: n.message ? `${n.title}: ${n.message}` : n.title,
        title: n.title,
        message: n.message,
        time: formatRelativeTime(n.createdAt),
        unread: !n.isRead,
        raw: n,
      }))

  const unreadCount = displayItems.filter((n) => n.unread).length
  const isMd = size === 'md'

  const handleMarkOne = async (item: any) => {
    if (isControlled) {
      item.onClick?.()
      return
    }
    if (!item.unread) return

    setActionError(null)
    const success = await markNotificationReadApi(item.id)
    if (success) {
      setCanonicalItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      )
    } else {
      setActionError('Failed to mark notification as read.')
    }
  }

  const handleMarkAll = async () => {
    if (isControlled || isMarkingAll) return
    setIsMarkingAll(true)
    setActionError(null)

    const success = await markAllNotificationsReadApi()
    setIsMarkingAll(false)
    if (success) {
      setCanonicalItems((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      )
    } else {
      setActionError('Failed to mark all notifications as read.')
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o)
          if (!open && !isControlled && status !== 'ready') {
            loadNotifications(false)
          }
        }}
        className={cn(
          'relative flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-foreground cursor-pointer',
          isMd ? 'size-10' : 'size-8',
        )}
      >
        <Bell className="size-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            data-testid="notifications-unread-badge"
            className={cn(
              'absolute rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground',
              isMd ? 'right-1 top-1 min-w-4 h-4 px-1 text-[0.55rem]' : '-right-1 -top-1 min-w-3.5 h-3.5 px-0.5 text-[0.5rem]',
            )}
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 z-50 w-80 sm:w-96 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden',
            isMd ? 'top-12' : 'top-10',
          )}
          role="menu"
          aria-label="Notifications"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="font-serif text-xs font-semibold text-popover-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider">
                  {unreadCount} New
                </span>
              )}
            </div>
            {!isControlled && unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={isMarkingAll}
                className="flex items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-wider text-primary hover:underline disabled:opacity-50 cursor-pointer"
              >
                <CheckCheck className="size-3" />
                {isMarkingAll ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>

          {actionError && (
            <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-1.5 text-[0.65rem] text-destructive flex items-center gap-1.5">
              <AlertCircle className="size-3 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Body Content */}
          <div className="flex max-h-80 flex-col overflow-y-auto divide-y divide-border">
            {status === 'loading' && displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <RefreshCw className="size-5 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground">Loading notifications...</p>
              </div>
            ) : status === 'error' && displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center text-destructive">
                <AlertCircle className="size-6 text-destructive/80" />
                <p className="text-xs font-semibold">{errorMessage || 'Failed to load notifications'}</p>
                <button
                  type="button"
                  onClick={() => loadNotifications(false)}
                  className="mt-2 inline-flex items-center gap-1 rounded-md bg-destructive/10 px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/20 transition"
                >
                  <RefreshCw className="size-3" />
                  Retry
                </button>
              </div>
            ) : displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center text-muted-foreground px-4">
                <Sparkles className="size-5 text-muted-foreground/60" />
                <p className="text-xs font-medium text-foreground/80">You&apos;re all caught up</p>
                <p className="text-[0.65rem] text-muted-foreground">No unread or pending operational notifications.</p>
              </div>
            ) : (
              displayItems.map((n: any) => {
                const isUnread = Boolean(n.unread)
                return (
                  <button
                    key={n.id}
                    type="button"
                    role="menuitem"
                    onClick={() => handleMarkOne(n)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent focus:bg-accent focus:outline-none cursor-pointer',
                      isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'bg-transparent',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1 size-2 shrink-0 rounded-full',
                        isUnread ? 'bg-primary ring-2 ring-primary/20' : 'bg-transparent border border-muted-foreground/30',
                      )}
                      aria-hidden="true"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {n.title ? (
                        <>
                          <p className={cn('text-xs font-medium leading-snug', isUnread ? 'font-semibold text-foreground' : 'text-foreground/80')}>
                            {n.title}
                          </p>
                          {n.message && (
                            <p className="text-[0.68rem] leading-relaxed text-muted-foreground line-clamp-2">
                              {n.message}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className={cn('text-xs leading-snug', isUnread ? 'font-semibold text-foreground' : 'text-foreground/80')}>
                          {n.text}
                        </p>
                      )}
                      <span className="text-[0.55rem] uppercase tracking-wider text-muted-foreground/80 mt-1">
                        {n.time}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
