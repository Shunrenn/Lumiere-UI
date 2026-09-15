import { useMemo, useState } from 'react'
import { Boxes, Grid2X2, List, Search, X } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { useNav } from '@/lib/nav'
import { usePortal } from '@/lib/store'
import type { InventoryItem, StockStatus } from '@/lib/types'

const STATUS_OPTIONS: Array<'All' | StockStatus> = ['All', 'Available', 'Low Stock', 'Critical Deficit', 'In Transit', 'Allocated', 'In Maintenance', 'Order Placed', 'Depleted']

function stockPercent(item: InventoryItem) {
  return item.capacity > 0 ? Math.min(100, Math.round((item.stock / item.capacity) * 100)) : 0
}

function statusClass(status: StockStatus) {
  if (status === 'Available') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
  if (status === 'Low Stock') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
  if (status === 'Critical Deficit' || status === 'Depleted') return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
  if (status === 'Allocated') return 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300'
  return 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
}

function barClass(percent: number) {
  return percent <= 25 ? 'bg-rose-500' : percent <= 60 ? 'bg-amber-500' : 'bg-emerald-500'
}

function fallbackLocation(item: InventoryItem) {
  return item.location ?? (item.status === 'In Transit' ? 'Transit manifest · active movement' : 'Central warehouse · general storage')
}

