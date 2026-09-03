import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CheckCircle2, Info, LogOut, Moon, Search, Sun, TriangleAlert, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useDarkMode } from '@/lib/theme'
import { getDispatchActivity, type DispatchActivityEntry } from '@/lib/warehouse-dispatch'
import { getCatalogAssets, getLowStockAssets } from '@/lib/warehouse-catalog'
import { cn } from '@/lib/utils'

const TONE_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
} as const

const TONE_CLASS = {
  info: 'text-muted-foreground',
  success: 'text-primary',
  warning: 'text-destructive',
} as const

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface WarehouseHeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function WarehouseHeader({ searchQuery, onSearchChange }: WarehouseHeaderProps) {
  const { adminName, adminRole, setConfirmLogout } = useAuth()
  const { dark, toggle } = useDarkMode()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  useEffect(() => {
    if (!notifOpen) return
    const handleClick = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [notifOpen])

  // The bell reads the real dispatch activity log plus any live stock-below-
  // threshold breaches, so it is never an inert decoration.
  const notifications = useMemo<DispatchActivityEntry[]>(() => {
    if (!notifOpen) return []
    const lowStock = getLowStockAssets(getCatalogAssets()).slice(0, 5).map((asset) => ({
      id: `low-${asset.id}`,
      timestamp: new Date().toISOString(),
      message: `${asset.name} is below threshold — ${asset.currentStock}/${asset.threshold} ${asset.unit} on hand.`,
      tone: 'warning' as const,
    }))
    return [...lowStock, ...getDispatchActivity()]
  }, [notifOpen])

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      {/* Left Title & Greeting */}
      <div>
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.28em] text-primary">
          Warehouse Operations Manager
        </p>
        <h1 className="mt-0.5 font-serif text-2xl font-medium text-foreground sm:text-3xl">
          Good to see you, {adminName.split(' ')[0] || 'there'}.
        </h1>
      </div>

      {/* Right Header Action Cluster: Compact Search Bar + Notifications + Account Menu */}
      <div className="flex items-center gap-3">
        {/* Compact Fixed-Width Search Input */}
        <div className="relative w-52 sm:w-64">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="warehouse-search" className="sr-only">
            Search assets, batches, crew, purchase orders, vendors, and events
          </label>
          <input
            id="warehouse-search"
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search anything"
            className={cn(
              'w-full rounded-full border border-border/80 bg-card/90 py-2.5 pl-10 pr-4 text-xs text-card-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground',
              'focus:border-primary focus:ring-1.5 focus:ring-primary/30',
            )}
          />
        </div>

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((open) => !open)}
            aria-label="Notifications"
            aria-haspopup="dialog"
            aria-expanded={notifOpen}
            className="relative flex size-10 items-center justify-center rounded-full border border-border bg-card text-card-foreground transition-colors hover:bg-accent"
          >
            <Bell className="size-4" aria-hidden="true" />
            <span
              className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-destructive"
              aria-hidden="true"
            />
          </button>

          {notifOpen && (
            <div
              role="dialog"
              aria-label="Notifications"
              className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-card shadow-xl"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Activity
                </p>
                <p className="mt-0.5 text-sm font-semibold text-card-foreground">
                  {notifications.length === 0 ? 'Nothing new' : `${notifications.length} updates`}
                </p>
              </div>
              <ul className="flex max-h-80 flex-col overflow-y-auto">
                {notifications.length === 0 && (
                  <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                    Stock levels are healthy and no batches have moved yet.
                  </li>
                )}
                {notifications.map((entry) => {
                  const Icon = TONE_ICON[entry.tone]
                  return (
                    <li
                      key={entry.id}
                      className="flex items-start gap-2.5 border-b border-border/60 px-4 py-3 last:border-b-0"
                    >
                      <Icon className={cn('mt-0.5 size-3.5 shrink-0', TONE_CLASS[entry.tone])} aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-xs leading-relaxed text-card-foreground">{entry.message}</p>
                        <p className="mt-0.5 text-[0.58rem] uppercase tracking-[0.1em] text-muted-foreground">
                          {relativeTime(entry.timestamp)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Account Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            className="flex size-10 items-center justify-center rounded-full border border-border bg-primary/15 text-primary transition-colors hover:bg-primary/25"
          >
            <User className="size-4" aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-xl"
            >
              <div className="px-4 py-3">
                <p className="truncate text-sm font-semibold text-card-foreground">{adminName}</p>
                <p className="truncate text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground">
                  {adminRole}
                </p>
              </div>
              <div className="border-t border-border">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    toggle()
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-card-foreground transition-colors hover:bg-accent"
                >
                  {dark ? <Sun className="size-3.5" aria-hidden="true" /> : <Moon className="size-3.5" aria-hidden="true" />}
                  {dark ? 'Switch to light mode' : 'Switch to dark mode'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setConfirmLogout(true)
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-destructive transition-colors hover:bg-accent"
                >
                  <LogOut className="size-3.5" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
