import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Download, Plus, Search } from 'lucide-react'
import { usePortal } from '@/lib/store'
import { lineCost, type DeficitLine } from '@/lib/warehouse-replenishment'
import { createDeficitItemApi, fetchDeficitQueueApi, updateDeficitStatusApi } from '@/features/inventory/api/deficitApi'
import { DeficitTable } from '@/components/warehouse/replenishment/DeficitTable'
import { GeneratePOModal } from '@/components/warehouse/replenishment/GeneratePOModal'
import { AddMasterItemModal, type MasterItemDraft } from '@/components/warehouse/replenishment/AddMasterItemModal'
import { BulkGenerateFlow } from '@/components/warehouse/replenishment/BulkGenerateFlow'
import { WarehouseModuleHeader } from '@/components/warehouse/WarehouseModuleHeader'
import { cn } from '@/lib/utils'
import { exportReplenishmentDeficitPdf } from '@/lib/pdf-exporter'

type ViewMode = 'grouped' | 'consolidated'

export function ReplenishmentModule() {
  const { events } = usePortal()
  const [lines, setLines] = useState<DeficitLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grouped')
  const [query, setQuery] = useState('')
  const [poLine, setPoLine] = useState<DeficitLine | null>(null)
  const [editLine, setEditLine] = useState<DeficitLine | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addPresetEvent, setAddPresetEvent] = useState<{ id: string; title: string } | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)

  const loadDeficits = () => {
    setLoading(true)
    setError(null)
    fetchDeficitQueueApi()
      .then((items) => {
        const mapped: DeficitLine[] = items.map((item) => ({
          id: item.id,
          eventId: item.eventId || undefined,
          eventTitle: item.eventName || undefined,
          itemName: item.itemName,
          category: (item.itemCategory as any) || 'General',
          unit: item.unit || 'pcs',
          triggerSource: (item.triggerSource as any) || 'Auto-Threshold',
          currentStock: item.currentStock ?? 0,
          threshold: item.threshold ?? item.quantityNeeded,
          costPerUnit: item.costPerUnit ?? 100,
          priority: (item.urgencyLevel as any) || (item.priority as any) || 'Medium',
          status: (item.status as any) || 'Not Purchased',
          primaryVendorId: item.primaryVendorId || '',
          quantityNeeded: item.quantityNeeded,
        }))
        setLines(mapped)
        setLoading(false)
      })
      .catch((err) => {
        console.warn('[ReplenishmentModule] Failed to load deficit queue:', err)
        setError('Failed to load deficit queue from server. Please check connection.')
        setLoading(false)
      })
  }

  useEffect(() => {
    loadDeficits()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return lines
    return lines.filter(
      (line) =>
        line.itemName.toLowerCase().includes(q) ||
        (line.eventTitle ?? 'general stockroom').toLowerCase().includes(q),
    )
  }, [lines, query])

  const grouped = useMemo(() => {
    const withEvent = filtered.filter((line) => line.eventId)
    const groups = new Map<string, { title: string; lines: DeficitLine[] }>()
    withEvent.forEach((line) => {
      if (!line.eventId || !line.eventTitle) return
      const existing = groups.get(line.eventId)
      if (existing) existing.lines.push(line)
      else groups.set(line.eventId, { title: line.eventTitle, lines: [line] })
    })
    const general = filtered.filter((line) => !line.eventId)
    return { groups: [...groups.entries()], general }
  }, [filtered])

  const handleGeneratePO = async (id: string, quantity: number, vendorId: string) => {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, status: 'In Procurement', quantityNeeded: quantity, primaryVendorId: vendorId } : line)),
    )
    setPoLine(null)
    await updateDeficitStatusApi(id, 'In Procurement')
  }

  const handleSaveEdit = (draft: MasterItemDraft) => {
    if (!editLine) return
    setLines((prev) =>
      prev.map((line) =>
        line.id === editLine.id
          ? {
              ...line,
              itemName: draft.itemName,
              category: draft.category,
              unit: draft.unit,
              currentStock: draft.currentStock,
              threshold: draft.threshold,
              costPerUnit: draft.costPerUnit,
              priority: draft.priority,
              triggerSource: draft.triggerSource,
              primaryVendorId: draft.primaryVendorId,
            }
          : line,
      ),
    )
    setEditLine(null)
  }

  const handleAddMasterItem = async (draft: MasterItemDraft) => {
    const needed = Math.max(1, draft.threshold - draft.currentStock)
    const res = await createDeficitItemApi({
      eventId: draft.eventId,
      itemCategory: draft.category,
      itemName: draft.itemName,
      quantityNeeded: needed,
      urgencyLevel: draft.priority,
    })

    const newLine: DeficitLine = {
      id: res?.id || `def-master-${Date.now()}`,
      eventId: draft.eventId,
      eventTitle: draft.eventTitle,
      itemName: draft.itemName,
      category: draft.category,
      unit: draft.unit,
      triggerSource: draft.triggerSource,
      currentStock: draft.currentStock,
      threshold: draft.threshold,
      costPerUnit: draft.costPerUnit,
      priority: draft.priority,
      status: 'Not Purchased',
      primaryVendorId: draft.primaryVendorId,
      quantityNeeded: needed,
    }
    setLines((prev) => [newLine, ...prev])
    setAddOpen(false)
    setAddPresetEvent(null)
  }

  const handleRemove = (id: string) => setLines((prev) => prev.filter((line) => line.id !== id))

  const handleTagForDispatch = (id: string) =>
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, taggedForDispatch: !line.taggedForDispatch } : line)))

  const handleBulkConfirm = (ids: string[]) => {
    setLines((prev) => prev.map((line) => (ids.includes(line.id) ? { ...line, status: 'In Procurement' } : line)))
    setBulkOpen(false)
    setSelectedIds(new Set())
  }

  const exportReport = () => {
    exportReplenishmentDeficitPdf(filtered)
  }

  const openCandidates = lines.filter((line) => line.status === 'Not Purchased')
  const openDeficits = filtered.filter((line) => line.status !== 'Received')
  const criticalDeficits = openDeficits.filter((line) => line.priority === 'Critical')
  const highPriorityDeficits = openDeficits.filter((line) => line.priority === 'High')

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex flex-col border-b border-border px-0 py-7">
        <div>
          <WarehouseModuleHeader
            title="Replenishment / Deficits"
            description="Automated deficit detection, inventory replenishment alerts, and order preparation."
          />
        </div>

        <div className="mt-5 flex flex-col gap-3 min-[1700px]:flex-row min-[1700px]:items-center min-[1700px]:justify-between">
          <div className="inline-flex h-10 w-fit rounded-[0.6rem] border border-border bg-card/50 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={cn(
                'h-8 rounded-lg px-3 text-[0.68rem] font-semibold uppercase tracking-[0.08em] transition whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                viewMode === 'grouped'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              Event-Bound Deficits ({events.length} Events)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('consolidated')}
              className={cn(
                'h-8 rounded-lg px-3 text-[0.68rem] font-semibold uppercase tracking-[0.08em] transition whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                viewMode === 'consolidated'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              Consolidated Register ({lines.length} Lines)
            </button>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 min-[1700px]:min-w-0 min-[1700px]:flex-1 min-[1700px]:flex-nowrap min-[1700px]:justify-end">
            <div className="relative min-w-[240px] flex-1 min-[1700px]:min-w-[240px]">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search items or events…"
                className="h-10 w-full rounded-lg border border-input bg-card/50 pl-10 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-border bg-card/50 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Add Item
            </button>

            <button
              type="button"
              onClick={exportReport}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card/50 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-card-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Download className="size-3.5" />
              Export Report (PDF)
            </button>

            {openCandidates.length > 0 && <button type="button" onClick={() => setBulkOpen(true)} className="inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-primary px-3 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">Prepare Order ({openCandidates.length})</button>}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-0 py-7">
        {!loading && !error && (
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Open Deficits', value: openDeficits.length, dot: 'bg-destructive' },
              { label: 'Critical', value: criticalDeficits.length, dot: 'bg-destructive' },
              { label: 'High Priority', value: highPriorityDeficits.length, dot: 'bg-amber-500' },
              { label: 'Order Candidates', value: openCandidates.length, dot: 'bg-primary' },
            ].map((metric) => (
              <div key={metric.label} className="rounded-xl border border-border bg-card px-4 py-3.5">
                <div className="flex items-center gap-2 text-[0.58rem] font-bold uppercase tracking-[0.11em] text-muted-foreground">
                  <span className={cn('size-2 rounded-full', metric.dot)} />
                  {metric.label}
                </div>
                <p className="mt-2 font-serif text-xl font-medium text-card-foreground">{metric.value}</p>
              </div>
            ))}
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground uppercase tracking-wider">Loading canonical deficit queue...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
            <p className="text-xs font-semibold text-destructive">{error}</p>
            <button
              type="button"
              onClick={loadDeficits}
              className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : viewMode === 'consolidated' ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-serif text-lg font-medium text-card-foreground">All Deficit Lines</h2>
              <span className="rounded-full bg-muted px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {filtered.length} items
              </span>
            </div>
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                No deficit records found in queue.
              </div>
            ) : (
              <DeficitTable
                lines={filtered}
                selectedIds={selectedIds}
                onRowClick={setPoLine}
                onEdit={setEditLine}
                onRemove={handleRemove}
                onTagForDispatch={handleTagForDispatch}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.groups.length === 0 && grouped.general.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                No deficit records found in queue.
              </div>
            )}
            {grouped.groups.map(([eventId, group]) => {
              const activeLines = group.lines.filter((l) => l.status !== 'Received')
              const activeTotalCost = activeLines.reduce((sum, l) => sum + lineCost(l), 0)
              const criticalCount = activeLines.filter((line) => line.priority === 'Critical').length
              const highCount = activeLines.filter((line) => line.priority === 'High').length
              const isExpanded = expandedEventId === eventId
              return (
                <div key={eventId} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <button type="button" onClick={() => setExpandedEventId((current) => current === eventId ? null : eventId)} aria-expanded={isExpanded} className="flex w-full flex-col gap-3 px-6 py-5 text-left transition hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-serif text-lg font-medium text-card-foreground">{group.title}</h2>
                      <p className="mt-1 text-[0.55rem] uppercase tracking-[0.1em] text-muted-foreground">
                        {activeLines.length} deficit item{activeLines.length === 1 ? '' : 's'} · {criticalCount} critical · {highCount} high
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right"><p className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Active Deficit</p><p className="font-serif text-lg font-medium text-card-foreground">₱{activeTotalCost.toLocaleString()}</p></div>
                      <span className="flex size-10 items-center justify-center rounded-lg border border-primary/40 text-primary"><ChevronDown className={cn('size-4 transition-transform', isExpanded && 'rotate-180')} /></span>
                    </div>
                  </button>
                  {isExpanded && <div className="border-t border-border"><div className="flex justify-end gap-2 border-b border-border px-5 py-3"><button type="button" onClick={() => { setAddPresetEvent({ id: eventId, title: group.title }); setAddOpen(true) }} className="inline-flex items-center gap-1 rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary"><Plus className="size-3" />Add item</button><button type="button" onClick={() => exportReplenishmentDeficitPdf(group.lines, `Deficit Report — ${group.title}`)} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-card-foreground"><Download className="size-3" />Export</button></div><DeficitTable lines={group.lines} selectedIds={selectedIds} onRowClick={setPoLine} onEdit={setEditLine} onRemove={handleRemove} onTagForDispatch={handleTagForDispatch} /></div>}
                </div>
              )
            })}
            {grouped.general.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-dashed border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <h2 className="font-serif text-lg font-medium text-card-foreground">General Stockroom</h2>
                    <p className="text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">
                      Not tied to a specific event — visible here and in Consolidated
                    </p>
                  </div>
                </div>
                <DeficitTable
                  lines={grouped.general}
                  selectedIds={selectedIds}
                  onRowClick={setPoLine}
                  onEdit={setEditLine}
                  onRemove={handleRemove}
                  onTagForDispatch={handleTagForDispatch}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {poLine && <GeneratePOModal line={poLine} onClose={() => setPoLine(null)} onGenerate={handleGeneratePO} />}
      {editLine && <AddMasterItemModal initial={editLine} onClose={() => setEditLine(null)} onSave={handleSaveEdit} />}
      {addOpen && (
        <AddMasterItemModal
          presetEvent={addPresetEvent ?? undefined}
          onClose={() => {
            setAddOpen(false)
            setAddPresetEvent(null)
          }}
          onSave={handleAddMasterItem}
        />
      )}
      {bulkOpen && (
        <BulkGenerateFlow candidates={openCandidates} onClose={() => setBulkOpen(false)} onConfirm={handleBulkConfirm} />
      )}
    </div>
  )
}
