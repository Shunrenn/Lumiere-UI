import { useState } from 'react'
import { X } from 'lucide-react'
import type { WarehouseVendor } from '@/lib/warehouse-vendors'
import { getCatalogAssets } from '@/lib/warehouse-catalog'
import { Pill } from '@/components/warehouse/shared/Pill'
import { VENDOR_STATUS_TONE } from '@/components/warehouse/replenishment/tone'
import { cn } from '@/lib/utils'

interface VendorDetailModalProps {
  vendor: WarehouseVendor
  onClose: () => void
  onSaveNotes: (vendorId: string, notes: string) => void
  onSaveContact: (vendorId: string, contact: { contactName: string; email: string; phone: string }) => void
  onDeactivate: (vendorId: string) => void
}

export function VendorDetailModal({ vendor, onClose, onSaveNotes, onSaveContact, onDeactivate }: VendorDetailModalProps) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(vendor.performanceNotes)
  const [editingContact, setEditingContact] = useState(false)
  const [contactName, setContactName] = useState(vendor.contactName)
  const [email, setEmail] = useState(vendor.email)
  const [phone, setPhone] = useState(vendor.phone)

  const taggedItems = getCatalogAssets().filter(
    (asset) => asset.primaryVendorId === vendor.id || asset.backupVendorId === vendor.id,
  )

  const handleSave = () => {
    onSaveNotes(vendor.id, notes)
    setEditing(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[40rem] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {vendor.specialty}
            </p>
            <h2 className="mt-1 font-serif text-xl font-medium text-card-foreground">{vendor.name}</h2>
            <div className="mt-2">
              <Pill tone={VENDOR_STATUS_TONE[vendor.status]}>{vendor.status}</Pill>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {editingContact ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Contact</span>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Phone</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                />
              </label>
              <div className="col-span-full flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setContactName(vendor.contactName)
                    setEmail(vendor.email)
                    setPhone(vendor.phone)
                    setEditingContact(false)
                  }}
                  className="rounded-md border border-border px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition-colors hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSaveContact(vendor.id, { contactName, email, phone })
                    setEditingContact(false)
                  }}
                  className="rounded-md bg-primary px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Save changes
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <InfoField label="Contact" value={vendor.contactName} />
              <InfoField label="Email" value={vendor.email} />
              <InfoField label="Phone" value={vendor.phone} />
            </div>
          )}

          <div className="mt-6">
            <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Tagged items
            </p>
            {taggedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No catalog items currently routed to this vendor.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {taggedItems.map((item) => (
                  <span
                    key={item.id}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.6rem] font-semibold',
                      item.primaryVendorId === vendor.id
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground',
                    )}
                  >
                    {item.primaryVendorId === vendor.id ? 'Primary' : 'Backup'} · {item.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Order history
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-background">
                    {['Date', 'Item', 'Qty', 'Cost', 'Status'].map((h) => (
                      <th key={h} className="px-3.5 py-2.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vendor.orderHistory.map((order) => (
                    <tr key={order.id} className="border-t border-border bg-card">
                      <td className="px-3.5 py-2.5 text-xs text-muted-foreground">{order.date}</td>
                      <td className="px-3.5 py-2.5 text-sm text-card-foreground">{order.itemName}</td>
                      <td className="px-3.5 py-2.5 text-xs text-muted-foreground">{order.quantity}</td>
                      <td className="px-3.5 py-2.5 text-xs text-muted-foreground">₱{order.cost.toLocaleString()}</td>
                      <td className="px-3.5 py-2.5 text-xs text-muted-foreground">{order.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Performance notes
              </p>
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-primary hover:underline"
                >
                  Edit notes
                </button>
              )}
            </div>
            {editing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotes(vendor.performanceNotes)
                      setEditing(false)
                    }}
                    className="rounded-md border border-border px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition-colors hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-md bg-primary px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Save notes
                  </button>
                </div>
              </div>
            ) : (
              <p className="rounded-md border border-border bg-background px-3.5 py-3 text-sm text-muted-foreground">
                {notes}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={() => onDeactivate(vendor.id)}
            className="rounded-md border border-destructive/40 px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-destructive transition-colors hover:bg-destructive/10"
          >
            {vendor.status === 'Inactive' ? 'Reactivate' : 'Deactivate'}
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditingContact(true)}
              className="rounded-md border border-border px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition-colors hover:bg-accent"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3.5 py-2.5">
      <p className="text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm text-card-foreground">{value}</p>
    </div>
  )
}
