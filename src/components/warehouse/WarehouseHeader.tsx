import { Building2, Search, Boxes, CheckCircle2, AlertTriangle, CircleDollarSign } from 'lucide-react'

interface WarehouseHeaderProps {
  search?: string
  onSearchChange?: (val: string) => void
  totalAssets?: number
  availableAssets?: number
  criticalDeficits?: number
  pendingProcurement?: number
}

export function WarehouseHeader({
  search = '',
  onSearchChange,
  totalAssets = 24,
  availableAssets = 14,
  criticalDeficits = 1,
  pendingProcurement = 37,
}: WarehouseHeaderProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Top Title & Search Bar Row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f3ede4] dark:bg-stone-800/90 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#8C6B4B] dark:text-amber-300 border border-[#e5dcd0] dark:border-stone-700 shadow-2xs mb-2.5">
            <Building2 className="size-3.5 text-[#8C6B4B] dark:text-amber-400" />
            <span>Warehouse Operations Manager</span>
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Warehouse Dashboard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Warehouse KPIs, ingress calendar, and upcoming events.
          </p>
        </div>

        {onSearchChange && (
          <div className="flex w-full items-center gap-2 rounded-xl border border-border/80 bg-card/90 px-3.5 py-2.5 text-sm shadow-2xs md:w-72">
            <Search className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search events"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="text-xs text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards Row (4 Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: TOTAL ASSETS */}
        <div className="group flex flex-col justify-between rounded-2xl border border-border/80 border-l-4 border-l-[#8C6B4B] bg-card p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Total Assets
            </span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#8C6B4B]/10 text-[#8C6B4B]">
              <Boxes className="size-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="font-serif text-3xl font-medium text-card-foreground">
              {totalAssets}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Registered inventory
            </p>
          </div>
        </div>

        {/* Card 2: AVAILABLE ASSETS */}
        <div className="group flex flex-col justify-between rounded-2xl border border-border/80 border-l-4 border-l-emerald-600 bg-card p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Available Assets
            </span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="font-serif text-3xl font-medium text-card-foreground">
              {availableAssets}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Ready for allocation
            </p>
          </div>
        </div>

        {/* Card 3: CRITICAL DEFICITS */}
        <div className="group flex flex-col justify-between rounded-2xl border border-rose-200/80 dark:border-rose-900/40 border-l-4 border-l-rose-600 bg-[#fbf5f4] dark:bg-rose-950/25 p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Critical Deficits
            </span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
              <AlertTriangle className="size-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="font-serif text-3xl font-medium text-card-foreground">
              {criticalDeficits}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Requires attention
            </p>
          </div>
        </div>

        {/* Card 4: PENDING PROCUREMENT */}
        <div className="group flex flex-col justify-between rounded-2xl border border-border/80 border-l-4 border-l-amber-500 bg-card p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Pending Procurement
            </span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <CircleDollarSign className="size-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="font-serif text-3xl font-medium text-card-foreground">
              {pendingProcurement}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Open replenishment items
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
