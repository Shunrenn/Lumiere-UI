import { useEffect, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Banknote,
  ShieldAlert,
  PackageSearch,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react'
import { fetchEventBudget, type EventBudgetData, type BudgetLineItem } from '@/lib/budgetApi'
import { cn } from '@/lib/utils'
import type { PortalEvent } from '@/lib/types'

function currency(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

function BudgetRow({ item }: { item: BudgetLineItem }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-t border-border/40 first:border-t-0 text-xs">
      <div className="min-w-0">
        <p className="font-medium text-card-foreground truncate">{item.label}</p>
        {item.description && (
          <p className="text-[0.65rem] text-muted-foreground">{item.description}</p>
        )}
      </div>
      <span
        className={cn(
          'shrink-0 font-mono text-[0.72rem]',
          item.isMissingCost ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-card-foreground',
        )}
      >
        {item.isMissingCost ? '⚠ unpriced' : item.lineTotal != null ? currency(item.lineTotal) : '—'}
      </span>
    </div>
  )
}

function BudgetSection({
  title,
  icon: Icon,
  items,
  total,
  colorClass,
  defaultOpen = false,
}: {
  title: string
  icon: React.ElementType
  items: BudgetLineItem[]
  total: number
  colorClass: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (items.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Icon className={`size-4 ${colorClass}`} />
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-foreground">{title}</span>
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] font-semibold text-muted-foreground">
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-card-foreground">{currency(total)}</span>
          {open ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-border/50 px-4 py-2">
          {items.map((item, i) => <BudgetRow key={i} item={item} />)}
        </div>
      )}
    </div>
  )
}

function BudgetSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1,2,3].map(i => (
        <div key={i} className="h-12 rounded-lg bg-muted/60" />
      ))}
    </div>
  )
}

export function ProjectValuationPanel({ event }: { event: PortalEvent }) {
  const [budget, setBudget] = useState<EventBudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!event?.id) return
    setLoading(true)
    setError(null)
    fetchEventBudget(event.id)
      .then(setBudget)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [event?.id])

  const noDataState = budget && budget.totalReservedAssets === 0 && budget.totalDamageCosts === 0 && budget.totalProcurementCosts === 0

  return (
    <div className="mt-7 rounded-xl border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
            Project Valuation
          </h3>
          <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
            Real-time budget breakdown · R14 Administrative Review
          </p>
        </div>
        {budget?.hasIncompleteCostData && (
          <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-50 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            <AlertTriangle className="size-3" />
            Incomplete Cost Data
          </span>
        )}
        {budget && !budget.hasIncompleteCostData && !noDataState && (
          <span className="flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-50 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <CheckCircle2 className="size-3" />
            Fully Costed
          </span>
        )}
      </div>

      {loading && <div className="mt-5"><BudgetSkeleton /></div>}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          <HelpCircle className="size-4 shrink-0" />
          <span>Could not load budget data: {error}</span>
        </div>
      )}

      {budget && noDataState && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          <PackageSearch className="size-4 shrink-0" />
          <span>
            No asset reservations, damage reports, or procurement items found for this event.
            Cost data will appear here once the event has reserved assets with configured unit costs.
          </span>
        </div>
      )}

      {budget && !noDataState && (
        <div className="mt-5 space-y-3">
          {/* Summary totals */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Asset Cost', value: budget.estimatedAssetCost, color: 'text-sky-600' },
              { label: 'Damage Cost', value: budget.totalDamageCosts, color: 'text-rose-600' },
              { label: 'Procurement', value: budget.totalProcurementCosts, color: 'text-amber-600' },
              { label: 'Total Estimated', value: budget.totalEstimatedCost, color: 'text-foreground', bold: true },
            ].map(({ label, value, color, bold }) => (
              <div key={label} className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
                <p className={cn('mt-2 font-mono text-sm font-bold leading-none', color, bold && 'text-base')}>{currency(value)}</p>
              </div>
            ))}
          </div>

          {/* Revenue & Margin */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Estimated Revenue (Client Quote)
                </p>
                <p className="mt-1.5 font-mono text-xl font-bold text-card-foreground">
                  {budget.estimatedRevenue != null ? currency(budget.estimatedRevenue) : (
                    <span className="text-sm text-muted-foreground italic">Not configured — set via event creation</span>
                  )}
                </p>
              </div>
              {budget.estimatedGrossMargin != null && (
                <div className={cn(
                  'rounded-lg px-4 py-3 border',
                  budget.isLossMaker
                    ? 'border-rose-400/30 bg-rose-50 dark:bg-rose-950'
                    : 'border-emerald-400/30 bg-emerald-50 dark:bg-emerald-950'
                )}>
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Gross Margin</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    {budget.isLossMaker
                      ? <TrendingDown className="size-5 text-rose-600" />
                      : <TrendingUp className="size-5 text-emerald-600" />}
                    <p className={cn(
                      'font-mono text-xl font-bold',
                      budget.isLossMaker ? 'text-rose-600' : 'text-emerald-600'
                    )}>
                      {currency(budget.estimatedGrossMargin)}
                    </p>
                  </div>
                  {budget.isLossMaker && (
                    <p className="mt-1 flex items-center gap-1 text-[0.6rem] font-semibold text-rose-600">
                      <ShieldAlert className="size-3" /> Loss-maker event — requires Executive sign-off
                    </p>
                  )}
                </div>
              )}
            </div>
            {budget.hasIncompleteCostData && (
              <p className="mt-3 flex items-center gap-1.5 text-[0.65rem] text-amber-700 dark:text-amber-400">
                <AlertTriangle className="size-3 shrink-0" />
                {budget.unpricedAssetCount > 0
                  ? `${budget.unpricedAssetCount} reserved asset${budget.unpricedAssetCount > 1 ? 's' : ''} ${budget.unpricedAssetCount > 1 ? 'have' : 'has'} no unit cost configured — total is a partial estimate.`
                  : 'Some procurement items have no unit cost — totals are partial estimates.'}
              </p>
            )}
          </div>

          {/* Line item sections */}
          <BudgetSection
            title="Reserved Assets"
            icon={Banknote}
            items={budget.assetLineItems}
            total={budget.estimatedAssetCost}
            colorClass="text-sky-500"
            defaultOpen={budget.assetLineItems.length > 0 && budget.assetLineItems.length <= 5}
          />
          <BudgetSection
            title="Damage Liabilities"
            icon={ShieldAlert}
            items={budget.damageLineItems}
            total={budget.totalDamageCosts}
            colorClass="text-rose-500"
          />
          <BudgetSection
            title="Emergency Procurement"
            icon={PackageSearch}
            items={budget.procurementLineItems}
            total={budget.totalProcurementCosts}
            colorClass="text-amber-500"
          />
        </div>
      )}
    </div>
  )
}
