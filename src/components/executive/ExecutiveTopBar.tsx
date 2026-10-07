import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarClock,
  LogOut,
  Menu,
  Moon,
  PackageSearch,
  ShieldAlert,
  Sun,
  Truck,
  Hammer,
  User,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { usePortal } from '@/lib/store'
import { useDarkMode } from '@/lib/theme'
import { NotificationsBell, type NotificationEntry } from '@/components/NotificationsBell'
import { AssetInformationModal, type Asset } from '@/components/AssetInformationModal'

// Constant top bar for Executive and Warehouse Operations Manager consoles:
// live date/time, scoped notifications bell with read status, and profile menu.
export function ExecutiveTopBar({ onMenu }: { onMenu?: () => void }) {
  const { adminName, adminRole, setConfirmLogout, isExecutive } = useAuth()
  const { events, damageExceptions, inventory } = usePortal()
  const { navigate } = useNav()
  const { dark, toggle } = useDarkMode()
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [now, setNow] = useState(() => new Date())
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

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

  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  })
  const timeLabel = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  // Role-scoped operational signals for the notifications bell
  const notifications = useMemo<NotificationEntry[]>(() => {
    const items: NotificationEntry[] = []

    if (isExecutive) {
      // ═════════════════════════════════════════════════════════════════
      // 1. EXECUTIVE NOTIFICATIONS & DIRECTORIES
      // ═════════════════════════════════════════════════════════════════
      
      // Event Registry / Confirmation
      events
        .filter((e) => e.status === 'Initialized' || e.status === 'On Hold')
        .slice(0, 4)
        .forEach((e) => {
          items.push({
            id: `exec-ev-${e.id}`,
            icon: CalendarClock,
            color: 'text-sky-500',
            text: `"${e.title}" is awaiting executive confirmation.`,
            time: 'Event Registry',
            unread: true,
            onClick: () => navigate('registry', { kind: 'view-event', payload: { id: e.id } }),
          })
        })

      // Executive Settlements
      events
        .filter((e) => e.status === 'Completed')
        .slice(0, 3)
        .forEach((e) => {
          items.push({
            id: `exec-settle-${e.id}`,
            icon: CalendarClock,
            color: 'text-amber-500',
            text: `"${e.title}" completed — ready for settlement review.`,
            time: 'Executive Work Queue',
            unread: true,
            onClick: () => navigate('overview', { kind: 'view-event', payload: { id: e.id } }),
          })
        })

      // Damage Review Sign-off
      damageExceptions
        .filter((d) => d.status === 'Pending Second Sign-off' || d.status === 'Held for Audit')
        .slice(0, 3)
        .forEach((d) => {
          items.push({
            id: `exec-dm-${d.id}`,
            icon: ShieldAlert,
            color: 'text-rose-500',
            text: `Damage report ${d.logId || d.id.slice(0, 8)} (${d.assetName}) requires sign-off.`,
            time: 'Damage Review',
            unread: true,
            onClick: () => navigate('damage', { kind: 'review-damage', payload: { id: d.id } }),
          })
        })

      // Asset Inventory Allocations
      inventory
        .filter((i) => i.status === 'Critical Deficit')
        .slice(0, 3)
        .forEach((i) => {
          items.push({
            id: `exec-rs-${i.id}`,
            icon: PackageSearch,
            color: 'text-amber-500',
            text: `${i.name} (${i.assetId || i.id}) is in critical stock deficit.`,
            time: 'Asset Inventory',
            unread: false,
            onClick: () => navigate('inventory'),
          })
        })
    } else {
      // ═════════════════════════════════════════════════════════════════
      // 2. WAREHOUSE OPERATIONS MANAGER (WOM) NOTIFICATIONS & DIRECTORIES
      // ═════════════════════════════════════════════════════════════════

      // Damage Validation queue awaiting WOM Verdict
      damageExceptions
        .filter((d) => d.status === 'Pending Verdict' || d.status === 'Held for Audit')
        .slice(0, 4)
        .forEach((d) => {
          items.push({
            id: `wom-dm-${d.id}`,
            icon: ShieldAlert,
            color: 'text-rose-500',
            text: `Damage report ${d.logId || d.id.slice(0, 8)} (${d.assetName}) requires WOM verdict.`,
            time: 'Damage Validation',
            unread: true,
            onClick: () => navigate('damage', { kind: 'review-damage', payload: { id: d.id } }),
          })
        })

      // Upcoming Ingress & Event Schedule
      events
        .filter((e) => e.status === 'In Production' || e.status === 'Reserved' || e.status === 'Initialized')
        .slice(0, 3)
        .forEach((e) => {
          items.push({
            id: `wom-ev-${e.id}`,
            icon: CalendarClock,
            color: 'text-sky-500',
            text: `"${e.title}" ingress scheduled at ${e.venue}.`,
            time: 'Warehouse Dashboard',
            unread: true,
            onClick: () => navigate('overview', { kind: 'view-event', payload: { id: e.id } }),
          })
        })

      // Replenishment & Stock Deficits
      inventory
        .filter((i) => i.status === 'Critical Deficit' || i.status === 'Low Stock')
        .slice(0, 3)
        .forEach((i) => {
          items.push({
            id: `wom-rep-${i.id}`,
            icon: PackageSearch,
            color: 'text-amber-500',
            text: `${i.name} (${i.assetId || i.id}) is low on stock — review replenishment.`,
            time: 'Replenishment & Deficits',
            unread: true,
            onClick: () => navigate('replenishment'),
          })
        })

      // Dispatch & Logistics
      items.push({
        id: 'wom-dispatch-check',
        icon: Truck,
        color: 'text-emerald-500',
        text: 'Vehicle assignments and gate pass manifests ready for dispatch review.',
        time: 'Dispatch & Logistics',
        unread: false,
        onClick: () => navigate('dispatch'),
      })

      // Production & Fabrication
      items.push({
        id: 'wom-prod-check',
        icon: Hammer,
        color: 'text-amber-600',
        text: 'Bespoke fabrication queue & workshop capacity timelines updated.',
        time: 'Production & Fabrication',
        unread: false,
        onClick: () => navigate('production'),
      })
    }

    return items
  }, [isExecutive, events, damageExceptions, inventory, navigate])

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-5 sm:px-8 md:static">
      <div className="flex min-w-0 items-center gap-3">
        {onMenu && (
          <button
            type="button"
            onClick={onMenu}
            aria-label="Open navigation"
            className="flex size-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-muted md:hidden cursor-pointer"
          >
            <Menu className="size-4" aria-hidden="true" />
          </button>
        )}
        <p className="truncate text-[0.65rem] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:text-xs sm:tracking-[0.15em]">
          {dateLabel} <span className="mx-1 text-border">|</span> {timeLabel}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <NotificationsBell notifications={notifications} size="md" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            className="flex size-10 items-center justify-center rounded-full border border-border bg-primary/15 text-primary transition-colors hover:bg-primary/25 cursor-pointer"
          >
            <User className="size-4" aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-100"
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
                  onClick={toggle}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-card-foreground transition-colors hover:bg-accent cursor-pointer"
                >
                  {dark ? (
                    <Sun className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Moon className="size-3.5" aria-hidden="true" />
                  )}
                  {dark ? 'Switch to light mode' : 'Switch to dark mode'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setConfirmLogout(true)
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-destructive transition-colors hover:bg-accent cursor-pointer"
                >
                  <LogOut className="size-3.5" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedAsset && (
        <AssetInformationModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          readOnly
        />
      )}
    </header>
  )
}
