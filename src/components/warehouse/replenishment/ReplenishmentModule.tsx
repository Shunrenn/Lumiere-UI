import { useMemo, useState } from 'react'
import { Download, Plus, Search, X } from 'lucide-react'
import { usePortal } from '@/lib/store'
import { getDeficitLines, lineCost, type DeficitLine } from '@/lib/warehouse-replenishment'
import { DeficitTable } from '@/components/warehouse/replenishment/DeficitTable'
import { GeneratePOModal } from '@/components/warehouse/replenishment/GeneratePOModal'
import { AddMasterItemModal, type MasterItemDraft } from '@/components/warehouse/replenishment/AddMasterItemModal'
import { BulkGenerateFlow } from '@/components/warehouse/replenishment/BulkGenerateFlow'
import { KebabMenu } from '@/components/warehouse/shared/KebabMenu'
import { cn } from '@/lib/utils'

type ViewMode = 'grouped' | 'consolidated'

interface ReplenishmentModuleProps {
  onClose: () => void
}

export function ReplenishmentModule({ onClose }: ReplenishmentModuleProps) {
  const { events } = usePortal()
  const [lines, setLines] = useState<DeficitLine[]>(() => getDeficitLines(events))
  const [viewMode, setViewMode] = useState<ViewMode>('grouped')
  const [query, setQuery] = useState('')
  const [poLine, setPoLine] = useState<DeficitLine | null>(null)
  const [editLine, setEditLine] = useState<DeficitLine | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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


  const handleGeneratePO = (id: string, quantity: number, vendorId: string) => {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, status: 'PO Sent', quantityNeeded: quantity, primaryVendorId: vendorId } : line)),
    )
    setPoLine(null)
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

  const handleAddMasterItem = (draft: MasterItemDraft) => {
    const newLine: DeficitLine = {
      id: `def-master-${Date.now()}`,
      itemName: draft.itemName,
      category: draft.category,
      unit: draft.unit,
      triggerSource: draft.triggerSource,
      currentStock: draft.currentStock,
      threshold: draft.threshold,
      costPerUnit: draft.costPerUnit,
      priority: draft.priority,
      status: 'Flagged',
      primaryVendorId: draft.primaryVendorId,
      quantityNeeded: Math.max(1, draft.threshold - draft.currentStock),
    }
    setLines((prev) => [newLine, ...prev])
    setAddOpen(false)
  }

  const handleRemove = (id: string) => setLines((prev) => prev.filter((line) => line.id !== id))

  const handleTagForDispatch = (id: string) =>
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, taggedForDispatch: !line.taggedForDispatch } : line)))

  const handleBulkConfirm = (ids: string[]) => {
    setLines((prev) => prev.map((line) => (ids.includes(line.id) ? { ...line, status: 'PO Sent' } : line)))
    setBulkOpen(false)
    setSelectedIds(new Set())
  }

  const exportReport = () => {
    const header = 'Item,Event,Trigger Source,Current Stock,Threshold,Cost,Priority,Status\n'
    const rows = filtered
      .map(
        (l) =>
          `"${l.itemName}","${l.eventTitle ?? 'General'}","${l.triggerSource}","${l.currentStock}","${l.threshold}","${lineCost(l)}","${l.priority}","${l.status}"`,
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'replenishment-deficit-report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const openCandidates = lines.filter((line) => line.status === 'Flagged' || line.status === 'PO Drafted')

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:px-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.24em] text-primary">Warehouse module</p>
            <h1 className="mt-1 font-serif text-2xl font-medium text-foreground">Replenishment &amp; Deficits</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Deficit tracking, reorder requisitions, and procurement status.
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

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-md border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                aria-pressed={viewMode === 'grouped'}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                  viewMode === 'grouped' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                Event-Grouped
              </button>
              <button
                type="button"
                onClick={() => setViewMode('consolidated')}
                aria-pressed={viewMode === 'consolidated'}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                  viewMode === 'consolidated' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                Consolidated
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search items or events…"
                className="w-56 rounded-md border border-input bg-background py-2.5 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-border bg-background px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition hover:bg-accent"
            >
              <Plus className="size-3.5" />
              Add Master Item
            </button>
            <button
              type="button"
              onClick={exportReport}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-border bg-background px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition hover:bg-accent"
            >
              <Download className="size-3.5" />
              Export Report
            </button>
            <KebabMenu
              label="More replenishment actions"
              actions={[{ label: 'Bulk Generate Master PO', onSelect: () => setBulkOpen(true) }]}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 sm:px-10">
        {viewMode === 'consolidated' ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-serif text-lg font-medium text-card-foreground">All Deficit Lines</h2>
              <span className="rounded-full bg-muted px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {filtered.length} items
              </span>
            </div>
            <DeficitTable
              lines={filtered}
              selectedIds={selectedIds}
              onRowClick={setPoLine}
              onEdit={setEditLine}
              onRemove={handleRemove}
              onTagForDispatch={handleTagForDispatch}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.groups.length === 0 && grouped.general.length === 0 && (
              <p className="text-sm text-muted-foreground">No deficit lines match the current search.</p>
            )}
            {grouped.groups.map(([eventId, group]) => {
              const total = group.lines.reduce((sum, l) => sum + lineCost(l), 0)
              return (
                <div key={eventId} className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div>
                      <h2 className="font-serif text-lg font-medium text-card-foreground">{group.title}</h2>
                      <p className="text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">
                        {group.lines.length} deficit line{group.lines.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Running total</p>
                      <p className="text-lg font-semibold text-card-foreground">₱{total.toLocaleString()}</p>
                    </div>
                  </div>
                  <DeficitTable
                    lines={group.lines}
                    selectedIds={selectedIds}
                    onRowClick={setPoLine}
                    onEdit={setEditLine}
                    onRemove={handleRemove}
                    onTagForDispatch={handleTagForDispatch}
                  />
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
      {addOpen && <AddMasterItemModal onClose={() => setAddOpen(false)} onSave={handleAddMasterItem} />}
      {bulkOpen && (
        <BulkGenerateFlow candidates={openCandidates} onClose={() => setBulkOpen(false)} onConfirm={handleBulkConfirm} />
      )}
    </div>
  )
}
