// Deterministic seed data for the Vendor Management module. Vendors are
// referenced by id from both the Asset Catalog (primary/backup vendor chips)
// and Replenishment & Deficits (PO vendor selector), so this file has no
// dependencies on either — it is the leaf of the three new modules.
//
// The seed is only the *starting* registry: vendors created through the
// "Add New Vendor" flow (Vendor Management, or inline from any vendor
// selector) are pushed into the same store, so every dropdown in the app
// reads from one live source instead of a hardcoded array.
import { useSyncExternalStore } from 'react'

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

const VENDOR_SEED: Array<Omit<WarehouseVendor, 'orderHistory'>> = [
  {
    id: 'ven-01',
    name: 'Manila Grand Rentals',
    contactName: 'Carlo Mendoza',
    email: 'carlo@manilagrandrentals.ph',
    phone: '+63 917 402 8811',
    specialty: 'Ceremony seating & banquet furniture',
    leadTimeHours: 18,
    status: 'Active',
    performanceNotes:
      'Reliable turnaround on ceremony chairs. Slight delays during December peak season — confirm two weeks out.',
  },
  {
    id: 'ven-02',
    name: 'Lustre & Co. Lighting',
    contactName: 'Bea Villanueva',
    email: 'bea@lustreandco.com',
    phone: '+63 918 220 4471',
    specialty: 'Statement lighting & chandeliers',
    leadTimeHours: 36,
    status: 'Active',
    performanceNotes: 'Premium tier vendor. Excellent condition on returns, but pricier than backup options.',
  },
  {
    id: 'ven-03',
    name: 'Atelier Bespoke Works',
    contactName: 'Ronnie Cabrera',
    email: 'ronnie@atelierbespoke.ph',
    phone: '+63 920 115 7732',
    specialty: 'Custom backdrops & bespoke fabrication',
    leadTimeHours: 72,
    status: 'Active',
    performanceNotes: 'Best-in-class craftsmanship for bespoke builds. Needs long lead time — flag early.',
  },
  {
    id: 'ven-04',
    name: 'Delfin Textiles Supply',
    contactName: 'Ana Reyes',
    email: 'ana@delfintextiles.ph',
    phone: '+63 915 887 2290',
    specialty: 'Linens, runners & tablescape textiles',
    leadTimeHours: 24,
    status: 'Active',
    performanceNotes: 'Consistent quality, competitive pricing. Good default for stockroom replenishment.',
  },
  {
    id: 'ven-05',
    name: 'Cordillera Floral Trading',
    contactName: 'Miguel Santos',
    email: 'miguel@cordilleratrading.ph',
    phone: '+63 917 664 5510',
    specialty: 'Floristry & greenery installations',
    leadTimeHours: 12,
    status: 'On Hold',
    performanceNotes: 'On hold pending resolution of last invoice dispute — route to backup vendor for now.',
  },
  {
    id: 'ven-06',
    name: 'Baguio Woodcraft Rentals',
    contactName: 'Jericho Alvarez',
    email: 'jericho@baguiowoodcraft.ph',
    phone: '+63 919 330 1298',
    specialty: 'Rental furniture & wooden fixtures',
    leadTimeHours: 30,
    status: 'Active',
    performanceNotes: 'Solid backup vendor for furniture rentals when Manila Grand is fully booked.',
  },
  {
    id: 'ven-07',
    name: 'Metro Office Provisions',
    contactName: 'Grace Tan',
    email: 'grace@metroprovisions.ph',
    phone: '+63 916 502 9987',
    specialty: 'Office equipment & operational assets',
    leadTimeHours: 48,
    status: 'Inactive',
    performanceNotes: 'Account deactivated after repeated shipment delays in Q2. Re-evaluate before reactivating.',
  },
]

function hashOf(value: string) {
  return Math.abs(value.split('').reduce((sum, char) => sum + char.charCodeAt(0) * 31, 7))
}

const ORDER_ITEMS = [
  'Tiffany Chairs',
  'Crystal Chandelier',
  'Silk Table Runners',
  'Pillar Candles',
  'Floral Arch Frame',
  'Gold Chargers',
  'String Lights',
  'Velvet Sofa Set',
]

function buildOrderHistory(seed: number): VendorOrderRecord[] {
  const count = 2 + (seed % 3)
  const statuses: VendorOrderRecord['status'][] = ['Delivered', 'Delivered', 'In Transit', 'Awaiting Confirmation']
  return Array.from({ length: count }, (_, i) => {
    const itemSeed = (seed + i * 13) % ORDER_ITEMS.length
    const day = 1 + ((seed + i * 7) % 27)
    const month = 1 + ((seed + i * 3) % 12)
    return {
      id: `${seed}-order-${i}`,
      date: `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      itemName: ORDER_ITEMS[itemSeed],
      quantity: 4 + ((seed + i * 5) % 40),
      cost: 3200 + ((seed + i * 211) % 18000),
      status: statuses[(seed + i * 9) % statuses.length],
    }
  })
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
  cachedVendors = VENDOR_SEED.map((vendor) => ({
    ...vendor,
    orderHistory: buildOrderHistory(hashOf(vendor.id)),
  }))
  globalStore[storeKey] = cachedVendors
  return cachedVendors
}

export function useWarehouseVendors(): WarehouseVendor[] {
  getWarehouseVendors()
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

// Registers a brand new vendor and returns it, so callers (e.g. an inline
// "+ Add New Vendor" option inside a selector) can immediately select it.
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
    performanceNotes: draft.performanceNotes?.trim() || 'Newly registered vendor — no performance history yet.',
    orderHistory: [],
  }
  cachedVendors = [vendor, ...existing]
  publish()
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
