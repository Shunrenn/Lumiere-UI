// Canonical data layer for the Vendor Management module.
// Renders authoritative backend vendor records with rich canonical fallback directory.
import { useEffect, useSyncExternalStore } from 'react'
import { createVendorApi, fetchVendorsApi, type VendorDto } from '@/features/vendors/api/vendorApi'

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

export const CANONICAL_VENDORS: WarehouseVendor[] = [
  {
    id: 'ven-01',
    name: 'ProAudio & Staging Solutions Inc.',
    contactName: 'Marco Santos',
    email: 'marco@proaudioph.com',
    phone: '+63 917 555 1024',
    category: 'Staging & Trussing',
    address: 'BGC Corporate Center, Taguig City',
    city: 'Taguig',
    specialty: 'Line Array Audio, Trussing & Velvet Staging',
    leadTimeValue: 24,
    leadTimeUnit: 'hours',
    leadTimeHours: 24,
    status: 'Active',
    performanceNotes: 'Primary contractor for Solstice Motors & Gala events. Reliable 24h turnaround.',
    orderHistory: [
      { id: 'ord-01', date: '2026-09-15', itemName: 'Velvet Stage Platform 4x8', quantity: 8, cost: 34000, status: 'Delivered' },
      { id: 'ord-02', date: '2026-09-22', itemName: 'L-Acoustics K2 Line Array', quantity: 4, cost: 392000, status: 'Delivered' },
    ],
  },
  {
    id: 'ven-02',
    name: 'Luxe Textile & Drapery Mills',
    contactName: 'Elena Vance',
    email: 'elena@luxetextiles.ph',
    phone: '+63 918 555 3321',
    category: 'Fabrics & Upholstery',
    address: 'Ortigas East, Pasig City',
    city: 'Pasig',
    specialty: 'Velvet Linens, Custom Drapes & Silk Ribbon',
    leadTimeValue: 48,
    leadTimeUnit: 'hours',
    leadTimeHours: 48,
    status: 'Active',
    performanceNotes: 'Supplies high-end Midnight Black velvet, blush silk, and custom backdrop fabrics.',
    orderHistory: [
      { id: 'ord-03', date: '2026-09-18', itemName: 'Ivory Satin Ribbon Roll', quantity: 30, cost: 14400, status: 'Delivered' },
    ],
  },
  {
    id: 'ven-03',
    name: 'Spectra Lighting & Special Effects',
    contactName: 'Carlos Reyes',
    email: 'carlos@spectralighting.ph',
    phone: '+63 920 555 8890',
    category: 'Lighting & SFX',
    address: 'Scout Area, Quezon City',
    city: 'Quezon City',
    specialty: 'Arri SkyPanels, Beam Moving Heads, Cryo Fog FX',
    leadTimeValue: 12,
    leadTimeUnit: 'hours',
    leadTimeHours: 12,
    status: 'Active',
    performanceNotes: 'Preferred vendor for stage wash and moving heads. Expedited delivery available.',
    orderHistory: [
      { id: 'ord-04', date: '2026-09-28', itemName: 'CO2 Cryo Jet FX Unit', quantity: 2, cost: 97500, status: 'In Transit' },
    ],
  },
  {
    id: 'ven-04',
    name: 'Industrial Rigging & Hardware Depot',
    contactName: 'Roberto Lim',
    email: 'roberto@indrigging.com',
    phone: '+63 915 555 7744',
    category: 'Hardware & Rigging',
    address: 'Port Area, Manila',
    city: 'Manila',
    specialty: 'Galvanized Safety Cables, Heavy-Duty Clamps, Gaffer Tape',
    leadTimeValue: 24,
    leadTimeUnit: 'hours',
    leadTimeHours: 24,
    status: 'Active',
    performanceNotes: 'Certified safety rigging supplier with batch compliance certs.',
    orderHistory: [],
  },
  {
    id: 'ven-05',
    name: 'Legazpi Party & Event Rentals',
    contactName: 'Sofia Castillo',
    email: 'sofia@legazpirentals.ph',
    phone: '+63 917 555 0011',
    category: 'Furniture & Decor Rental',
    address: 'Rizal St., Legazpi City, Albay',
    city: 'Legazpi',
    specialty: 'Gold Chiavari Chairs, 60in Banquet Tables, Farmhouse Tables',
    leadTimeValue: 3,
    leadTimeUnit: 'days',
    leadTimeHours: 72,
    status: 'Active',
    performanceNotes: 'Regional furniture supplier for large banquets with dedicated logistics fleet.',
    orderHistory: [],
  },
  {
    id: 'ven-06',
    name: 'Bicol Power Rental Services',
    contactName: 'Danilo Cruz',
    email: 'danilo@bicolpower.ph',
    phone: '+63 912 888 4400',
    category: 'Power & Generators',
    address: 'Daraga, Albay',
    city: 'Daraga',
    specialty: '50 kVA Silent Diesel Generators, Distribution Boards',
    leadTimeValue: 6,
    leadTimeUnit: 'hours',
    leadTimeHours: 6,
    status: 'Active',
    performanceNotes: 'On-demand mobile generator dispatch with certified electrical technicians.',
    orderHistory: [],
  },
  {
    id: 'ven-07',
    name: 'Prime Tech & Media Solutions',
    contactName: 'Andrea Tan',
    email: 'andrea@primetechph.com',
    phone: '+63 919 555 9922',
    category: 'IT & Media Hardware',
    address: 'High Street, BGC, Taguig',
    city: 'Taguig',
    specialty: 'Apple Workstations, iPads, Canon Cameras, Thermal Label Printers',
    leadTimeValue: 24,
    leadTimeUnit: 'hours',
    leadTimeHours: 24,
    status: 'Active',
    performanceNotes: 'Enterprise IT distributor with direct warranty support.',
    orderHistory: [],
  },
]

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

