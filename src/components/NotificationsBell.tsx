import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, RefreshCw, AlertCircle, Sparkles, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  fetchNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  type NotificationDto,
} from '@/features/notifications/api/notificationsApi'

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

  // Persistent read state for controlled / local notifications
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem('lumiere_read_notification_ids')
      return stored ? new Set(JSON.parse(stored)) : new Set<string>()
    } catch {
      return new Set<string>()
    }
  })

  const markIdAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      try {
        sessionStorage.setItem('lumiere_read_notification_ids', JSON.stringify(Array.from(next)))
      } catch {}
      return next
    })
  }, [])

  const markAllIdsAsRead = useCallback((ids: string[]) => {
    setReadIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      try {
        sessionStorage.setItem('lumiere_read_notification_ids', JSON.stringify(Array.from(next)))
      } catch {}
      return next
    })
  }, [])

  // Canonical state when no prop is provided
  const [canonicalItems, setCanonicalItems] = useState<NotificationDto[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [period, setPeriod] = useState<'today' | 'week' | 'all'>('today')

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
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('lumiere:realtime_invalidation', handleInvalidation)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isControlled, loadNotifications])

  // Outside click listener for the popover
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Compute unified display items
  const displayItems = isControlled
    ? (propNotifications ?? []).map((n) => ({
        ...n,
        unread: n.unread && !readIds.has(n.id),
      }))
    : canonicalItems.map((n) => ({
        id: n.id,
        text: n.message ? `${n.title}: ${n.message}` : n.title,
        title: n.title,
        message: n.message,
        time: formatRelativeTime(n.createdAt),
        unread: !n.isRead && !readIds.has(n.id),
        raw: n,
      }))

  const isInPeriod = (isoString: string, selectedPeriod: typeof period) => {
    const date = new Date(isoString)
    if (Number.isNaN(date.getTime()) || selectedPeriod === 'all') return true
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    if (selectedPeriod === 'today') return date.getTime() >= startOfToday
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime()
    return date.getTime() >= startOfWeek
  }

  const scopedItems = isControlled
    ? displayItems
    : displayItems.filter((item: any) => isInPeriod(item.raw?.createdAt || new Date().toISOString(), period))
  const unreadCount = displayItems.filter((n) => n.unread).length
  const isMd = size === 'md'

  const handleMarkOne = async (item: any) => {
    markIdAsRead(item.id)
    setOpen(false)
    setShowAll(false)

    if (isControlled) {
      item.onClick?.()
      return
    }

    if (!item.unread) {
      item.onClick?.()
      return
    }

    setActionError(null)
    const success = await markNotificationReadApi(item.id)
    if (success) {
      setCanonicalItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      )
    } else {
      setActionError('Failed to mark notification as read.')
    }
    item.onClick?.()
  }

  const handleMarkAll = async () => {
    const allCurrentIds = displayItems.map((n) => n.id)
    markAllIdsAsRead(allCurrentIds)

    if (isControlled) return

    if (isMarkingAll) return
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
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Notifications"
        title="View Notifications"
        className={cn(
          'relative flex items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer',
          isMd ? 'size-10' : 'size-9',
          open && 'border-primary/50 bg-accent text-foreground'
        )}
      >
        <Bell className={cn(isMd ? 'size-4' : 'size-4', unreadCount > 0 ? 'text-primary' : 'text-muted-foreground')} />
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-bold text-primary-foreground ring-2 ring-background animate-in zoom-in-75 duration-150"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {open && (
        <div
          role="menu"
          aria-label="Notifications list"
          className="absolute right-0 z-50 mt-2 w-80 sm:w-96 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-serif text-xs font-semibold text-popover-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider">
                  {unreadCount} New
                </span>
              )}
            </div>
            {unreadCount > 0 && (
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
            ) : scopedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center text-muted-foreground px-4">
                <Sparkles className="size-5 text-muted-foreground/60" />
                <p className="text-xs font-medium text-foreground/80">You&apos;re all caught up</p>
                <p className="text-[0.65rem] text-muted-foreground">No unread or pending operational notifications.</p>
              </div>
            ) : (
              scopedItems.slice(0, 5).map((n: any) => {
                const isUnread = Boolean(n.unread)
                const IconComponent = n.icon
                return (
                  <button
                    key={n.id}
                    type="button"
                    role="menuitem"
                    onClick={() => handleMarkOne(n)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent focus:bg-accent focus:outline-none cursor-pointer group',
                      isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'bg-transparent',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1 size-2 shrink-0 rounded-full transition-all',
                        isUnread ? 'bg-primary ring-2 ring-primary/20 scale-110' : 'bg-transparent border border-muted-foreground/30',
                      )}
                      aria-hidden="true"
                    />
                    {IconComponent && (
                      <IconComponent className={cn('mt-0.5 size-4 shrink-0', n.color || 'text-primary')} />
                    )}
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
                      <span className="text-[0.55rem] uppercase tracking-wider text-muted-foreground/80 mt-0.5">
                        {n.time}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
          <button type="button" onClick={() => setShowAll(true)} className="flex w-full items-center justify-center border-t border-border px-4 py-3 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary hover:bg-accent cursor-pointer">
              View All Notifications
          </button>
        </div>
      )}

      {showAll && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="notifications-dialog-title" onClick={() => setShowAll(false)}>
          <div className="flex max-h-[min(720px,calc(100vh-1.5rem))] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div><h2 id="notifications-dialog-title" className="font-serif text-lg font-semibold text-popover-foreground">Notifications</h2><p className="mt-0.5 text-xs text-muted-foreground">Only notifications authorized for the signed-in account are shown.</p></div>
              <button type="button" onClick={() => setShowAll(false)} className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer" aria-label="Close notifications"><X className="size-4" /></button>
            </div>
            <div className="flex gap-2 border-b border-border px-5 py-3">
              {(['today', 'week', 'all'] as const).map((value) => <button key={value} type="button" onClick={() => setPeriod(value)} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold capitalize cursor-pointer', period === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>{value === 'week' ? 'This Week' : value}</button>)}
            </div>
            <div className="min-h-0 overflow-y-auto divide-y divide-border">
              {scopedItems.length === 0 ? <div className="px-5 py-14 text-center text-sm text-muted-foreground">No notifications for this period.</div> : scopedItems.map((n: any) => <button key={n.id} type="button" onClick={() => handleMarkOne(n)} className={cn('flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-accent cursor-pointer', n.unread && 'bg-primary/5')}><span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.unread ? 'bg-primary' : 'border border-muted-foreground/40')} /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">{n.title || n.text}</span>{n.message && <span className="mt-1 block text-xs text-muted-foreground">{n.message}</span>}<span className="mt-2 block text-[0.65rem] text-muted-foreground">{n.time}</span></span></button>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
