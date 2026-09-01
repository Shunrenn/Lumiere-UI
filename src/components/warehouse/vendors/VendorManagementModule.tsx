import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { updateVendor, useWarehouseVendors, type VendorStatus } from '@/lib/warehouse-vendors'
import { Pill } from '@/components/warehouse/shared/Pill'
import { VENDOR_STATUS_TONE } from '@/components/warehouse/replenishment/tone'
import { VendorDetailModal } from '@/components/warehouse/vendors/VendorDetailModal'
import { AddVendorModal } from '@/components/warehouse/vendors/AddVendorModal'
import { cn } from '@/lib/utils'

const STATUS_FILTERS: Array<VendorStatus | 'All'> = ['All', 'Active', 'On Hold', 'Inactive']

export function VendorManagementModule() {
  const vendors = useWarehouseVendors()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<VendorStatus | 'All'>('All')
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return vendors.filter((vendor) => {
      const matchesStatus = statusFilter === 'All' || vendor.status === statusFilter
      const matchesQuery =
        q.length === 0 ||
        vendor.name.toLowerCase().includes(q) ||
        vendor.specialty.toLowerCase().includes(q) ||
        vendor.contactName.toLowerCase().includes(q)
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
            placeholder="Search vendors, specialty, contact"
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
              {['Vendor', 'Specialty', 'Contact', 'Lead time', 'Status'].map((heading) => (
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
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No vendors match this search.
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
                <td className="px-4 py-3.5 text-sm text-muted-foreground">{vendor.specialty}</td>
                <td className="px-4 py-3.5">
                  <p className="text-xs text-muted-foreground">{vendor.email}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{vendor.phone}</p>
                </td>
                <td className="px-4 py-3.5 text-sm text-muted-foreground">{vendor.leadTimeHours}h</td>
                <td className="px-4 py-3.5">
                  <Pill tone={VENDOR_STATUS_TONE[vendor.status]}>{vendor.status}</Pill>
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
    </div>
  )
}
