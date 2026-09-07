import { useMemo, useState } from 'react'
import { Search, Download, ChevronDown } from 'lucide-react'
import { ConsoleLayout } from '@/components/ConsoleLayout'

interface WarehouseLog {
  id: string
  timestamp: string
  logId: string
  assetId: string
  assetName: string
  transaction: string
  qty: string
  handledBy: string
  notes: string
}

const LOGS: WarehouseLog[] = [
  {
    id: 'w-1',
    timestamp: 'Jun 07 2026 · 08:45 AM',
    logId: 'LOG-9402',
    assetId: 'LM-0041',
    assetName: 'Ivory Pillar Candle Set',
    transaction: 'Stock Adjustment',
    qty: '-32',
    handledBy: 'W. Ops Manager',
    notes: 'Downgraded to Critical Deficit due to wax damage from June 6 egress.',
  },
  {
    id: 'w-2',
    timestamp: 'Jun 07 2026 · 08:12 AM',
    logId: 'LOG-9401',
    assetId: 'LM-0451',
    assetName: 'Ornate Mirror Panels',
    transaction: 'Egress (Dispatch)',
    qty: '3',
    handledBy: 'Field Crew A',
    notes: 'Loaded onto Transit Vehicle B for Grand Ballroom Wedding setup.',
  },
  {
    id: 'w-3',
    timestamp: 'Jun 07 2026 · 07:30 AM',
    logId: 'LOG-9400',
    assetId: 'LM-0519',
    assetName: 'Eucalyptus Garland Set',
    transaction: 'Audit Baseline',
    qty: '—',
    handledBy: 'W. Ops Manager',
    notes: 'System flagged as Critical Deficit; reorder request automatically dispatched.',
  },
  {
    id: 'w-4',
    timestamp: 'Jun 06 2026 · 11:15 PM',
    logId: 'LOG-9399',
    assetId: 'LM-0114',
    assetName: 'Champagne Coupe Glasses',
    transaction: 'Ingress (Return)',
    qty: '24',
    handledBy: 'Field Crew B',
    notes: 'Returned from Chateau Event. 6 units flagged as broken; stock dropped to Low Stock.',
  },
  {
    id: 'w-5',
    timestamp: 'Jun 06 2026 · 04:30 PM',
    logId: 'LOG-9398',
    assetId: 'LM-0012',
    assetName: 'Premium White Resin Tiffany Chair',
    transaction: 'Ingress (Return)',
    qty: '150',
    handledBy: 'Field Crew A',
    notes: 'Post-event ingress successful. Full batch returned sanitized and restocked.',
  },
  {
    id: 'w-6',
    timestamp: 'Jun 06 2026 · 02:15 PM',
    logId: 'LOG-9397',
    assetId: 'LM-0035',
    assetName: 'Round Linen Banquet Table',
    transaction: 'Stock Allocation',
    qty: '-30',
    handledBy: 'Admin Exec',
    notes: 'Reserved for upcoming Corporate Gala on June 12. State set to Low Stock.',
  },
  {
    id: 'w-7',
    timestamp: 'Jun 05 2026 · 10:00 AM',
    logId: 'LOG-9396',
    assetId: 'LM-0027',
    assetName: 'Luxury Crystal Chandelier',
    transaction: 'Maintenance Log',
    qty: '24',
    handledBy: 'Tech Specialist',
    notes: 'Completed annual safety and wiring audit. Registry state set to Available.',
  },
]

export function WarehouseLogsPage() {
  const [query, setQuery] = useState('')
  const [txnType, setTxnType] = useState('All Transaction Types')
  const [sortOrder, setSortOrder] = useState<'Newest First' | 'Oldest First'>('Newest First')

  const txnTypes = useMemo(
    () => ['All Transaction Types', ...Array.from(new Set(LOGS.map((l) => l.transaction)))],
    [],
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const base = LOGS.filter((l) => {
      const matchesType = txnType === 'All Transaction Types' || l.transaction === txnType
      const matchesQuery =
        !q ||
        l.assetName.toLowerCase().includes(q) ||
        l.assetId.toLowerCase().includes(q) ||
        l.logId.toLowerCase().includes(q) ||
        l.handledBy.toLowerCase().includes(q)
      return matchesType && matchesQuery
    })
    // LOGS are authored newest-first; reverse for oldest-first.
    return sortOrder === 'Newest First' ? base : [...base].reverse()
  }, [query, txnType, sortOrder])

  const exportCsv = () => {
    const header = 'Timestamp,Log ID,Asset ID,Asset Name,Transaction Type,Qty,Handled By,Notes\n'
    const rows = LOGS.map(
      (l) =>
        `"${l.timestamp}","${l.logId}","${l.assetId}","${l.assetName}","${l.transaction}","${l.qty}","${l.handledBy}","${l.notes}"`,
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lumiere-warehouse-logs.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ConsoleLayout>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Logistics &amp; Dispatch · Movement Record · Warehouse Operations
          </p>
          <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-foreground lg:text-4xl">
            Warehouse Activity &amp; Inventory Logs
          </h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search logs, account ID, IP address..."
              className="w-full rounded-md border border-input bg-card py-2.5 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-72"
            />
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative">
          <select
            value={txnType}
            onChange={(e) => setTxnType(e.target.value)}
            aria-label="Filter by transaction type"
            className="appearance-none rounded-md border border-border bg-card py-2 pl-4 pr-9 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-card-foreground outline-none transition hover:bg-muted focus:border-primary focus:ring-2 focus:ring-ring/30"
          >
            {txnTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="relative">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            aria-label="Sort order"
            className="appearance-none rounded-md border border-border bg-card py-2 pl-4 pr-9 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-card-foreground outline-none transition hover:bg-muted focus:border-primary focus:ring-2 focus:ring-ring/30"
          >
            <option value="Newest First">Newest First</option>
            <option value="Oldest First">Oldest First</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {filtered.length} Records
        </span>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[960px] text-left">
          <thead>
            <tr className="bg-muted/60">
              {['Timestamp', 'Log ID', 'Asset ID', 'Asset Name', 'Transaction Type', 'Qty', 'Handled By', 'Status / Notes'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-card-foreground"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-xs text-muted-foreground">
                  No warehouse movements match your search.
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="border-t border-border/60 align-middle">
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-card-foreground">
                    {l.timestamp}
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">{l.logId}</td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">{l.assetId}</td>
                  <td className="px-4 py-4 text-xs font-medium text-card-foreground">{l.assetName}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-card-foreground">
                    {l.transaction}
                  </td>
                  <td className="px-4 py-4 text-xs font-semibold text-card-foreground">{l.qty}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">
                    {l.handledBy}
                  </td>
                  <td className="px-4 py-4 text-xs leading-relaxed text-muted-foreground">{l.notes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ConsoleLayout>
  )
}
