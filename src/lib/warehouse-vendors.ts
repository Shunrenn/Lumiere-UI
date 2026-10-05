// Canonical data layer for the Vendor Management module.
// Renders authoritative backend vendor records only. Zero frontend fixture records.
import { useEffect, useSyncExternalStore } from 'react'
import { createVendorApi, fetchVendorsApi, type VendorDto } from '@/features/vendors/api/vendorApi'

export function deriveContactName(v: VendorDto): string {
  if (v.contactName && v.contactName.trim()) return v.contactName.trim()
  if (Array.isArray(v.representatives) && v.representatives.length > 0) {
    const rep = v.representatives[0]
    const first = rep?.firstName?.trim() || ''
    const last = rep?.lastName?.trim() || ''
    const fullName = `${first} ${last}`.trim()
    if (fullName) return fullName
  }
  return 'No representative assigned'
}

export function mapVendorDtoToWarehouseVendor(v: VendorDto): WarehouseVendor {
  const canonicalId = v.id || v.vendorId || ''
  return {
    id: canonicalId,
    name: (v.name || 'Unnamed Vendor').replaceAll('&amp;', '&'),
    contactName: deriveContactName(v),
    email: v.email?.trim() || '',
    phone: v.phone?.trim() || '',
    category: 'General Supplier',
    address: v.address || '',
    city: '',
    specialty: v.specialty || 'General Supplier',
    leadTimeValue: 24,
    leadTimeUnit: 'hours',
    leadTimeHours: 24,
    status: normalizeVendorStatus(v.status),
    performanceNotes: v.address ? `Address: ${v.address}` : '',
    statusReason: '',
    orderHistory: [],
  }
}

export type VendorStatus = 'Active' | 'On Hold' | 'Inactive'

export interface VendorOrderRecord {
  id: string
  date: string
  itemName: string
  quantity: number
  cost: number
  status: 'Delivered' | 'In Transit' | 'Awaiting Confirmation'
}

export interface WarehouseVendor {
  id: string
  name: string
  contactName: string
  email: string
  phone: string
  category: string
  address: string
  city: string
  specialty: string
  leadTimeValue: number
  leadTimeUnit: 'hours' | 'days'
  leadTimeHours: number
  status: VendorStatus
  statusReason?: string
  performanceNotes: string
  orderHistory: VendorOrderRecord[]
}

// ---------- Live vendor registry store ----------

const listeners = new Set<() => void>()
const storeKey = '__warehouse_vendor_registry__'
type VendorGlobal = typeof globalThis & { [storeKey]?: WarehouseVendor[] }
const globalStore = globalThis as VendorGlobal

let cachedVendors: WarehouseVendor[] | null = globalStore[storeKey] ?? null

function publish() {
  globalStore[storeKey] = cachedVendors ?? []
  listeners.forEach((listener) => listener())
}

export function getWarehouseVendors(): WarehouseVendor[] {
  if (cachedVendors) return cachedVendors
  cachedVendors = []
  globalStore[storeKey] = cachedVendors
  return cachedVendors
}

export function normalizeVendorStatus(rawStatus?: string): VendorStatus {
  if (!rawStatus) return 'Active'
  const s = String(rawStatus).trim().toLowerCase()
  if (s === 'on hold' || s === 'onhold' || s === 'hold') return 'On Hold'
  if (s === 'inactive' || s === 'disabled') return 'Inactive'
  return 'Active'
}

const EMPTY_VENDORS: WarehouseVendor[] = []

export function useWarehouseVendors(): WarehouseVendor[] {
  useEffect(() => {
    let active = true
    fetchVendorsApi().then((apiVendors) => {
      if (!active) return
      const mapped: WarehouseVendor[] = apiVendors.map((v) => mapVendorDtoToWarehouseVendor(v))
      cachedVendors = mapped
      publish()
    })
    return () => {
      active = false
    }
  }, [])

  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => cachedVendors ?? EMPTY_VENDORS,
    () => cachedVendors ?? EMPTY_VENDORS,
  )
}

export interface VendorDraft {
  name: string
  contactName: string
  email: string
  phone: string
  category: string
  address: string
  city: string
  specialty: string
  leadTimeValue: number
  leadTimeUnit: 'hours' | 'days'
  status: VendorStatus
  statusReason?: string
  performanceNotes?: string
}

// Registers a brand new vendor and returns it
export function addVendor(draft: VendorDraft): WarehouseVendor {
  const existing = getWarehouseVendors()
  const vendor: WarehouseVendor = {
    id: `ven-custom-${Date.now()}`,
    name: draft.name.trim().replaceAll('&amp;', '&'),
    contactName: draft.contactName.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    category: draft.category,
    address: draft.address.trim(),
    city: draft.city.trim(),
    specialty: draft.specialty.trim(),
    leadTimeValue: Math.max(1, draft.leadTimeValue),
    leadTimeUnit: draft.leadTimeUnit,
    leadTimeHours: Math.max(1, draft.leadTimeValue) * (draft.leadTimeUnit === 'days' ? 24 : 1),
    status: draft.status,
    statusReason: draft.statusReason?.trim(),
    performanceNotes: draft.performanceNotes?.trim() || 'Newly registered vendor.',
    orderHistory: [],
  }
  cachedVendors = [vendor, ...existing]
  publish()

  void createVendorApi({
    name: vendor.name,
    contactName: vendor.contactName,
    email: vendor.email,
    phone: vendor.phone,
    specialty: vendor.specialty || undefined,
  })

  return vendor
}

export function updateVendor(id: string, changes: Partial<Omit<WarehouseVendor, 'id'>>) {
  const existing = getWarehouseVendors()
  cachedVendors = existing.map((vendor) => {
    if (vendor.id !== id) return vendor
    const next = { ...vendor, ...changes, name: (changes.name ?? vendor.name).replaceAll('&amp;', '&') }
    next.leadTimeHours = next.leadTimeValue * (next.leadTimeUnit === 'days' ? 24 : 1)
    return next
  })
  publish()
}

export function formatVendorLeadTime(vendor: Pick<WarehouseVendor, 'leadTimeValue' | 'leadTimeUnit'>) {
  return `${vendor.leadTimeValue}${vendor.leadTimeUnit === 'days' ? 'd' : 'h'}`
}

export function getVendorById(id: string | undefined): WarehouseVendor | undefined {
  if (!id) return undefined
  return getWarehouseVendors().find((vendor) => vendor.id === id)
}