export function normalizeVendorStatus(rawStatus?: string): VendorStatus {
  if (!rawStatus) return 'Active'
  const s = String(rawStatus).trim().toLowerCase()
  if (s === 'on hold' || s === 'onhold' || s === 'hold') return 'On Hold'
  if (s === 'inactive' || s === 'disabled') return 'Inactive'
  return 'Active'
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

// ---------- Live vendor registry store with localStorage Cache ----------

const listeners = new Set<() => void>()
const STORAGE_KEY = 'lumiere_warehouse_vendors'

let cachedVendors: WarehouseVendor[] | null = null

function loadCachedVendors(): WarehouseVendor[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (e) {
      console.warn('Failed to load vendors from localStorage', e)
    }
  }
  return [...CANONICAL_VENDORS]
}

function publish() {
  if (typeof window !== 'undefined' && cachedVendors) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedVendors))
      window.dispatchEvent(new CustomEvent('lumiere:vendors-updated', { detail: cachedVendors }))
    } catch (e) {
      console.warn('Failed to save vendors to localStorage', e)
    }
  }
  listeners.forEach((listener) => listener())
}

export function getWarehouseVendors(): WarehouseVendor[] {
  if (!cachedVendors) {
    cachedVendors = loadCachedVendors()
  }
  return cachedVendors
}

export function useWarehouseVendors(): WarehouseVendor[] {
  useEffect(() => {
    let active = true
    fetchVendorsApi().then((apiVendors) => {
      if (!active || !apiVendors.length) return
      const mapped: WarehouseVendor[] = apiVendors.map((v) => mapVendorDtoToWarehouseVendor(v))
      const byId = new Map(getWarehouseVendors().map((v) => [v.id, v]))
      mapped.forEach((v) => byId.set(v.id, v))
      cachedVendors = Array.from(byId.values())
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
    () => getWarehouseVendors(),
    () => getWarehouseVendors(),
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

export function deleteVendor(id: string) {
  const existing = getWarehouseVendors()
  cachedVendors = existing.filter((vendor) => vendor.id !== id)
  publish()
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
