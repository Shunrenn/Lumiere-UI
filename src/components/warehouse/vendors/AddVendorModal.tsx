import { useState } from 'react'
import { X } from 'lucide-react'
import { addVendor, updateVendor, type VendorStatus, type WarehouseVendor } from '@/lib/warehouse-vendors'

const STATUSES: VendorStatus[] = ['Active', 'On Hold', 'Inactive']
const CATEGORIES = ['Linens & Textiles', 'Florals', 'Furniture Rental', 'Lighting', 'Printing & Signage', 'Props & Decor', 'Staging & Fabrication', 'General Supplier', 'Other'] as const

interface AddVendorModalProps {
  onClose: () => void
  // Receives the freshly registered vendor so a caller opening this from a
  // selector can immediately select it.
  onCreated?: (vendor: WarehouseVendor) => void
  vendor?: WarehouseVendor
}

export function AddVendorModal({ onClose, onCreated, vendor: editingVendor }: AddVendorModalProps) {
  const [name, setName] = useState(editingVendor?.name ?? '')
  const [contactName, setContactName] = useState(editingVendor?.contactName ?? '')
  const [email, setEmail] = useState(editingVendor?.email ?? '')
  const [phone, setPhone] = useState(editingVendor?.phone ?? '')
  const [specialty, setSpecialty] = useState(editingVendor?.specialty ?? '')
  const [category, setCategory] = useState(editingVendor?.category ?? '')
  const [address, setAddress] = useState(editingVendor?.address ?? '')
  const [city, setCity] = useState(editingVendor?.city ?? '')
  const [leadTimeValue, setLeadTimeValue] = useState(String(editingVendor?.leadTimeValue ?? 24))
  const [leadTimeUnit, setLeadTimeUnit] = useState<'hours' | 'days'>(editingVendor?.leadTimeUnit ?? 'hours')
  const [status, setStatus] = useState<VendorStatus>(editingVendor?.status ?? 'Active')
  const [statusReason, setStatusReason] = useState(editingVendor?.statusReason ?? '')
  const [performanceNotes, setPerformanceNotes] = useState('')

  const emailValid = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const phoneValid = !phone.trim() || /^(?:\+63|0)9\d{9}$/.test(phone.replace(/[\s-]/g, ''))
  const canSubmit = name.trim().length > 0 && category.length > 0 && emailValid && phoneValid
  // Spell out what is still missing — a silently disabled submit button reads
  // as a broken form.
  const missing = [
    name.trim().length === 0 ? 'vendor name' : null,
    category.length === 0 ? 'category' : null,
  ].filter(Boolean)

  const fieldClass =
    'rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30'
  const labelClass = 'text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground'

  const handleSubmit = () => {
    const draft = {
      name,
      contactName,
      email,
      phone,
      specialty,
      category,
      address,
      city,
      leadTimeValue: Number(leadTimeValue) || 24,
      leadTimeUnit,
      status,
      statusReason: status === 'Active' ? '' : statusReason,
      performanceNotes,
    }
    if (editingVendor) updateVendor(editingVendor.id, draft)
    else onCreated?.(addVendor(draft))
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        // Stops the click from also reaching a parent modal's backdrop when
        // this is opened inline from a vendor selector.
        event.stopPropagation()
        onClose()
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Vendor registry
            </p>
            <h2 className="mt-1 font-serif text-xl font-medium text-card-foreground">{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto px-6 py-5">
          <label className="col-span-2 flex flex-col gap-1.5">
            <span className={labelClass}>Vendor name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Northbay Event Supply"
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Contact person</span>
            <input value={contactName} onChange={(event) => setContactName(event.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1.5"><span className={labelClass}>Category *</span><select value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass}><option value="">Select category</option>{CATEGORIES.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Lead time</span>
            <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={leadTimeValue}
              onChange={(event) => setLeadTimeValue(event.target.value)}
              className={fieldClass}
            />
            <select value={leadTimeUnit} onChange={(event) => setLeadTimeUnit(event.target.value as 'hours' | 'days')} className={fieldClass}><option value="hours">hours</option><option value="days">days</option></select></div>
          </label>
          <label className="col-span-2 flex flex-col gap-1.5"><span className={labelClass}>Address</span><textarea value={address} onChange={(event) => setAddress(event.target.value)} rows={2} className={fieldClass} /></label>
          <label className="flex flex-col gap-1.5"><span className={labelClass}>City</span><input value={city} onChange={(event) => setCity(event.target.value)} className={fieldClass} /></label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
            />
          </label>
          {status !== 'Active' && <label className="col-span-2 flex flex-col gap-1.5"><span className={labelClass}>Status reason (optional)</span><textarea value={statusReason} onChange={(event) => setStatusReason(event.target.value)} rows={2} className={fieldClass} /></label>}
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Phone</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} />
          </label>
          <label className="col-span-2 flex flex-col gap-1.5">
            <span className={labelClass}>Specialty</span>
            <input
              value={specialty}
              onChange={(event) => setSpecialty(event.target.value)}
              placeholder="e.g. Linens, runners & tablescape textiles"
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as VendorStatus)}
              className={fieldClass}
            >
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1.5">
            <span className={labelClass}>Performance notes</span>
            <textarea
              value={performanceNotes}
              onChange={(event) => setPerformanceNotes(event.target.value)}
              rows={2}
              placeholder="Optional — sourcing context, pricing tier, reliability…"
              className={fieldClass}
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <p className="text-[0.62rem] text-muted-foreground">
            {missing.length > 0 ? `Still needed: ${missing.join(' and ')}.` : 'Ready to register.'}
          </p>
          <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
          >
            {editingVendor ? 'Save Changes' : 'Register vendor'}
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}
