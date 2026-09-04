import { useMemo, useState } from 'react'
import { AlertTriangle, Plus, Search, X, Calendar, Sliders, LayoutGrid, Table } from 'lucide-react'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import {
  elapsedLabel,
  getTeamCapacity,
  moveProductionItem,
  flagProductionDelay,
  PRODUCTION_STAGES,
  useProductionItems,
  type ProductionItem,
  type ProductionStage,
} from '@/lib/warehouse-production'
import { Pill } from '@/components/warehouse/shared/Pill'
import type { Tone } from '@/components/warehouse/event-detail/status-tone'
import { ProductionDetailModal } from '@/components/warehouse/production/ProductionDetailModal'
import { QuotaEstimationModal } from '@/components/warehouse/production/QuotaEstimationModal'
import { ProductionGanttView } from '@/components/warehouse/production/ProductionGanttView'
import { ScheduleBespokeModal } from '@/components/warehouse/production/ScheduleBespokeModal'
import { SubCategorySettingsModal } from '@/components/warehouse/production/SubCategorySettingsModal'
import { FlagDelayModal } from '@/components/warehouse/production/FlagDelayModal'
import { cn } from '@/lib/utils'

type MainModuleView = 'gantt' | 'kanban' | 'workload'

const STAGE_TONE: Record<ProductionStage, Tone> = {
  Unprepped: 'neutral',
  Prepping: 'progress',
  'Awaiting Approval': 'caution',
  Ready: 'positive',
}

const STATUS_FILTERS: Array<ProductionStage | 'All'> = ['All', 'Unprepped', 'Prepping', 'Awaiting Approval', 'Ready']

interface ProductionModuleProps {
  onClose: () => void
}

