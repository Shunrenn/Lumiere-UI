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
    logId: 'LOG-88102',
    assetId: 'AST-LGT-001',
    assetName: 'Modular Aluminium Truss 3m',
    transaction: 'Egress Checkout',
    qty: '12',
    handledBy: 'Marcus Vance',
    notes: 'Checked out for Grand Ballroom Gala 2026.',
  },
  {
    id: 'w-2',
    timestamp: 'Jun 07 2026 · 08:12 AM',
    logId: 'LOG-88099',
    assetId: 'AST-AUD-109',
    assetName: 'Wireless Receiver Rack System 4-Ch',
    transaction: 'Ingress Checkin',
    qty: '2',
    handledBy: 'Gabriel Santos',
    notes: 'Returned from Sunset Bay Wedding with zero damage.',
  },
  {
    id: 'w-3',
    timestamp: 'Jun 06 2026 · 05:30 PM',
    logId: 'LOG-88085',
    assetId: 'AST-DRP-044',
    assetName: 'Silk Sheer Swag Fabric Champagne 10m',
    transaction: 'Damage Flagged',
    qty: '3',
    handledBy: 'David Kim',
    notes: 'Tear detected on hemline; routed for seamstress repair.',
  },
  {
    id: 'w-4',
    timestamp: 'Jun 06 2026 · 02:15 PM',
    logId: 'LOG-88072',
    assetId: 'AST-STG-201',
    assetName: 'Heavy Baseplate Steel 800mm x 800mm',
    transaction: 'Restock Intake',
    qty: '10',
    handledBy: 'Maria Hernandez',
    notes: 'New inventory intake received from primary vendor.',
  },
  {
    id: 'w-5',
    timestamp: 'Jun 05 2026 · 11:20 AM',
    logId: 'LOG-88050',
    assetId: 'AST-LGT-005',
    assetName: 'High-Lumen Moving Head Spot 500W',
    transaction: 'Egress Checkout',
    qty: '16',
    handledBy: 'Elena Rostova',
    notes: 'Staged and dispatched for Fashion Week Runway.',
  },
]

export function WarehouseLogsPage() {
  const [query, setQuery] = useState('')
  const [txnType, setTxnType] = useState('All')
  const [sortOrder, setSortOrder] = useState('Newest First')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const txnTypes = useMemo(
    () => ['All', ...Array.from(new Set(LOGS.map((l) => l.transaction)))],
    [],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = LOGS.filter((l) => {
      const matchesType = txnType === 'All' || l.transaction === txnType
      const matchesQuery =
        !q ||
        l.assetName.toLowerCase().includes(q) ||
        l.assetId.toLowerCase().includes(q) ||
        l.logId.toLowerCase().includes(q) ||
        l.handledBy.toLowerCase().includes(q)
      return matchesType && matchesQuery
    })
    return sortOrder === 'Newest First' ? base : [...base].reverse()
  }, [query, txnType, sortOrder])

  const exportCsv = () => {
    let exportRows = filtered
    if (fromDate) {
      const fromTime = new Date(fromDate).getTime()
      exportRows = exportRows.filter((r) => new Date(r.timestamp.split('·')[0].trim()).getTime() >= fromTime)
    }
    if (toDate) {
      const toTime = new Date(toDate).getTime() + 86400000
      exportRows = exportRows.filter((r) => new Date(r.timestamp.split('·')[0].trim()).getTime() <= toTime)
    }

    const header = 'Timestamp,Log ID,Asset ID,Asset Name,Transaction Type,Qty,Handled By,Notes\n'
    const rows = exportRows
      .map(
        (l) =>
          `"${l.timestamp}","${l.logId}","${l.assetId}","${l.assetName}","${l.transaction}","${l.qty}","${l.handledBy}","${l.notes}"`,
      )
      .join('\n')
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search logs, account ID, IP address..."
              className="w-full rounded-md border border-input bg-card py-2.5 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-64"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-[0.6rem] font-bold uppercase tracking-wider">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-md border border-input bg-card px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-[0.6rem] font-bold uppercase tracking-wider">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-md border border-input bg-card px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>
          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setFromDate('')
                setToDate('')
              }}
              className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground underline px-1"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
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
