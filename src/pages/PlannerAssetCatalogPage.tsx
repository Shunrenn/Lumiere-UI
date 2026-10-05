import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { PLANNER_RAIL_DESTINATIONS, PLANNER_RAIL_IDENTITY } from '@/lib/executive-destinations'
import { useCatalogAssets } from '@/lib/warehouse-catalog'
import { useNav } from '@/lib/nav'
import { usePortal } from '@/lib/store'

export function PlannerAssetCatalogPage() {
  const { navigate, route } = useNav()
  const { events } = usePortal()
  // Use the same shared store as the WOM Asset Catalog so both accounts are always in sync.
  const catalogAssets = useCatalogAssets()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [availabilityTarget, setAvailabilityTarget] = useState('')
  const [customDates, setCustomDates] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(catalogAssets.map((a) => a.category)))],
    [catalogAssets],
  )

  const visible = useMemo(
    () =>
      catalogAssets.filter(
        (a) =>
          (category === 'All' || a.category === category) &&
          `${a.name} ${a.category} ${a.description ?? ''}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [catalogAssets, category, query],
  )

  return (
    <ExecutiveShell activeId="inventory" onSelect={(id) => navigate(id as typeof route)} destinations={PLANNER_RAIL_DESTINATIONS} identityRoleLabel={PLANNER_RAIL_IDENTITY.roleLabel}>
      <main className="text-foreground">
        <header className="mb-7">
          <h1 className="font-serif text-3xl font-semibold">Asset Catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">Read-only WOM-registered assets and verified checkpoint-based availability.</p>
        </header>
        <section className="mb-6 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold">
              Check availability for
              <select value={availabilityTarget} onChange={(e) => { setAvailabilityTarget(e.target.value); setCustomDates(false) }} className="ml-2 rounded border border-border bg-background p-2">
                <option value="">Select assigned event</option>
                {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => setCustomDates((v) => !v)} className="rounded border border-border px-3 py-2 text-xs">Custom date range</button>
            {customDates && <>
              <input aria-label="Availability start date" type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded border border-border bg-background p-2 text-xs" />
              <input aria-label="Availability end date" type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded border border-border bg-background p-2 text-xs" />
            </>}
            <span className="text-xs text-muted-foreground">Availability not yet available for this date window.</span>
          </div>
        </section>
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input aria-label="Search catalog" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search assets" className="rounded border border-border bg-card py-2 pl-9 pr-3 text-sm" />
          </div>
          {categories.map((item) => (
            <button key={item} type="button" onClick={() => setCategory(item)} className="rounded border border-border px-3 py-2 text-xs">{item}</button>
          ))}
        </div>
        {catalogAssets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading catalog…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((asset) => (
              <article key={asset.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="aspect-[4/3] bg-muted">
                  {asset.image && <img src={asset.image} alt="" className="size-full object-cover" />}
                </div>
                <div className="p-3">
                  <h2 className="min-w-0 flex-1 truncate font-semibold" title={asset.name}>{asset.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{asset.category}</p>
                  {asset.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{asset.description}</p>}
                  <p className="mt-3 text-xs text-muted-foreground">Availability not yet available</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </ExecutiveShell>
  )
}