export function ProductionModule({ onClose }: ProductionModuleProps) {
  const { events, staff } = usePortal()
  const { hasFullWarehouseAccess, isProductionManager } = useAuth()
  const canApproveProduction = hasFullWarehouseAccess || isProductionManager
  const items = useProductionItems(events, staff)

  const [view, setView] = useState<MainModuleView>('gantt')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProductionStage | 'All'>('All')
  const [selectedItem, setSelectedItem] = useState<ProductionItem | null>(null)
  const [quotaOpen, setQuotaOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [subCategorySettingsOpen, setSubCategorySettingsOpen] = useState(false)
  const [delayModalItem, setDelayModalItem] = useState<ProductionItem | null>(null)
  const [savedEstimates, setSavedEstimates] = useState<
    { itemName: string; manCount: number; materialCount: number; estimatedHours: number }[]
  >([])
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'All' || item.stage === statusFilter
      const matchesQuery =
        !q || item.itemName.toLowerCase().includes(q) || item.eventTitle.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [items, query, statusFilter])

  const capacity = useMemo(() => getTeamCapacity(items, staff), [items, staff])

  const activeItem = selectedItem ? items.find((i) => i.id === selectedItem.id) ?? selectedItem : null

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:px-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.24em] text-primary">Warehouse module</p>
            <h1 className="mt-1 font-serif text-2xl font-medium text-foreground">Production &amp; Fabrication</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Bespoke build estimation, Gantt timeline scheduling, and workshop capacity.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close and return to dashboard"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* View Switcher Bar & Primary Action Buttons */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-md border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setView('gantt')}
              aria-pressed={view === 'gantt'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                view === 'gantt' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Calendar className="size-3" />
              Gantt Timeline
            </button>
            <button
              type="button"
              onClick={() => setView('kanban')}
              aria-pressed={view === 'kanban'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                view === 'kanban' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <LayoutGrid className="size-3" />
              Kanban Board
            </button>
            <button
              type="button"
              onClick={() => setView('workload')}
              aria-pressed={view === 'workload'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                view === 'workload' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Table className="size-3" />
              Cross-Event Workload
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search items or events…"
                className="w-52 rounded-md border border-input bg-background py-2.5 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <button
              type="button"
              onClick={() => setSubCategorySettingsOpen(true)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-background px-3 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-foreground transition hover:bg-muted"
            >
              <Sliders className="size-3.5 text-muted-foreground" />
              Worker Caps
            </button>

            <button
              type="button"
              onClick={() => setQuotaOpen(true)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-background px-3 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-foreground transition hover:bg-muted"
            >
              Estimate Quota
            </button>

            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-3.5 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="size-3.5" />
              + Schedule Bespoke
            </button>
          </div>
        </div>

        {view === 'kanban' && (
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                aria-pressed={statusFilter === s}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] transition',
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-background text-muted-foreground hover:bg-muted',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main View Area */}
      <div className="flex-1 px-6 py-6 sm:px-10">
        {view === 'gantt' ? (
          <ProductionGanttView
            items={filtered}
            onOpenItem={setSelectedItem}
            onFlagDelay={(item) => setDelayModalItem(item)}
          />
        ) : view === 'workload' ? (
          <div className="flex flex-col gap-5">
            <TeamCapacityStrip capacity={capacity} />
            <CrossEventWorkloadTable items={filtered} onOpenItem={setSelectedItem} />
          </div>
        ) : (
          <KanbanBoard
            filtered={filtered}
            draggingId={draggingId}
            onDragStart={(id) => setDraggingId(id)}
            onDragEnd={() => setDraggingId(null)}
            onDropStage={(id, stage) => {
              moveProductionItem(id, stage)
              setDraggingId(null)
            }}
            onOpenItem={setSelectedItem}
          />
        )}
      </div>

      {/* Modals & Drawers */}
      {scheduleOpen && (
        <ScheduleBespokeModal
          onClose={() => setScheduleOpen(false)}
          onScheduled={() => setView('gantt')}
        />
      )}

      {subCategorySettingsOpen && (
        <SubCategorySettingsModal onClose={() => setSubCategorySettingsOpen(false)} />
      )}

      {delayModalItem && (
        <FlagDelayModal
          item={delayModalItem}
          onClose={() => setDelayModalItem(null)}
          onSaveDelay={(delay) => flagProductionDelay(delayModalItem.id, delay)}
        />
      )}

      {quotaOpen && (
        <QuotaEstimationModal
          onClose={() => setQuotaOpen(false)}
          onSave={(result) => {
            setSavedEstimates((prev) => [result, ...prev])
            setQuotaOpen(false)
          }}
        />
      )}

      {activeItem && (
        <ProductionDetailModal
          item={activeItem}
          isProductionManager={canApproveProduction}
          onClose={() => setSelectedItem(null)}
        />
      )}
      {savedEstimates.length > 0 && (
        <div className="fixed bottom-6 right-6 z-30 flex w-72 flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-2xl">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Recent Quota Estimates</p>
          {savedEstimates.slice(0, 2).map((estimate, index) => (
            <div key={`${estimate.itemName}-${index}`} className="rounded-md bg-background px-3 py-2">
              <p className="truncate text-xs font-semibold text-card-foreground">{estimate.itemName}</p>
              <p className="text-[0.6rem] text-muted-foreground">
                {estimate.manCount} crew · {estimate.materialCount} materials · est. {estimate.estimatedHours}h
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TeamCapacityStrip({ capacity }: { capacity: ReturnType<typeof getTeamCapacity> }) {
  const ratio = Math.min(1, capacity.committedHours / Math.max(1, capacity.availableHours))
  const tone = capacity.status === 'red' ? 'bg-destructive' : capacity.status === 'amber' ? 'bg-accent-foreground/60' : 'bg-primary'
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Team Capacity · This Week</p>
        {capacity.status !== 'healthy' && (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.08em]',
              capacity.status === 'red' ? 'bg-destructive text-background' : 'bg-destructive/15 text-destructive',
            )}
          >
            <AlertTriangle className="size-3" />
            {capacity.status === 'red' ? 'Overcommitted' : 'Approaching capacity'}
          </span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-card-foreground">{capacity.committedHours}h</span> committed of{' '}
        <span className="font-semibold text-card-foreground">{capacity.availableHours}h</span> available crew hours.
      </p>
    </div>
  )
}

function CrossEventWorkloadTable({
  items,
  onOpenItem,
}: {
  items: ProductionItem[]
  onOpenItem: (item: ProductionItem) => void
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No bespoke commitments match the current search.</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[880px] text-left">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {['Item', 'Event', 'Man Count', 'Assigned Crew', 'Est. Hours', 'Status'].map((h) => (
              <th key={h} className="px-5 py-3.5 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onOpenItem(item)}
              className="cursor-pointer border-t border-border/60 align-middle transition hover:bg-muted/40"
            >
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="size-9 shrink-0 overflow-hidden rounded-md bg-muted">
                    <img src={item.thumbnail || '/placeholder.svg'} alt={item.itemName} crossOrigin="anonymous" className="size-full object-cover" />
                  </div>
                  <p className="text-sm font-medium text-card-foreground">{item.itemName}</p>
                </div>
              </td>
              <td className="px-5 py-3.5 text-xs text-muted-foreground">{item.eventTitle}</td>
              <td className="px-5 py-3.5 text-xs text-card-foreground">{item.manCount}</td>
              <td className="px-5 py-3.5 text-xs text-card-foreground">{item.assignedCrew}</td>
              <td className="px-5 py-3.5 text-xs text-card-foreground">{item.estimatedHours}h</td>
              <td className="px-5 py-3.5">
                <Pill tone={STAGE_TONE[item.stage]}>{item.stage}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function KanbanBoard({
  filtered,
  draggingId,
  onDragStart,
  onDragEnd,
  onDropStage,
  onOpenItem,
}: {
  filtered: ProductionItem[]
  draggingId: string | null
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDropStage: (id: string, stage: ProductionStage) => void
  onOpenItem: (item: ProductionItem) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {PRODUCTION_STAGES.map((stage) => {
        const stageItems = filtered.filter((item) => item.stage === stage)
        return (
          <div
            key={stage}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggingId) onDropStage(draggingId, stage)
            }}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3"
          >
            <div className="flex items-center justify-between px-1">
              <Pill tone={STAGE_TONE[stage]}>{stage}</Pill>
              <span className="text-[0.6rem] font-semibold text-muted-foreground">{stageItems.length}</span>
            </div>
            <div className="flex min-h-16 flex-col gap-2.5">
              {stageItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  draggable
                  onDragStart={() => onDragStart(item.id)}
                  onDragEnd={onDragEnd}
                  onClick={() => onOpenItem(item)}
                  className={cn(
                    'flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-3 text-left transition hover:border-primary/50 hover:bg-accent',
                    draggingId === item.id && 'opacity-50',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      <img
                        src={item.thumbnail || '/placeholder.svg'}
                        alt={item.itemName}
                        crossOrigin="anonymous"
                        className="size-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-card-foreground">{item.itemName}</p>
                      <p className="truncate text-[0.58rem] uppercase tracking-[0.06em] text-muted-foreground">
                        {item.assignedCrew}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[0.58rem] text-muted-foreground">
                    <span>{item.quota} units</span>
                    <span className="font-mono">{item.computedEndDate}</span>
                  </div>
                  <p className="text-[0.58rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    In column · {elapsedLabel(item.startedAt)}
                  </p>
                </button>
              ))}
              {stageItems.length === 0 && (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[0.6rem] text-muted-foreground">
                  No items
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
