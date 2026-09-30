// Canonical data layer for the Vendor Management module.
// Renders authoritative backend vendor records only. Zero frontend fixture records.
import { useEffect, useSyncExternalStore } from 'react'
import { createVendorApi, fetchVendorsApi, type VendorDto } from './vendorApi'

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
    name: v.name || 'Unnamed Vendor',
    contactName: deriveContactName(v),
    email: v.email || '—',
    phone: v.phone || '—',
    specialty: v.specialty || 'General Supplier',
    leadTimeHours: 24,
    status: normalizeVendorStatus(v.status),
    performanceNotes: v.address ? `Address: ${v.address}` : '',
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
  specialty: string
  leadTimeHours: number
  status: VendorStatus
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
    () => cachedVendors ?? [],
    () => cachedVendors ?? [],
  )
}

export interface VendorDraft {
  name: string
  contactName: string
  email: string
  phone: string
  specialty: string
  leadTimeHours: number
  status: VendorStatus
  performanceNotes?: string
}

// Registers a brand new vendor and returns it
export function addVendor(draft: VendorDraft): WarehouseVendor {
  const existing = getWarehouseVendors()
  const vendor: WarehouseVendor = {
    id: `ven-custom-${Date.now()}`,
    name: draft.name.trim(),
    contactName: draft.contactName.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    specialty: draft.specialty.trim(),
    leadTimeHours: Math.max(1, draft.leadTimeHours),
    status: draft.status,
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
    specialty: vendor.specialty,
  })

  return vendor
}

export function updateVendor(id: string, changes: Partial<Omit<WarehouseVendor, 'id'>>) {
  const existing = getWarehouseVendors()
  cachedVendors = existing.map((vendor) => (vendor.id === id ? { ...vendor, ...changes } : vendor))
  publish()
}

export function getVendorById(id: string | undefined): WarehouseVendor | undefined {
  if (!id) return undefined
  return getWarehouseVendors().find((vendor) => vendor.id === id)
}
