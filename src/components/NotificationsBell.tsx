import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, RefreshCw, AlertCircle, Sparkles, X, type LucideIcon } from 'lucide-react'
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
    : displayItems.filter((item: any) => isInPeriod(item.raw.createdAt, period))
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
            ) : scopedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center text-muted-foreground px-4">
                <Sparkles className="size-5 text-muted-foreground/60" />
                <p className="text-xs font-medium text-foreground/80">You&apos;re all caught up</p>
                <p className="text-[0.65rem] text-muted-foreground">No unread or pending operational notifications.</p>
              </div>
            ) : (
              scopedItems.slice(0, 5).map((n: any) => {
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
          <button type="button" onClick={() => setShowAll(true)} className="flex w-full items-center justify-center border-t border-border px-4 py-3 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary hover:bg-accent">
              View All Notifications
            </button>
        </div>
      )}

      {showAll && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="notifications-dialog-title" onClick={() => setShowAll(false)}>
          <div className="flex max-h-[min(720px,calc(100vh-1.5rem))] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div><h2 id="notifications-dialog-title" className="font-serif text-lg font-semibold text-popover-foreground">Notifications</h2><p className="mt-0.5 text-xs text-muted-foreground">Only notifications authorized for the signed-in account are shown.</p></div>
              <button type="button" onClick={() => setShowAll(false)} className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close notifications"><X className="size-4" /></button>
            </div>
            <div className="flex gap-2 border-b border-border px-5 py-3">
              {(['today', 'week', 'all'] as const).map((value) => <button key={value} type="button" onClick={() => setPeriod(value)} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold capitalize', period === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>{value === 'week' ? 'This Week' : value}</button>)}
            </div>
            <div className="min-h-0 overflow-y-auto divide-y divide-border">
              {scopedItems.length === 0 ? <div className="px-5 py-14 text-center text-sm text-muted-foreground">No notifications for this period.</div> : scopedItems.map((n: any) => <button key={n.id} type="button" onClick={() => handleMarkOne(n)} className={cn('flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-accent', n.unread && 'bg-primary/5')}><span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.unread ? 'bg-primary' : 'border border-muted-foreground/40')} /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">{n.title || n.text}</span>{n.message && <span className="mt-1 block text-xs text-muted-foreground">{n.message}</span>}<span className="mt-2 block text-[0.65rem] text-muted-foreground">{n.time}</span></span></button>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