function AssetCard({ item, onOpen, list }: { item: InventoryItem; onOpen: () => void; list?: boolean }) {
  const percent = stockPercent(item)
  return (
    <button type="button" onClick={onOpen} className={`group flex overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md ${list ? 'w-full' : 'w-[min(100%,140px)] shrink-0 sm:w-[124px]'}`}>
      <div className={list ? 'flex w-36 shrink-0 items-center justify-center overflow-hidden bg-muted' : 'relative w-full'}>
        <div className={list ? 'aspect-square w-full' : 'aspect-square w-full'}>
          {item.image ? <img src={item.image} alt={`${item.name} asset`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-muted text-muted-foreground"><Boxes className="size-7" /></div>}
        </div>
        {!list && <span className={`absolute left-1.5 top-1.5 rounded-full px-1.5 py-1 text-[0.43rem] font-semibold uppercase tracking-wider shadow-sm ${statusClass(item.status)}`}>{item.status}</span>}
      </div>
      <div className={`min-w-0 ${list ? 'flex-1 p-4' : 'w-full p-2.5'}`}>
        <div className="min-w-0"><p className="truncate text-[0.48rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item.assetId}</p><h2 className="mt-1 truncate text-[0.72rem] font-medium leading-tight text-card-foreground">{item.name}</h2></div>
        {list && <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[0.5rem] font-semibold uppercase tracking-wider ${statusClass(item.status)}`}>{item.status}</span>}
        <p className="mt-1 truncate text-[0.52rem] uppercase tracking-[0.06em] text-muted-foreground">{item.category}</p>
        <div className="mt-2"><div className="mb-1 flex justify-between gap-1 text-[0.52rem]"><span className="text-muted-foreground">Stock</span><span className="font-semibold text-card-foreground">{item.stock} / {item.capacity}</span></div><div className="h-1 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${barClass(percent)}`} style={{ width: `${percent}%` }} /></div></div>
      </div>
    </button>
  )
}

function AssetDrawer({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const percent = stockPercent(item)
  return <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${item.name} asset details`}>
    <button type="button" onClick={onClose} className="absolute inset-0 bg-black/40" aria-label="Close asset details" />
    <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-background shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6 sm:py-5"><div><p className="eyebrow">Asset profile · view only</p><h2 className="mt-1 font-serif text-2xl text-foreground">{item.name}</h2></div><button type="button" onClick={onClose} className="icon-button min-h-11 min-w-11" aria-label="Close"><X className="size-4" /></button></div>
      <div className="p-6"><div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted">{item.image ? <img src={item.image} alt={`${item.name} asset`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><Boxes className="size-12" /></div>}</div>
        <div className="mt-5 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">{item.assetId}</p><p className="mt-1 text-sm text-muted-foreground">{item.category}</p></div><span className={`rounded-full px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-wider ${statusClass(item.status)}`}>{item.status}</span></div>
        <div className="mt-6 rounded-xl border border-border bg-card p-4"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Available stock</span><strong>{item.stock} {item.unit ?? 'units'}</strong></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${barClass(percent)}`} style={{ width: `${percent}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{percent}% of registered capacity · Updated {item.updated}</p></div>
        {item.description && <p className="mt-6 text-sm leading-6 text-muted-foreground">{item.description}</p>}
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">{[['Current location', fallbackLocation(item)], ['Location type', item.locationType ?? (item.status === 'In Transit' ? 'Event Venue' : 'Warehouse')], ['Store', item.store], ['Representative', item.representative], ['Dimensions', item.height && item.width ? `${item.height} × ${item.width}` : undefined], ['Weight', item.weight], ['Unit cost', item.costPerUnit ? `₱${item.costPerUnit.toLocaleString()}` : undefined], ['Added', item.dateAdded]].map(([label, value]) => value ? <div key={label as string}><dt className="eyebrow">{label}</dt><dd className="mt-1 text-card-foreground">{value}</dd></div> : null)}</dl>
      </div>
    </aside>
  </div>
}

export function ExecutiveAssetKioskPage() {
  const { navigate } = useNav()
  const { inventory } = usePortal()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState<'All' | StockStatus>('All')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [selected, setSelected] = useState<InventoryItem | null>(null)
  const categories = useMemo(() => ['All', ...Array.from(new Set(inventory.map((item) => item.category)))], [inventory])
  const filtered = useMemo(() => inventory.filter((item) => { const haystack = `${item.name} ${item.assetId} ${item.category} ${fallbackLocation(item)}`.toLowerCase(); return haystack.includes(query.toLowerCase()) && (category === 'All' || item.category === category) && (status === 'All' || item.status === status) }), [inventory, query, category, status])
  const sections = useMemo(() => { const grouped = new Map<string, InventoryItem[]>(); filtered.forEach((item) => grouped.set(item.category, [...(grouped.get(item.category) ?? []), item])); return Array.from(grouped.entries()) }, [filtered])
  const totalUnits = inventory.reduce((sum, item) => sum + item.stock, 0)
  const attention = inventory.filter((item) => item.status === 'Low Stock' || item.status === 'Critical Deficit' || item.status === 'Depleted').length

  return <ExecutiveShell activeId="assets" onSelect={(id) => navigate(id === 'assets' ? 'asset-kiosk' : id === 'dashboard' ? 'dashboard' : id === 'registry' ? 'registry' : id === 'damage' ? 'damage' : 'logs')} stickyHeader={<div><p className="eyebrow">Warehouse module · executive view only</p><h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">Asset Catalog</h1><p className="mt-1 text-sm text-muted-foreground">Browse registered assets, stock position, and current operational location.</p></div>}>
    <div className="border-b border-border pb-4">
      <div className="flex gap-2 overflow-x-auto pb-2">{categories.map((value) => <button type="button" key={value} onClick={() => setCategory(value)} className={`min-h-10 shrink-0 rounded-full border px-3 py-2 text-[0.52rem] font-semibold uppercase tracking-[0.12em] ${category === value ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-muted-foreground'}`}>{value}</button>)}</div>
      <div className="mt-1 flex gap-2 overflow-x-auto"><button type="button" onClick={() => setStatus('All')} className={`min-h-10 shrink-0 rounded-full border px-3 py-2 text-[0.52rem] font-semibold uppercase tracking-[0.12em] ${status === 'All' ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-muted-foreground'}`}>All</button>{STATUS_OPTIONS.filter((value) => value !== 'All').map((value) => <button type="button" key={value} onClick={() => setStatus(value)} className={`min-h-10 shrink-0 rounded-full border px-3 py-2 text-[0.52rem] font-semibold uppercase tracking-[0.12em] ${status === value ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-muted-foreground'}`}>{value}</button>)}</div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row"><label className="relative min-w-0 flex-1"><span className="sr-only">Search assets</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets..." className="field-input w-full pl-10" /></label><div className="flex rounded-lg border border-border bg-card p-1" aria-label="View mode"><button type="button" onClick={() => setView('grid')} className={`min-h-11 min-w-11 rounded-md p-2 ${view === 'grid' ? 'bg-foreground text-background' : 'text-muted-foreground'}`} aria-label="Grid view"><Grid2X2 className="size-4" /></button><button type="button" onClick={() => setView('list')} className={`min-h-11 min-w-11 rounded-md p-2 ${view === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground'}`} aria-label="List view"><List className="size-4" /></button></div></div>
    </div>
    <div className="mt-5 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground"><strong className="text-foreground">{filtered.length}</strong> assets · {totalUnits.toLocaleString()} units held</p><p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">{attention} attention items</p></div>
    {sections.length ? <div className="mt-5 space-y-8">{sections.map(([section, items]) => <section key={section}><div className="mb-3 flex items-center justify-between border-b border-border pb-2"><h2 className="font-serif text-lg text-foreground">{section} <span className="ml-1 text-xs font-sans text-muted-foreground">({items.length})</span></h2><span className="text-[0.58rem] uppercase tracking-[0.15em] text-muted-foreground">Asset group</span></div>{view === 'grid' ? <div className="grid grid-cols-1 gap-3 pb-3 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{items.map((item) => <AssetCard key={item.id} item={item} onOpen={() => setSelected(item)} />)}</div> : <div className="grid gap-3 md:grid-cols-2">{items.map((item) => <AssetCard key={item.id} item={item} list onOpen={() => setSelected(item)} />)}</div>}</section>)}</div> : <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center"><Boxes className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-serif text-xl">No assets match this view</p><button type="button" onClick={() => { setQuery(''); setCategory('All'); setStatus('All') }} className="mt-4 text-xs font-semibold uppercase tracking-wider text-primary">Clear filters</button></div>}
    {selected && <AssetDrawer item={selected} onClose={() => setSelected(null)} />}
  </ExecutiveShell>
}
