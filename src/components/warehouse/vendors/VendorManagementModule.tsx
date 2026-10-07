import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Lock, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { formatVendorLeadTime, mapVendorDtoToWarehouseVendor, updateVendor, deleteVendor, useWarehouseVendors, type VendorStatus, type WarehouseVendor } from '@/lib/warehouse-vendors'
import { fetchVendorsResultApi } from '@/features/vendors/api/vendorApi'
import { Pill } from '@/components/warehouse/shared/Pill'
import { VENDOR_STATUS_TONE } from '@/components/warehouse/replenishment/tone'
import { VendorDetailModal } from '@/components/warehouse/vendors/VendorDetailModal'
import { AddVendorModal } from '@/components/warehouse/vendors/AddVendorModal'
import { cn } from '@/lib/utils'

const STATUS_FILTERS: Array<VendorStatus | 'All'> = ['All', 'Active', 'On Hold', 'Inactive']

type FetchState =
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'auth-error'; message: string; httpStatus: number }
  | { status: 'request-error'; message: string; httpStatus: number }

export function VendorManagementModule() {
  const initialVendors = useWarehouseVendors()
  const [vendors, setVendors] = useState<WarehouseVendor[]>(initialVendors)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<VendorStatus | 'All'>('All')
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<WarehouseVendor | null>(null)
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'loading' })

  // Keep vendors in sync with initialVendors from useWarehouseVendors store
  useEffect(() => {
    setVendors(initialVendors)
  }, [initialVendors])

  const loadVendors = useCallback(async () => {
    setFetchState({ status: 'loading' })
    const result = await fetchVendorsResultApi()
    if (result.kind === 'success') {
      const mapped = result.vendors.map((v) => mapVendorDtoToWarehouseVendor(v))
      setVendors((prev) => {
        const ids = new Set(prev.map((item) => item.id))
        const newVendors = mapped.filter((item) => !ids.has(item.id))
        return [...newVendors, ...prev]
      })
      setFetchState({ status: 'success' })
    } else if (result.kind === 'auth-error') {
      setFetchState({ status: 'auth-error', message: result.message, httpStatus: result.status })
    } else {
      setFetchState({ status: 'request-error', message: result.message, httpStatus: result.status })
    }
  }, [])

  useEffect(() => {
    loadVendors()
  }, [loadVendors])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (vendors || []).filter((vendor) => {
      if (!vendor) return false
      const matchesStatus = statusFilter === 'All' || vendor.status === statusFilter
      const matchesQuery =
        q.length === 0 ||
        (vendor.name || '').toLowerCase().includes(q) ||
        (vendor.specialty || '').toLowerCase().includes(q) ||
        (vendor.contactName || '').toLowerCase().includes(q) ||
        vendor.category.toLowerCase().includes(q) || vendor.city.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [vendors, query, statusFilter])

  const selectedVendor = vendors.find((vendor) => vendor.id === selectedVendorId) ?? null

  const handleSaveNotes = (vendorId: string, notes: string) => {
    updateVendor(vendorId, { performanceNotes: notes })
  }

  const handleSaveContact = (
    vendorId: string,
    contact: { contactName: string; email: string; phone: string },
  ) => {
    updateVendor(vendorId, contact)
  }

  const handleToggleStatus = (vendorId: string) => {
    const vendor = vendors.find((entry) => entry.id === vendorId)
    if (!vendor) return
    updateVendor(vendorId, { status: vendor.status === 'Inactive' ? 'Active' : 'Inactive' })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search vendors, category, city, specialty…"
            className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-3" aria-hidden="true" />
            Add vendor
          </button>
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={cn(
                'whitespace-nowrap rounded-full border px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition-colors',
                statusFilter === status
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent',
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-background">
              {['Vendor', 'Category', 'Specialty', 'Contact', 'Location', 'Lead time', 'Status', 'Actions'].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {fetchState.status === 'loading' && vendors.length === 0 ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="size-4 animate-spin text-primary" />
                      <span>Loading canonical vendor records…</span>
                    </div>
                  ) : fetchState.status === 'auth-error' && vendors.length === 0 ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <Lock className="size-5" />
                      </div>
                      <p className="font-medium text-foreground">Authentication Required</p>
                      <p className="max-w-md text-xs text-muted-foreground">
                        GET /api/vendors returned HTTP {fetchState.httpStatus}. {fetchState.message}
                      </p>
                      <button
                        type="button"
                        onClick={() => loadVendors()}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground transition hover:bg-accent"
                      >
                        <RefreshCw className="size-3.5" />
                        Retry authentication
                      </button>
                    </div>
                  ) : fetchState.status === 'request-error' && vendors.length === 0 ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                        <AlertTriangle className="size-5" />
                      </div>
                      <p className="font-medium text-foreground">Vendor Registry Unavailable</p>
                      <p className="max-w-md text-xs text-muted-foreground">
                        {fetchState.httpStatus > 0 ? `GET /api/vendors returned HTTP ${fetchState.httpStatus}. ` : ''}
                        {fetchState.message}
                      </p>
                      <button
                        type="button"
                        onClick={() => loadVendors()}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground transition hover:bg-accent"
                      >
                        <RefreshCw className="size-3.5" />
                        Retry request
                      </button>
                    </div>
                  ) : (
                    <span>{query ? 'No vendors match this search.' : 'No vendors registered.'}</span>
                  )}
                </td>
              </tr>
            )}
            {filtered.map((vendor) => (
              <tr
                key={vendor.id}
                onClick={() => setSelectedVendorId(vendor.id)}
                className="cursor-pointer border-t border-border bg-card transition-colors hover:bg-accent/60"
              >
                <td className="px-4 py-3.5">
                  <p className="text-sm font-medium text-card-foreground">{vendor.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{vendor.contactName}</p>
                </td>
                <td className="px-4 py-3.5 text-sm text-muted-foreground">{vendor.category}</td>
                <td className="px-4 py-3.5 text-sm text-muted-foreground">{vendor.specialty}</td>
                <td className="px-4 py-3.5">
                  {vendor.email || vendor.phone ? <><p className="text-xs text-muted-foreground">{vendor.email}</p><p className="mt-0.5 text-xs text-muted-foreground">{vendor.phone}</p></> : <span className="text-sm text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3.5 text-sm text-muted-foreground">{vendor.city || '—'}</td>
                <td className="px-4 py-3.5 text-sm text-muted-foreground">{formatVendorLeadTime(vendor)}</td>
                <td className="px-4 py-3.5">
                  <Pill tone={VENDOR_STATUS_TONE[vendor.status] || 'positive'}>{vendor.status || 'Active'}</Pill>
                </td>
                <td className="px-4 py-3.5" onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingVendor(vendor)}
                      aria-label={`Edit ${vendor.name}`}
                      title="Edit vendor"
                      className="rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground cursor-pointer"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete vendor "${vendor.name}"?`)) {
                          deleteVendor(vendor.id)
                        }
                      }}
                      aria-label={`Delete ${vendor.name}`}
                      title="Delete vendor"
                      className="rounded-md p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedVendor && (
        <VendorDetailModal
          vendor={selectedVendor}
          onClose={() => setSelectedVendorId(null)}
          onSaveNotes={handleSaveNotes}
          onSaveContact={handleSaveContact}
          onDeactivate={handleToggleStatus}
        />
      )}

      {addOpen && (
        <AddVendorModal onClose={() => setAddOpen(false)} onCreated={(vendor) => setSelectedVendorId(vendor.id)} />
      )}
      {editingVendor && <AddVendorModal vendor={editingVendor} onClose={() => setEditingVendor(null)} />}
    </div>
  )
}
