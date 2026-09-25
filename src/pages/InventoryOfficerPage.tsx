import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Truck,
  UserCircle2,
  Warehouse,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  inventoryOps,
  useInventoryOps,
  type OpsEventItem,
  type OpsInventoryItem,
  type OpsOrder,
  type TrackingStatus,
} from '@/lib/inventory-ops'
import { OfflineBanner } from '@/components/OfflineBanner'
import {
  PwaBadge,
  PwaBottomNav,
  PwaButton,
  PwaCard,
  PwaEmptyState,
  PwaErrorState,
  PwaHeader,
  PwaLoadingState,
  PwaModal,
  type PwaNavItem,
} from '@/components/pwa'
import { cn } from '@/lib/utils'

// ----------------------------------------------------------------------
// Types & Constants
// ----------------------------------------------------------------------

type PrimaryTab = 'home' | 'stock' | 'tracking' | 'account'
type StockSubTab = 'items' | 'orders'
type TrackingSubTab = 'batches' | 'items'

const CALENDAR_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const TRACKING_STAGES: TrackingStatus[] = [
  'Warehouse',
  'Loaded',
  'In Transit',
  'On Site',
  'Returned',
]

function dateLabel(date: string) {
  if (!date) return 'Unscheduled'
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function getTrackingBadgeClass(status: TrackingStatus | string) {
  switch (status) {
    case 'Warehouse':
      return 'bg-muted/70 text-muted-foreground border-border'
    case 'Loaded':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
    case 'In Transit':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
    case 'On Site':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
    case 'Returned':
      return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
    default:
      return 'bg-muted/60 text-muted-foreground border-border'
  }
}

function getOrderStatusBadgeClass(status: string) {
  switch (status.toLowerCase()) {
    case 'received':
    case 'fulfilled':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
    case 'approved':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
    case 'submitted':
    case 'pending':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
    default:
      return 'bg-muted/60 text-muted-foreground border-border'
  }
}

// ----------------------------------------------------------------------
// Main Page Component
// ----------------------------------------------------------------------

export function InventoryOfficerPage() {
  const { adminName, adminEmail, logout } = useAuth()
  const ops = useInventoryOps()

  // Navigation State
  const [tab, setTab] = useState<PrimaryTab>('home')
  const [stockSubTab, setStockSubTab] = useState<StockSubTab>('items')
  const [trackingSubTab, setTrackingSubTab] = useState<TrackingSubTab>('batches')

  // Modals & Selection State
  const [selectedItem, setSelectedItem] = useState<OpsInventoryItem | null>(null)
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false)
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false)

  // Filtering & Search
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [orderFilter, setOrderFilter] = useState<string>('all')
  const [trackingFilter, setTrackingFilter] = useState<string>('all')

  // Calendar State
  const [selectedDate, setSelectedDate] = useState('2026-08-20')
  const [toast, setToast] = useState('')

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 4500)
  }

  const handleRefetch = async () => {
    setIsError(false)
    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 200))
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    handleRefetch()
  }, [])

  // Derived Metrics
  const lowItems = useMemo(
    () => ops.inventory.filter((item) => item.status === 'Low Stock'),
    [ops.inventory]
  )
  const availableItems = useMemo(
    () => ops.inventory.filter((item) => item.status === 'Available'),
    [ops.inventory]
  )
  const openOrders = useMemo(
    () => ops.orders.filter((order) => order.status.toLowerCase() !== 'received'),
    [ops.orders]
  )
  const inTransitBatches = useMemo(
    () => ops.batches.filter((batch) => batch.status === 'In Transit'),
    [ops.batches]
  )

  const attentionCount = lowItems.length + openOrders.length

  // Bottom Navigation Configuration (Max 4 primary tabs)
  const navItems: readonly PwaNavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: LayoutDashboard,
      badgeCount: attentionCount > 0 ? attentionCount : undefined,
    },
    {
      id: 'stock',
      label: 'Stock',
      icon: Package,
      badgeCount: lowItems.length > 0 ? lowItems.length : undefined,
    },
    {
      id: 'tracking',
      label: 'Tracking',
      icon: Truck,
      badgeCount: inTransitBatches.length > 0 ? inTransitBatches.length : undefined,
    },
    {
      id: 'account',
      label: 'Account',
      icon: UserCircle2,
    },
  ]

  // Header Title Resolver
  const headerTitle = useMemo(() => {
    switch (tab) {
      case 'home':
        return 'Inventory Command'
      case 'stock':
        return stockSubTab === 'items' ? 'Stock Inventory' : 'Procurement Orders'
      case 'tracking':
        return trackingSubTab === 'batches' ? 'Dispatch Fleet' : 'Cargo Tracking'
      case 'account':
        return adminName || 'Inventory Officer'
      default:
        return 'Inventory Console'
    }
  }, [tab, stockSubTab, trackingSubTab, adminName])

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Offline Status Banner */}
      <OfflineBanner />

      {/* Modern PWA Station Header */}
      <PwaHeader
        title={headerTitle}
        subtitle="LUMIÈRE WAREHOUSE · Depot & Staging"
        roleName="Inventory Officer"
        subRole="Inventory"
        icon={<Warehouse className="size-5 text-amber-600 dark:text-amber-400" />}
        actions={
          <button
            type="button"
            onClick={() => setTab('account')}
            aria-label="Open Inventory Account"
            className="flex size-10 items-center justify-center rounded-xl bg-amber-500 text-white font-serif text-xs font-bold shadow-sm transition-transform active:scale-95 cursor-pointer"
          >
            {(adminName || 'IO').slice(0, 2).toUpperCase()}
          </button>
        }
      />

      {/* Main Content Viewport */}
      <main className="mx-auto w-full max-w-xl px-4 pt-3 sm:px-6">
        {isError ? (
          <PwaErrorState
            title="Inventory Operations Offline"
            message="Unable to communicate with the central inventory store. Please verify network access and retry."
            onRetry={handleRefetch}
          />
        ) : isLoading ? (
          <PwaLoadingState message="Syncing warehouse stock & dispatch fleet..." />
        ) : (
          <>
            {/* 1. Home Command Center */}
            {tab === 'home' && (
              <HomeTab
                ops={ops}
                lowItems={lowItems}
                inTransitBatches={inTransitBatches}
                openOrders={openOrders}
                availableCount={availableItems.length}
                onOpenAlerts={() => setIsAlertModalOpen(true)}
                onNavigateStock={(sub) => {
                  setTab('stock')
                  setStockSubTab(sub)
                }}
                onNavigateTracking={(sub) => {
                  setTab('tracking')
                  setTrackingSubTab(sub)
                }}
                onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
                onOpenAccountSection={() => setTab('account')}
              />
            )}

            {/* 2. Stock Workspace (Inventory Items & Orders) */}
            {tab === 'stock' && (
              <StockTab
                items={ops.inventory}
                orders={ops.orders}
                activeSubTab={stockSubTab}
                onChangeSubTab={setStockSubTab}
                search={search}
                setSearch={setSearch}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                orderFilter={orderFilter}
                setOrderFilter={setOrderFilter}
                onOpenItem={setSelectedItem}
                onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
              />
            )}

            {/* 3. Tracking & Dispatch (Batches & Items) */}
            {tab === 'tracking' && (
              <TrackingTab
                batches={ops.batches}
                items={ops.eventItems}
                activeSubTab={trackingSubTab}
                onChangeSubTab={setTrackingSubTab}
                trackingFilter={trackingFilter}
                setTrackingFilter={setTrackingFilter}
                onNotify={notify}
              />
            )}

            {/* 4. Account, Schedule Calendar & Operations Log */}
            {tab === 'account' && (
              <AccountTab
                name={adminName || 'Danielle Morales'}
                email={adminEmail || 'inventory@lumiere.com'}
                ops={ops}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                onNotify={notify}
                onLogout={logout}
              />
            )}
          </>
        )}
      </main>

      {/* Shared Mobile Bottom Navigation */}
      <PwaBottomNav
        items={navItems}
        activeId={tab}
        onSelect={(id) => setTab(id as PrimaryTab)}
        ariaLabel="Inventory Officer navigation"
      />

      {/* Item Stock Adjustment & Inspection Modal */}
      {selectedItem && (
        <InventoryDetailModal
          item={ops.inventory.find((i) => i.id === selectedItem.id) ?? selectedItem}
          onClose={() => setSelectedItem(null)}
          onNotify={notify}
        />
      )}

      {/* Urgent Operations Alert Feed Modal */}
      <OperationsAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        lowItems={lowItems}
        inTransitBatches={inTransitBatches}
        onNavigateStock={() => {
          setIsAlertModalOpen(false)
          setTab('stock')
          setStockSubTab('items')
        }}
        onNavigateTracking={() => {
          setIsAlertModalOpen(false)
          setTab('tracking')
          setTrackingSubTab('batches')
        }}
      />

      {/* New Purchase Order Creation Modal */}
      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onNotify={notify}
      />

      {/* Toast Notification HUD */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl bg-foreground px-4 py-3 text-center text-xs font-semibold text-background shadow-xl border border-border animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {toast}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------
// 1. Home Command Center Tab
// ----------------------------------------------------------------------

interface HomeTabProps {
  ops: ReturnType<typeof useInventoryOps>
  lowItems: OpsInventoryItem[]
  inTransitBatches: ReturnType<typeof useInventoryOps>['batches']
  openOrders: OpsOrder[]
  availableCount: number
  onOpenAlerts: () => void
  onNavigateStock: (sub: StockSubTab) => void
  onNavigateTracking: (sub: TrackingSubTab) => void
  onOpenNewOrder: () => void
  onOpenAccountSection: () => void
}

function HomeTab({
  ops,
  lowItems,
  inTransitBatches,
  openOrders,
  availableCount,
  onOpenAlerts,
  onNavigateStock,
  onNavigateTracking,
  onOpenNewOrder,
  onOpenAccountSection,
}: HomeTabProps) {
  const lowCount = lowItems.length
  const inTransitCount = inTransitBatches.length
  const hasAlerts = lowCount > 0 || inTransitCount > 0

  return (
    <div className="space-y-4">
      {/* Operations Alert Banner */}
      <PwaCard
        className={cn(
          'transition-all',
          hasAlerts
            ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card'
            : 'border-border'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-xl',
                hasAlerts
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                  : 'bg-primary/10 text-primary'
              )}
            >
              <AlertTriangle className="size-4" />
            </span>
            <div>
              <h2 className="font-serif text-sm font-bold text-foreground">
                Operations Alerts Feed
              </h2>
              <p className="text-[0.7rem] text-muted-foreground">
                Warehouse thresholds & live logistics
              </p>
            </div>
          </div>
          <PwaButton
            onClick={onOpenAlerts}
            variant="outline"
            size="sm"
            className="text-[0.65rem] border-primary/30 text-primary hover:bg-primary/10"
            icon={<ChevronRight className="size-3" />}
          >
            Review ({lowCount + inTransitCount})
          </PwaButton>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-border/60 pt-2.5">
          <div className="rounded-xl bg-card/60 p-2.5 border border-border/40">
            <span className="text-[0.65rem] text-muted-foreground uppercase font-bold tracking-wider block">
              Low Stock Alert
            </span>
            <span className="font-serif text-base font-bold text-amber-600 dark:text-amber-400">
              {lowCount} item{lowCount === 1 ? '' : 's'}
            </span>
            <span className="block text-[0.65rem] text-muted-foreground mt-0.5">
              Require replenishment review
            </span>
          </div>

          <div className="rounded-xl bg-card/60 p-2.5 border border-border/40">
            <span className="text-[0.65rem] text-muted-foreground uppercase font-bold tracking-wider block">
              In-Transit Fleet
            </span>
            <span className="font-serif text-base font-bold text-sky-600 dark:text-sky-400">
              {inTransitCount} batch{inTransitCount === 1 ? '' : 'es'}
            </span>
            <span className="block text-[0.65rem] text-muted-foreground mt-0.5">
              Live truck dispatches
            </span>
          </div>
        </div>
      </PwaCard>

      {/* Operational Metric Cards Strip */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <PwaCard className="p-3 text-center">
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block">
            Available
          </span>
          <p className="mt-1 font-serif text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {availableCount}
          </p>
          <span className="text-[0.6rem] text-muted-foreground">Ready for staging</span>
        </PwaCard>

        <PwaCard className="p-3 text-center">
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block">
            Low Stock
          </span>
          <p className="mt-1 font-serif text-xl font-bold text-amber-600 dark:text-amber-400">
            {lowCount}
          </p>
          <span className="text-[0.6rem] text-muted-foreground">Below threshold</span>
        </PwaCard>

        <PwaCard className="p-3 text-center">
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block">
            Open Orders
          </span>
          <p className="mt-1 font-serif text-xl font-bold text-sky-600 dark:text-sky-400">
            {openOrders.length}
          </p>
          <span className="text-[0.6rem] text-muted-foreground">Awaiting delivery</span>
        </PwaCard>

        <PwaCard className="p-3 text-center">
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block">
            In Transit
          </span>
          <p className="mt-1 font-serif text-xl font-bold text-purple-600 dark:text-purple-400">
            {inTransitCount}
          </p>
          <span className="text-[0.6rem] text-muted-foreground">Fleet in motion</span>
        </PwaCard>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onNavigateStock('items')}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center transition-all hover:border-primary/50 hover:bg-accent/40 active:scale-98 cursor-pointer"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Package className="size-4" />
          </span>
          <span className="text-[0.7rem] font-bold text-foreground">Stock Catalog</span>
          <span className="text-[0.6rem] text-muted-foreground">Counts &amp; SKUs</span>
        </button>

        <button
          type="button"
          onClick={onOpenNewOrder}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center transition-all hover:border-primary/50 hover:bg-accent/40 active:scale-98 cursor-pointer"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Plus className="size-4" />
          </span>
          <span className="text-[0.7rem] font-bold text-foreground">New Order</span>
          <span className="text-[0.6rem] text-muted-foreground">Procurement</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTracking('batches')}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center transition-all hover:border-primary/50 hover:bg-accent/40 active:scale-98 cursor-pointer"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <Truck className="size-4" />
          </span>
          <span className="text-[0.7rem] font-bold text-foreground">Dispatch Fleet</span>
          <span className="text-[0.6rem] text-muted-foreground">Truck Batches</span>
        </button>
      </div>

      {/* Upcoming Orders Due */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-4 text-primary" />
            <h3 className="font-serif text-sm font-semibold tracking-tight uppercase tracking-[0.14em] text-foreground">
              Procurement Schedule
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateStock('orders')}
            className="text-[0.65rem] font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer"
          >
            All Orders ({ops.orders.length}) →
          </button>
        </div>

        {ops.orders.slice(0, 3).map((order) => (
          <PwaCard
            key={order.id}
            className="cursor-pointer transition-all hover:border-primary/40"
          >
            <div
              onClick={() => onNavigateStock('orders')}
              className="flex items-start justify-between gap-3"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onNavigateStock('orders')
                }
              }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-serif text-sm font-bold text-foreground truncate">
                    {order.itemName}
                  </h4>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider shrink-0',
                      getOrderStatusBadgeClass(order.status)
                    )}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  Vendor: {order.vendor} · Event: {order.eventName}
                </p>
                <div className="mt-2 flex items-center gap-3 text-[0.65rem] text-muted-foreground border-t border-border/50 pt-1.5 font-mono">
                  <span>
                    Received: {order.received}/{order.quantity}
                  </span>
                  <span>·</span>
                  <span>Due: {dateLabel(order.deliveryDate)}</span>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground shrink-0 mt-1" />
            </div>
          </PwaCard>
        ))}
      </div>

      {/* Active Fleet Dispatches Snapshot */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Truck className="size-4 text-primary" />
            <h3 className="font-serif text-sm font-semibold tracking-tight uppercase tracking-[0.14em] text-foreground">
              Live Fleet Dispatches
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTracking('batches')}
            className="text-[0.65rem] font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer"
          >
            View Fleet ({ops.batches.length}) →
          </button>
        </div>

        {ops.batches.slice(0, 2).map((batch) => (
          <PwaCard
            key={batch.id}
            className="cursor-pointer transition-all hover:border-primary/40"
          >
            <div
              onClick={() => onNavigateTracking('batches')}
              className="flex items-start justify-between gap-3"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onNavigateTracking('batches')
                }
              }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-serif text-sm font-bold text-foreground truncate">
                    {batch.truck}
                  </h4>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider shrink-0',
                      getTrackingBadgeClass(batch.status)
                    )}
                  >
                    {batch.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  Event: {batch.eventName} · Driver: {batch.driver}
                </p>
                <div className="mt-2 flex items-center gap-3 text-[0.65rem] text-muted-foreground border-t border-border/50 pt-1.5 font-mono">
                  <span>{batch.itemCount} allocated items</span>
                  <span>·</span>
                  <span>Date: {dateLabel(batch.scheduledDate)}</span>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground shrink-0 mt-1" />
            </div>
          </PwaCard>
        ))}
      </div>

      {/* Operations Activity Snapshot */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <FileText className="size-4 text-primary" />
            <h3 className="font-serif text-sm font-semibold tracking-tight uppercase tracking-[0.14em] text-foreground">
              Recent Activity Feed
            </h3>
          </div>
          <button
            type="button"
            onClick={onOpenAccountSection}
            className="text-[0.65rem] font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer"
          >
            Audit Log ({ops.activity.length}) →
          </button>
        </div>

        {ops.activity.slice(0, 3).map((act) => (
          <PwaCard key={act.id} className="p-3">
            <p className="text-xs text-foreground font-medium">{act.message}</p>
            <div className="mt-1.5 flex items-center justify-between text-[0.65rem] text-muted-foreground/80 border-t border-border/40 pt-1 font-mono">
              <span>{act.at}</span>
              <span className="uppercase font-semibold text-primary/80">{act.source}</span>
            </div>
          </PwaCard>
        ))}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------
// 2. Stock Workspace Tab (Items & Orders Segmented)
// ----------------------------------------------------------------------

interface StockTabProps {
  items: OpsInventoryItem[]
  orders: OpsOrder[]
  activeSubTab: StockSubTab
  onChangeSubTab: (sub: StockSubTab) => void
  search: string
  setSearch: (value: string) => void
  selectedCategory: string
  setSelectedCategory: (cat: string) => void
  orderFilter: string
  setOrderFilter: (status: string) => void
  onOpenItem: (item: OpsInventoryItem) => void
  onOpenNewOrder: () => void
}

function StockTab({
  items,
  orders,
  activeSubTab,
  onChangeSubTab,
  search,
  setSearch,
  selectedCategory,
  setSelectedCategory,
  orderFilter,
  setOrderFilter,
  onOpenItem,
  onOpenNewOrder,
}: StockTabProps) {
  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => {
      if (item.category) set.add(item.category)
    })
    return ['all', ...Array.from(set)]
  }, [items])

  // Filtered Items
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim()
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [items, search, selectedCategory])

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (orderFilter === 'all') return true
      return order.status.toLowerCase() === orderFilter.toLowerCase()
    })
  }, [orders, orderFilter])

  return (
    <div className="space-y-4">
      {/* Sub-Tab Segmented Selector */}
      <div className="flex rounded-2xl border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => onChangeSubTab('items')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold uppercase tracking-[0.14em] transition-all cursor-pointer',
            activeSubTab === 'items'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Package className="size-3.5" />
          <span>Stock Items ({items.length})</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeSubTab('orders')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold uppercase tracking-[0.14em] transition-all cursor-pointer',
            activeSubTab === 'orders'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <ClipboardList className="size-3.5" />
          <span>Orders ({orders.length})</span>
        </button>
      </div>

      {/* Sub-Tab 1: Inventory Items */}
      {activeSubTab === 'items' && (
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU, or category..."
              className="w-full rounded-2xl border border-border bg-card py-2.5 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider transition-colors cursor-pointer',
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Items List */}
          {filteredItems.length === 0 ? (
            <PwaEmptyState
              title="No Stock Items Found"
              description="No inventory records matched your search query or category filter."
              icon={<Package className="size-6 text-muted-foreground" />}
              action={{
                label: 'Reset Filters',
                onClick: () => {
                  setSearch('')
                  setSelectedCategory('all')
                },
              }}
            />
          ) : (
            <div className="space-y-2.5">
              {filteredItems.map((item) => {
                const freeCount = item.total - item.reserved
                const isLow = item.status === 'Low Stock'

                return (
                  <PwaCard
                    key={item.id}
                    className="cursor-pointer transition-all hover:border-primary/40 active:scale-[0.99]"
                  >
                    <div
                      onClick={() => onOpenItem(item)}
                      className="flex items-center gap-3.5"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onOpenItem(item)
                        }
                      }}
                    >
                      {/* Image / Thumbnail */}
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-secondary/30">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <Package className="size-7 text-muted-foreground/60" />
                          </div>
                        )}
                        {isLow && (
                          <span
                            title="Low Stock"
                            className="absolute bottom-1 right-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm"
                          >
                            <AlertTriangle className="size-2.5" />
                          </span>
                        )}
                      </div>

                      {/* Detail Body */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-serif text-sm font-bold text-foreground truncate">
                            {item.name}
                          </h4>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider shrink-0 border',
                              item.status === 'Available'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            )}
                          >
                            {item.status}
                          </span>
                        </div>

                        <p className="text-[0.7rem] text-muted-foreground mt-0.5">
                          SKU: <span className="font-mono text-foreground/80">{item.sku}</span> · {item.category}
                        </p>

                        <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-1.5 text-[0.7rem]">
                          <span className="text-foreground">
                            Free:{' '}
                            <strong
                              className={cn(
                                'font-mono text-xs',
                                freeCount <= 2
                                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                                  : 'text-foreground'
                              )}
                            >
                              {freeCount} {item.unit}
                            </strong>
                          </span>
                          <span className="text-muted-foreground text-[0.65rem]">
                            Total: {item.total} | Res: {item.reserved}
                          </span>
                        </div>
                      </div>
                    </div>
                  </PwaCard>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Orders & Procurement */}
      {activeSubTab === 'orders' && (
        <div className="space-y-3">
          {/* Action Header */}
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="font-serif text-sm font-bold text-foreground">
                Purchase Requisitions
              </h3>
              <p className="text-[0.65rem] text-muted-foreground">
                Track incoming stock from vendors
              </p>
            </div>
            <PwaButton
              onClick={onOpenNewOrder}
              size="sm"
              icon={<Plus className="size-3.5" />}
              className="px-3"
            >
              New Order
            </PwaButton>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {['all', 'submitted', 'approved', 'received'].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setOrderFilter(filter)}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider transition-colors cursor-pointer',
                  orderFilter === filter
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <PwaEmptyState
              title="No Orders Found"
              description="No purchase requisitions matched the selected order filter."
              icon={<ClipboardList className="size-6 text-muted-foreground" />}
              action={{
                label: 'Create Purchase Order',
                onClick: onOpenNewOrder,
              }}
            />
          ) : (
            <div className="space-y-2.5">
              {filteredOrders.map((order) => {
                const percent = Math.min(
                  100,
                  Math.round((order.received / (order.quantity || 1)) * 100)
                )

                return (
                  <PwaCard key={order.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif text-sm font-bold text-foreground truncate">
                            {order.itemName}
                          </h4>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider shrink-0',
                              getOrderStatusBadgeClass(order.status)
                            )}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          Vendor: <strong>{order.vendor}</strong> · Event: {order.eventName}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar & Fulfillment Info */}
                    <div className="mt-3 space-y-1.5 border-t border-border/50 pt-2.5">
                      <div className="flex items-center justify-between text-[0.65rem] font-medium text-muted-foreground">
                        <span>
                          Received: {order.received} of {order.quantity} units
                        </span>
                        <span className="font-mono text-foreground">{percent}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all duration-300 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1 text-[0.65rem] text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono">
                          <CalendarDays className="size-3 text-primary" />
                          Due: {dateLabel(order.deliveryDate)}
                        </span>
                        <span className="font-mono text-[0.6rem] uppercase">
                          ID: {order.id}
                        </span>
                      </div>
                    </div>
                  </PwaCard>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------
// 3. Tracking Tab (Batches & Items)
// ----------------------------------------------------------------------

interface TrackingTabProps {
  batches: ReturnType<typeof useInventoryOps>['batches']
  items: OpsEventItem[]
  activeSubTab: TrackingSubTab
  onChangeSubTab: (sub: TrackingSubTab) => void
  trackingFilter: string
  setTrackingFilter: (status: string) => void
  onNotify: (message: string) => void
}

function TrackingTab({
  batches,
  items,
  activeSubTab,
  onChangeSubTab,
  trackingFilter,
  setTrackingFilter,
  onNotify,
}: TrackingTabProps) {
  // Filtered Event Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (trackingFilter === 'all') return true
      return item.tracked === trackingFilter
    })
  }, [items, trackingFilter])

  return (
    <div className="space-y-4">
      {/* Sub-Tab Segmented Selector */}
      <div className="flex rounded-2xl border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => onChangeSubTab('batches')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold uppercase tracking-[0.14em] transition-all cursor-pointer',
            activeSubTab === 'batches'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Truck className="size-3.5" />
          <span>Truck Batches ({batches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeSubTab('items')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold uppercase tracking-[0.14em] transition-all cursor-pointer',
            activeSubTab === 'items'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Layers className="size-3.5" />
          <span>Cargo Items ({items.length})</span>
        </button>
      </div>

      {/* Sub-Tab 1: Truck Batches */}
      {activeSubTab === 'batches' && (
        <div className="space-y-3">
          <div className="px-1">
            <h3 className="font-serif text-sm font-bold text-foreground">
              Dispatch Truck Batches
            </h3>
            <p className="text-[0.65rem] text-muted-foreground">
              Fleet vehicles and scheduled event loading manifests
            </p>
          </div>

          {batches.length === 0 ? (
            <PwaEmptyState
              title="No Fleet Batches"
              description="No vehicle dispatch batches are scheduled for warehouse release."
              icon={<Truck className="size-6 text-muted-foreground" />}
            />
          ) : (
            <div className="space-y-2.5">
              {batches.map((batch) => (
                <PwaCard key={batch.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 mt-0.5">
                        <Truck className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-serif text-sm font-bold text-foreground">
                          {batch.truck}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Event: <strong className="text-foreground">{batch.eventName}</strong>
                        </p>
                        <p className="text-[0.7rem] text-muted-foreground">
                          Driver: {batch.driver}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wider shrink-0',
                        getTrackingBadgeClass(batch.status)
                      )}
                    >
                      {batch.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[0.65rem] text-muted-foreground font-mono">
                    <span>{batch.itemCount} cargo items allocated</span>
                    <span>Scheduled: {dateLabel(batch.scheduledDate)}</span>
                  </div>
                </PwaCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Cargo Event Items Tracking */}
      {activeSubTab === 'items' && (
        <div className="space-y-3">
          <div className="px-1">
            <h3 className="font-serif text-sm font-bold text-foreground">
              Event Cargo Tracking &amp; Batch Assignment
            </h3>
            <p className="text-[0.65rem] text-muted-foreground">
              Assign staging items to truck batches and update live custody stages
            </p>
          </div>

          {/* Tracking Status Filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {['all', ...TRACKING_STAGES].map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => setTrackingFilter(stage)}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider transition-colors cursor-pointer',
                  trackingFilter === stage
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {stage}
              </button>
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <PwaEmptyState
              title="No Cargo Items Found"
              description="No event staging items match the selected tracking filter."
              icon={<Layers className="size-6 text-muted-foreground" />}
              action={{
                label: 'Show All Cargo',
                onClick: () => setTrackingFilter('all'),
              }}
            />
          ) : (
            <div className="space-y-2.5">
              {filteredItems.map((item) => (
                <PwaCard key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-serif text-sm font-bold text-foreground">
                        {item.itemName}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Event: <strong className="text-foreground">{item.eventName}</strong>
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[0.7rem] text-muted-foreground font-mono">
                        <span>
                          Allocated: {item.allocated} / {item.requested}
                        </span>
                        {item.batchId && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[0.6rem] font-bold text-foreground">
                            Batch: {item.batchId}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider shrink-0',
                        getTrackingBadgeClass(item.tracked)
                      )}
                    >
                      {item.tracked}
                    </span>
                  </div>

                  {/* Interactive Controls: Tracking Stage & Batch Assignment */}
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/50 pt-2.5">
                    <div>
                      <label className="text-[0.6rem] uppercase tracking-wider font-bold text-muted-foreground block mb-1">
                        Tracking Status
                      </label>
                      <select
                        value={item.tracked}
                        onChange={(e) => {
                          inventoryOps.updateTracking(item.id, e.target.value as TrackingStatus)
                          onNotify(`Tracking updated to "${e.target.value}".`)
                        }}
                        className="w-full rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        {TRACKING_STAGES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[0.6rem] uppercase tracking-wider font-bold text-muted-foreground block mb-1">
                        Truck Batch
                      </label>
                      <select
                        value={item.batchId ?? ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            inventoryOps.assignBatch(item.id, e.target.value)
                            onNotify(`Assigned to truck batch "${e.target.value}".`)
                          }
                        }}
                        className="w-full rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="">Assign batch...</option>
                        {batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.truck} ({batch.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </PwaCard>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------
// 4. Account, Schedule Calendar & Operations Log Tab
// ----------------------------------------------------------------------

interface AccountTabProps {
  name: string
  email: string
  ops: ReturnType<typeof useInventoryOps>
  selectedDate: string
  setSelectedDate: (date: string) => void
  onNotify: (message: string) => void
  onLogout: () => void
}

function AccountTab({
  name,
  email,
  ops,
  selectedDate,
  setSelectedDate,
  onNotify,
  onLogout,
}: AccountTabProps) {
  const [activeTool, setActiveTool] = useState<'calendar' | 'activity'>('calendar')
  const [noteDraft, setNoteDraft] = useState(ops.notes[selectedDate] ?? '')

  useEffect(() => {
    setNoteDraft(ops.notes[selectedDate] ?? '')
  }, [selectedDate, ops.notes])

  // Calendar dates with active schedules
  const hasSchedule = useMemo(() => {
    const dates = new Set<string>()
    ops.orders.forEach((o) => {
      if (o.deliveryDate) dates.add(o.deliveryDate)
    })
    ops.batches.forEach((b) => {
      if (b.scheduledDate) dates.add(b.scheduledDate)
    })
    return dates
  }, [ops.orders, ops.batches])

  const ordersForDate = ops.orders.filter((o) => o.deliveryDate === selectedDate)
  const batchesForDate = ops.batches.filter((b) => b.scheduledDate === selectedDate)

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <PwaCard>
        <div className="flex items-center gap-3.5">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white font-serif text-lg font-bold shadow-md">
            {(name || 'IO').slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-lg font-bold text-foreground truncate">{name}</h3>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <PwaBadge variant="subrole" subRole="Inventory" label="Inventory Officer" />
              <PwaBadge variant="neutral" label="Warehouse Operations" />
            </div>
          </div>
        </div>
      </PwaCard>

      {/* Operational Scope & Authority Card */}
      <PwaCard
        title="Inventory Operations Authority"
        subtitle="Stock controls, procurement & dispatch custody"
      >
        <div className="space-y-2.5 text-xs">
          <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-2.5">
            <ShieldCheck className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Safety Stock &amp; Cycle Thresholds</p>
              <p className="text-muted-foreground text-[0.7rem] mt-0.5">
                Authorized to set buffer stock levels, trigger replenishment alerts, and adjust counts.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-2.5">
            <Warehouse className="size-4 shrink-0 text-primary mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Vendor Procurement Requisitions</p>
              <p className="text-muted-foreground text-[0.7rem] mt-0.5">
                Generates purchase orders, tracks vendor delivery dates, and verifies goods received.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-2.5">
            <Truck className="size-4 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Logistics Fleet &amp; Cargo Custody</p>
              <p className="text-muted-foreground text-[0.7rem] mt-0.5">
                Oversees truck batch allocations, site deliveries, and reverse-logistics returns.
              </p>
            </div>
          </div>
        </div>
      </PwaCard>

      {/* Secondary Operational Tools Segment */}
      <div className="flex rounded-2xl border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setActiveTool('calendar')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold uppercase tracking-[0.14em] transition-all cursor-pointer',
            activeTool === 'calendar'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <CalendarDays className="size-3.5" />
          <span>Warehouse Calendar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('activity')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold uppercase tracking-[0.14em] transition-all cursor-pointer',
            activeTool === 'activity'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FileText className="size-3.5" />
          <span>Audit Log ({ops.activity.length})</span>
        </button>
      </div>

      {/* Secondary Tool 1: Interactive Warehouse Calendar */}
      {activeTool === 'calendar' && (
        <div className="space-y-3">
          <PwaCard
            title="August 2026 Schedule"
            subtitle="Procurement deliveries, dispatch batches & personal notes"
          >
            {/* Calendar Grid */}
            <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs">
              <div className="col-span-7 grid grid-cols-7 text-[0.65rem] font-bold text-muted-foreground uppercase pb-1 border-b border-border/50">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <span key={`${day}-${idx}`}>{day}</span>
                ))}
              </div>

              {/* Leading blanks for Aug 2026 (Starts on Saturday) */}
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />

              {CALENDAR_DAYS.map((day) => {
                const date = `2026-08-${String(day).padStart(2, '0')}`
                const isActive = date === selectedDate
                const isScheduled = hasSchedule.has(date)
                const hasNote = Boolean(ops.notes[date])

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(date)
                      setNoteDraft(ops.notes[date] ?? '')
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center rounded-xl p-1.5 transition-all text-xs font-medium cursor-pointer',
                      isActive
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <span>{day}</span>
                    <span className="mt-0.5 flex h-1.5 items-center justify-center gap-0.5">
                      {isScheduled && (
                        <span
                          className={cn(
                            'size-1 rounded-full',
                            isActive ? 'bg-primary-foreground' : 'bg-primary'
                          )}
                        />
                      )}
                      {hasNote && (
                        <span
                          className={cn(
                            'size-1 rounded-full border',
                            isActive
                              ? 'border-primary-foreground bg-primary-foreground'
                              : 'border-amber-500 bg-amber-500'
                          )}
                        />
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </PwaCard>

          {/* Schedule for Selected Date */}
          <PwaCard
            title={`Schedule for ${dateLabel(selectedDate)}`}
            subtitle="Deliveries, fleet dispatches & memos"
          >
            <div className="space-y-2.5">
              {ordersForDate.length === 0 && batchesForDate.length === 0 && (
                <p className="text-xs text-muted-foreground italic py-1">
                  No orders or dispatches scheduled for this date.
                </p>
              )}

              {ordersForDate.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5 text-xs"
                >
                  <div>
                    <p className="font-bold text-foreground">
                      Order Delivery: {order.itemName}
                    </p>
                    <p className="text-[0.7rem] text-muted-foreground">
                      Vendor: {order.vendor} · {order.received}/{order.quantity} received
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider',
                      getOrderStatusBadgeClass(order.status)
                    )}
                  >
                    {order.status}
                  </span>
                </div>
              ))}

              {batchesForDate.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5 text-xs"
                >
                  <div>
                    <p className="font-bold text-foreground">
                      Dispatch: {batch.eventName}
                    </p>
                    <p className="text-[0.7rem] text-muted-foreground">
                      Truck: {batch.truck} · Driver: {batch.driver} ({batch.itemCount} items)
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider',
                      getTrackingBadgeClass(batch.status)
                    )}
                  >
                    {batch.status}
                  </span>
                </div>
              ))}

              {/* Personal Notes Memo */}
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <label className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block">
                  Date Memo / Warehouse Check
                </label>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={2}
                  placeholder="Record warehouse check, calls, or dock notes..."
                  className="w-full rounded-xl border border-border bg-card p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <PwaButton
                  size="sm"
                  onClick={() => {
                    inventoryOps.saveNote(selectedDate, noteDraft)
                    onNotify(`Note saved for ${dateLabel(selectedDate)}.`)
                  }}
                  className="w-full"
                  icon={<Check className="size-3.5" />}
                >
                  Save Date Note
                </PwaButton>
              </div>
            </div>
          </PwaCard>
        </div>
      )}

      {/* Secondary Tool 2: Operations Activity Audit Log */}
      {activeTool === 'activity' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-serif text-sm font-semibold tracking-tight uppercase tracking-[0.14em] text-foreground">
              Operations Activity Log
            </h3>
            <span className="text-[0.625rem] text-muted-foreground uppercase font-bold tracking-wider">
              Audited Logs
            </span>
          </div>

          {ops.activity.length === 0 ? (
            <PwaEmptyState
              title="No Activity Logged"
              description="Warehouse counts, orders, and dispatch events will be recorded here."
              icon={<FileText className="size-6 text-muted-foreground" />}
            />
          ) : (
            ops.activity.map((entry) => (
              <PwaCard key={entry.id} className="p-3.5 space-y-1.5">
                <p className="text-xs text-foreground font-medium leading-relaxed">
                  {entry.message}
                </p>
                <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground/80 border-t border-border/50 pt-1 font-mono">
                  <span>{entry.at}</span>
                  <span className="font-bold text-primary uppercase">{entry.source}</span>
                </div>
              </PwaCard>
            ))
          )}
        </div>
      )}

      {/* Sign Out Card */}
      <PwaCard>
        <PwaButton
          id="inventory-signout-btn"
          onClick={onLogout}
          variant="outline"
          size="lg"
          className="w-full text-destructive hover:bg-destructive/10 border-destructive/30"
          icon={<LogOut className="size-4" />}
        >
          Sign Out of Inventory Console
        </PwaButton>
      </PwaCard>
    </div>
  )
}

// ----------------------------------------------------------------------
// Modal 1: Inventory Detail & Stock Adjustment Modal
// ----------------------------------------------------------------------

interface InventoryDetailModalProps {
  item: OpsInventoryItem
  onClose: () => void
  onNotify: (message: string) => void
}

function InventoryDetailModal({ item, onClose, onNotify }: InventoryDetailModalProps) {
  const free = item.total - item.reserved

  return (
    <PwaModal
      isOpen={true}
      onClose={onClose}
      title={item.name}
      subtitle={`SKU: ${item.sku} · ${item.category}`}
      footer={
        <div className="flex gap-2">
          <PwaButton
            variant="outline"
            className="flex-1"
            icon={<Minus className="size-4" />}
            onClick={() => {
              inventoryOps.adjustStock(item.id, -1)
              onNotify(`Deducted 1 from ${item.name} count.`)
            }}
          >
            − 1 Count
          </PwaButton>

          <PwaButton
            variant="primary"
            className="flex-1"
            icon={<Plus className="size-4" />}
            onClick={() => {
              inventoryOps.adjustStock(item.id, 1)
              onNotify(`Added 1 to ${item.name} count.`)
            }}
          >
            + 1 Count
          </PwaButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Item Image */}
        <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border bg-secondary/30">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Package className="size-12 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Stock Breakdown Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-border bg-card p-3">
            <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground block">
              Total Stock
            </span>
            <p className="mt-1 font-serif text-lg font-bold text-foreground">
              {item.total}
            </p>
            <span className="text-[0.6rem] text-muted-foreground">{item.unit}</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground block">
              Reserved
            </span>
            <p className="mt-1 font-serif text-lg font-bold text-amber-600 dark:text-amber-400">
              {item.reserved}
            </p>
            <span className="text-[0.6rem] text-muted-foreground">In Staging</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground block">
              Free Stock
            </span>
            <p
              className={cn(
                'mt-1 font-serif text-lg font-bold',
                free <= 2
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              {free}
            </p>
            <span className="text-[0.6rem] text-muted-foreground">Available</span>
          </div>
        </div>

        {/* Condition & Operational Note */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground">Condition Inspection</span>
            <span className="font-mono text-muted-foreground">{item.condition}</span>
          </div>
          <p className="text-[0.7rem] text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
            Stock adjustments are checkpoint-synchronized with the shared Event Planner catalog
            and warehouse packing manifests.
          </p>
        </div>
      </div>
    </PwaModal>
  )
}

// ----------------------------------------------------------------------
// Modal 2: Operations Alert Feed Modal
// ----------------------------------------------------------------------

interface OperationsAlertModalProps {
  isOpen: boolean
  onClose: () => void
  lowItems: OpsInventoryItem[]
  inTransitBatches: ReturnType<typeof useInventoryOps>['batches']
  onNavigateStock: () => void
  onNavigateTracking: () => void
}

function OperationsAlertModal({
  isOpen,
  onClose,
  lowItems,
  inTransitBatches,
  onNavigateStock,
  onNavigateTracking,
}: OperationsAlertModalProps) {
  return (
    <PwaModal
      isOpen={isOpen}
      onClose={onClose}
      title="Inventory & Dispatch Alerts"
      subtitle="Threshold breaches and active transit manifests"
      footer={
        <PwaButton onClick={onClose} variant="secondary" className="w-full">
          Close Alert Feed
        </PwaButton>
      }
    >
      <div className="space-y-4">
        {/* Low Stock Items Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="size-4" />
              Low Stock Warnings ({lowItems.length})
            </h4>
            <button
              type="button"
              onClick={onNavigateStock}
              className="text-[0.65rem] font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer"
            >
              Manage Stock →
            </button>
          </div>

          {lowItems.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-1">
              No items are currently below safety thresholds.
            </p>
          ) : (
            lowItems.map((item) => {
              const free = item.total - item.reserved
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-foreground truncate">{item.name}</p>
                    <p className="text-[0.7rem] text-muted-foreground">
                      SKU: <span className="font-mono">{item.sku}</span> · {item.category}
                    </p>
                    <p className="text-[0.7rem] text-amber-700 dark:text-amber-300 font-medium mt-0.5">
                      Free: {free} {item.unit} (Total: {item.total} | Res: {item.reserved})
                    </p>
                  </div>
                  <PwaButton
                    size="sm"
                    variant="primary"
                    onClick={onNavigateStock}
                    className="shrink-0 text-[0.65rem] px-2.5"
                  >
                    Reorder
                  </PwaButton>
                </div>
              )
            })
          )}
        </div>

        {/* In-Transit Batches Section */}
        <div className="space-y-2 border-t border-border/80 pt-3">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-sm font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
              <Truck className="size-4" />
              In-Transit Fleet Batches ({inTransitBatches.length})
            </h4>
            <button
              type="button"
              onClick={onNavigateTracking}
              className="text-[0.65rem] font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer"
            >
              Track Fleet →
            </button>
          </div>

          {inTransitBatches.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-1">
              No truck batches are actively in transit.
            </p>
          ) : (
            inTransitBatches.map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3"
              >
                <div className="min-w-0">
                  <p className="font-bold text-xs text-foreground truncate">{batch.truck}</p>
                  <p className="text-[0.7rem] text-muted-foreground">
                    Event: <strong>{batch.eventName}</strong> · Driver: {batch.driver}
                  </p>
                  <p className="text-[0.7rem] text-sky-700 dark:text-sky-300 font-medium mt-0.5">
                    {batch.itemCount} items · Scheduled: {dateLabel(batch.scheduledDate)}
                  </p>
                </div>
                <PwaButton
                  size="sm"
                  variant="secondary"
                  onClick={onNavigateTracking}
                  className="shrink-0 text-[0.65rem] px-2.5"
                >
                  Track
                </PwaButton>
              </div>
            ))
          )}
        </div>
      </div>
    </PwaModal>
  )
}

// ----------------------------------------------------------------------
// Modal 3: New Purchase Order Creation Modal
// ----------------------------------------------------------------------

interface NewOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onNotify: (message: string) => void
}

function NewOrderModal({ isOpen, onClose, onNotify }: NewOrderModalProps) {
  const [itemName, setItemName] = useState('')
  const [vendor, setVendor] = useState('')
  const [eventName, setEventName] = useState('Founders Dinner')
  const [quantity, setQuantity] = useState(10)
  const [deliveryDate, setDeliveryDate] = useState('2026-08-28')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!itemName.trim() || !vendor.trim()) return

    inventoryOps.createOrder({
      itemName: itemName.trim(),
      vendor: vendor.trim(),
      eventName: eventName.trim() || 'General Inventory',
      quantity: Number(quantity) || 10,
      deliveryDate,
    })

    onNotify(`Purchase order for "${itemName}" created.`)
    setItemName('')
    setVendor('')
    setQuantity(10)
    onClose()
  }

  return (
    <PwaModal
      isOpen={isOpen}
      onClose={onClose}
      title="New Purchase Requisition"
      subtitle="Issue vendor order for material replenishment"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Item / Material Name *
          </label>
          <input
            required
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. Velvet Drapery 3m, Brass Stanchions"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Vendor / Supplier *
          </label>
          <input
            required
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="e.g. Manila Textile Works, Luxe Fabrications"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Quantity
            </label>
            <input
              required
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>

          <div>
            <label className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Delivery Date
            </label>
            <input
              required
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Associated Event
          </label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g. Founders Dinner, General Warehouse"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="pt-2 border-t border-border/80 flex gap-2">
          <PwaButton
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </PwaButton>
          <PwaButton
            type="submit"
            variant="primary"
            className="flex-1"
            icon={<Check className="size-4" />}
          >
            Create Order
          </PwaButton>
        </div>
      </form>
    </PwaModal>
  )
}
