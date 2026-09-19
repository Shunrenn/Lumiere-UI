import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, LogOut, Moon, PackageSearch, ShieldAlert, Sun, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { usePortal } from '@/lib/store'
import { useDarkMode } from '@/lib/theme'
import { NotificationsBell, type NotificationEntry } from '@/components/NotificationsBell'
import { AssetInformationModal, type Asset } from '@/components/AssetInformationModal'

// Constant top bar for the Executive console: live date/time, the shared
// notification bell (size="md", matching the Admin top-bar scale), and a
// profile menu. Sits alongside the rail outside the scroll container so it
// never scrolls with page content — mirrors AdminTopBar exactly, only
// swapping the plain bell for the shared NotificationsBell.
export function ExecutiveTopBar() {
  const { adminName, adminRole, setConfirmLogout } = useAuth()
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

  // Operational signals surfaced as notification entries for the shared bell.
  const notifications = useMemo<NotificationEntry[]>(() => {
    const items: NotificationEntry[] = []

    events
      .filter((e) => e.status === 'Initialized' || e.status === 'On Hold')
      .slice(0, 5)
      .forEach((e) => {
        items.push({
          id: `ev-${e.id}`,
          icon: CalendarClock,
          color: 'text-sky-500',
          text: `"${e.title}" is awaiting confirmation.`,
          time: 'Event Operations',
          unread: true,
          onClick: () => navigate('registry', { kind: 'view-event', payload: { id: e.id } }),
        })
      })

    damageExceptions
      .filter((d) => d.status === 'Pending Verdict' || d.status === 'Held for Audit' || d.status === 'Pending Second Sign-off')
      .slice(0, 5)
      .forEach((d) => {
        items.push({
          id: `dm-${d.id}`,
          icon: ShieldAlert,
          color: 'text-rose-500',
          text: `Damage report ${d.logId || d.id.slice(0, 8)} for ${d.assetName} needs a verdict.`,
          time: 'Damage Validation',
          unread: true,
          onClick: () => navigate('damage', { kind: 'review-damage', payload: { id: d.id } }),
        })
      })

    inventory
      .filter((i) => i.status === 'Critical Deficit' || i.status === 'Low Stock')
      .slice(0, 5)
      .forEach((i) => {
        items.push({
          id: `rs-${i.id}`,
          icon: PackageSearch,
          color: 'text-amber-500',
          text: `${i.name} (${i.assetId || i.id}) is running low on stock.`,
          time: 'Asset Inventory',
          unread: false,
          onClick: () => {
            setSelectedAsset({
              id: i.id,
              name: i.name,
              description: i.description ?? i.category,
              assetId: i.assetId || i.id,
              dateAdded: i.dateAdded ?? new Date().toLocaleDateString(),
              store: i.store ?? '—',
              representative: i.representative ?? '—',
              contact: i.contact ?? '—',
              height: i.height ?? '0',
              width: i.width ?? '0',
              weight: i.weight ?? '0',
              category: i.category,
              tier: 'Standard',
              fragile: i.fragile ?? false,
              quantity: i.stock,
              unit: i.unit ?? 'pcs',
              cost: i.cost ?? 0,
              costPerUnit: i.costPerUnit ?? 0,
              image: i.image,
            })
          },
        })
      })

    return items
  }, [events, damageExceptions, inventory, navigate])

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-5 sm:px-8">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:text-xs sm:tracking-[0.15em]">
        {dateLabel} <span className="mx-1 text-border">|</span> {timeLabel}
      </p>

      <div className="flex items-center gap-2">
        <NotificationsBell notifications={notifications} size="md" />

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
                  onClick={toggle}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-card-foreground transition-colors hover:bg-accent"
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

