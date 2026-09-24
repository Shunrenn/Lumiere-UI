import { logAuditEvent } from '@/lib/audit-logger'
import * as damageApi from '@/lib/damageApi'
import { fetchAuditLogs } from '@/lib/auditApi'
import { API_BASE_URL, getAuthToken } from '@/lib/apiConfig'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type {
  AccountStatus,
  ActivityLog,
  DamageCustodyMode,
  DamageException,
  DamageSelfValidationRecord,
  DamageSignOff,
  DamageVerdict,
  EventUpdate,
  InventoryItem,
  NewEmployeeRecordDraft,
  NewEventDraft,
  NewStaffDraft,
  PortalEvent,
  ProcurementItem,
  ReorderDraft,
  Staff,
  StaffRole,
  StockStatus,
  SubRoleEmergencyUnblockMetadata,
  UserAction,
  Vendor,
} from '@/lib/types'
import { supabase } from '@/lib/supabase'
import {
  GROUND_CREW_TREE_SEED,
  PARENT_ROLES,
  collectPendingLeaves,
  isPermissionsConfigured,
  type SubRole,
  type SubRoleNode,
} from '@/lib/rbac'

// Map a portal_accounts row into the directory Staff shape used by the UI.
function rowToStaff(row: any): Staff {
  const sessionStatus = (row.session_status ?? 'Offline Session') as Staff['sessionStatus']
  const unclaimedTemp = !!row.temporary_password
  // A suspended session outranks everything; an unclaimed temp password means
  // the account is still pending first login; otherwise it is active. Locked is
  // layered on at display time from open account-locked requests.
  const accountStatus: AccountStatus =
    sessionStatus === 'Suspended' ? 'Suspended' : unclaimedTemp ? 'Pending' : 'Active'
  return {
    id: row.id,
    employeeId: row.employee_id ?? '',
    surname: row.surname ?? '',
    firstName: row.first_name ?? '',
    middleName: row.middle_name ?? '',
    email: row.email,
    contact: row.contact ?? '',
    role: (row.role ?? 'Ground Crew') as StaffRole,
    subRole: row.sub_role || row.subRole || undefined,
    sessionStatus,
    lastAccess: row.updated_at
      ? new Date(row.updated_at).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        })
      : '—',
    recordKind: 'full-account',
    accountStatus,
    tempPassword: unclaimedTemp ? (row.password_hash ?? undefined) : undefined,
  }
}

export interface EventConflict {
  eventId: string
  eventTitle: string
  eventRefId: string
  /** hard-block types: title_similarity, same_date_venue. advisory: same_date */
  conflictType: 'title_similarity' | 'same_date_venue' | 'same_date'
  message: string
}

/**
 * Word-overlap ratio between two title strings (0–1).
 * "La Nuit Dorée" vs "La Nuit" → 2/3 ≈ 0.67
 */
function titleOverlapRatio(a: string, b: string): number {
  const wa = new Set(a.split(/\s+/).filter(Boolean))
  const wb = new Set(b.split(/\s+/).filter(Boolean))
  if (wa.size === 0 || wb.size === 0) return 0
  let shared = 0
  wa.forEach((w) => { if (wb.has(w)) shared++ })
  return shared / Math.max(wa.size, wb.size)
}

/**
 * Returns HARD-BLOCKING conflicts only (title_similarity | same_date_venue).
 * Advisory same-date-only conflicts are returned by checkDateAdvisory.
 */
export function checkEventConflicts(
  draft: NewEventDraft,
  existingEvents: PortalEvent[],
  editingEventId?: string | null,
): EventConflict[] {
  const conflicts: EventConflict[] = []
  if (!draft.title.trim() && !draft.targetDate && !draft.venue) return conflicts

  const cleanDraftTitle = draft.title.trim().toLowerCase()
  const cleanDraftVenue = (draft.venue || '').trim().toLowerCase()
  const draftDate = (draft.targetDate || '').trim()

  for (const ev of existingEvents) {
    if (editingEventId && ev.id === editingEventId) continue

    const evTitle = ev.title.trim().toLowerCase()
    const evVenue = (ev.venue || '').trim().toLowerCase()
    const evDate = (ev.targetDate || '').trim()

    // Exact title match — always a hard block
    const isExactTitle = cleanDraftTitle.length > 0 && cleanDraftTitle === evTitle

    // High word-overlap (≥ 75%) only — prevents short prefix false-positives
    const overlap = cleanDraftTitle.length >= 6 && evTitle.length >= 6
      ? titleOverlapRatio(cleanDraftTitle, evTitle)
      : 0
    const isHighOverlapTitle = overlap >= 0.75

    // Same date or overlapping ingress/event date window + same venue — actual double-booking (hard block)
    const draftStart = (draft.ingressDate || draft.targetDate || '').trim().split('T')[0]
    const draftEnd = (draft.targetDate || draft.ingressDate || '').trim().split('T')[0]
    const evStart = (ev.ingressDate || ev.targetDate || '').trim().split('T')[0]
    const evEnd = (ev.targetDate || ev.ingressDate || '').trim().split('T')[0]

    const isSameVenue = Boolean(cleanDraftVenue && evVenue && cleanDraftVenue === evVenue)
    const isOverlappingDateWindow = Boolean(
      draftStart && draftEnd && evStart && evEnd &&
      draftStart <= evEnd && draftEnd >= evStart,
    )
    const isSameDateVenue = isSameVenue && (draftDate === evDate || isOverlappingDateWindow)

    if (isExactTitle || isHighOverlapTitle) {
      conflicts.push({
        eventId: ev.id,
        eventTitle: ev.title,
        eventRefId: ev.refId,
        conflictType: 'title_similarity',
        message: `Title conflict: "${draft.title}" closely matches existing event "${ev.title}" (${ev.refId}).`,
      })
    }

    if (isSameDateVenue) {
      const windowDetail = draftStart !== draftEnd || evStart !== evEnd
        ? ` (Schedule Window: ${evStart} to ${evEnd})`
        : ` on ${ev.targetDate}`
      conflicts.push({
        eventId: ev.id,
        eventTitle: ev.title,
        eventRefId: ev.refId,
        conflictType: 'same_date_venue',
        message: `Double-booking: Venue "${ev.venue}" is already reserved${windowDetail} for "${ev.title}" (${ev.refId}).`,
      })
    }
  }

  return conflicts
}

/**
 * R5 — Asset allocation double-booking conflict detection.
 * Checks whether placed canvas elements or allocated asset SKUs conflict with another event
 * sharing the same date or overlapping buffer window.
 */
export interface AssetAllocationConflict {
  assetId?: string
  assetName: string
  sku?: string
  conflictingEventId: string
  conflictingEventTitle: string
  conflictingEventRefId?: string
  targetDate: string
  message: string
}

export function checkAssetAllocationConflict(
  placedElements: Array<{ id?: string; name?: string; sku?: string; elementId?: string; quantity?: number; tracked?: boolean }>,
  targetDate: string,
  currentEventId?: string | null,
  existingEvents: PortalEvent[] = [],
  eventMaterialsMap: Record<string, Array<{ sku?: string; name?: string; quantity?: number }>> = {},
): AssetAllocationConflict[] {
  const conflicts: AssetAllocationConflict[] = []
  const cleanDate = (targetDate || '').trim().split('T')[0]
  if (!cleanDate || !placedElements || placedElements.length === 0) return conflicts

  // Identify events occurring on the same date or overlapping window
  const concurrentEvents = existingEvents.filter((ev) => {
    if (currentEventId && ev.id === currentEventId) return false
    if (ev.status === 'Cancelled' || ev.status === 'Settled') return false
    const evStart = (ev.ingressDate || ev.targetDate || '').trim().split('T')[0]
    const evEnd = (ev.targetDate || ev.ingressDate || '').trim().split('T')[0]
    return cleanDate >= evStart && cleanDate <= evEnd
  })

  if (concurrentEvents.length === 0) return conflicts

  for (const element of placedElements) {
    const sku = element.sku || element.id || element.elementId
    const name = element.name || sku || 'Allocated Asset'
    if (!sku) continue

    for (const otherEv of concurrentEvents) {
      const otherMaterials = eventMaterialsMap[otherEv.id] || []
      const hasSkuConflict = otherMaterials.some(
        (m) => m.sku && (m.sku === sku || m.name?.toLowerCase() === name.toLowerCase()),
      )

      if (hasSkuConflict) {
        conflicts.push({
          assetId: element.id,
          assetName: name,
          sku,
          conflictingEventId: otherEv.id,
          conflictingEventTitle: otherEv.title,
          conflictingEventRefId: otherEv.refId,
          targetDate: otherEv.targetDate,
          message: `Asset Double-Booking: "${name}" (${sku}) is already allocated to "${otherEv.title}" (${otherEv.refId}) on ${otherEv.targetDate}.`,
        })
      }
    }
  }

  return conflicts
}

/**
 * Advisory-only: returns same-date conflicts where the venue differs (or is unset).
 * These are warnings shown in the confirm dialog but do NOT block submission.
 */
export function checkDateAdvisory(
  draft: NewEventDraft,
  existingEvents: PortalEvent[],
  editingEventId?: string | null,
): EventConflict[] {
  const advisories: EventConflict[] = []
  const draftDate = (draft.targetDate || '').trim()
  if (!draftDate) return advisories
  const cleanDraftVenue = (draft.venue || '').trim().toLowerCase()

  for (const ev of existingEvents) {
    if (editingEventId && ev.id === editingEventId) continue
    const evDate = (ev.targetDate || '').trim()
    const evVenue = (ev.venue || '').trim().toLowerCase()
    if (evDate && evDate === draftDate && cleanDraftVenue !== evVenue) {
      advisories.push({
        eventId: ev.id,
        eventTitle: ev.title,
        eventRefId: ev.refId,
        conflictType: 'same_date',
        message: `Date advisory: "${ev.title}" (${ev.refId}) is also scheduled on ${ev.targetDate}.`,
      })
    }
  }

  return advisories
}

/* ----------------------------- Seed data ----------------------------- */

// Seed staff directory initialized to zero state as requested
const seedStaff: Staff[] = []

const seedEvents: PortalEvent[] = [
  {
    id: 'e-101',
    refId: 'PRT-2026-0145',
    title: 'Aura Luxe Autumn Gala 2026',
    client: 'Lumière Executive Board',
    tier: 'Tier-1 VIP (Bespoke Logistics)',
    venue: 'The Grand Ballroom, Shangri-La Fort',
    targetDate: '2026-09-20',
    installationStart: '2026-09-19',
    installationEnd: '2026-09-20',
    eventStart: '18:00',
    eventEnd: '23:00',
    ingressTime: '08:00',
    fullStop: '23:30',
    budget: 3400000,
    status: 'In Production',
    moodPlan: 'Crystal sconces and emerald velvet draping.',
  },
  {
    id: 'e-102',
    refId: 'PRT-2026-0146',
    title: 'Vanguard Tech Keynote & Product Launch',
    client: 'Vanguard Dynamics',
    tier: 'Tier-2 Premium',
    venue: 'SMX Convention Center Hall 3, Pasay',
    targetDate: '2026-09-28',
    installationStart: '2026-09-27',
    installationEnd: '2026-09-28',
    eventStart: '09:00',
    eventEnd: '17:00',
    ingressTime: '06:00',
    fullStop: '19:00',
    budget: 1950000,
    status: 'In Production',
    moodPlan: 'Modern minimalist LED panels and obsidian podiums.',
  },
  {
    id: 'e-103',
    refId: 'PRT-2026-0147',
    title: 'Celestial Horizon Presidential Wedding',
    client: 'Celestial Trust',
    tier: 'Tier-1 VIP (Bespoke Logistics)',
    venue: 'Solaire Resort Grand Pavilion, Parañaque',
    targetDate: '2026-10-08',
    installationStart: '2026-10-07',
    installationEnd: '2026-10-08',
    eventStart: '16:00',
    eventEnd: '22:00',
    ingressTime: '07:00',
    fullStop: '23:00',
    budget: 5200000,
    status: 'In Production',
    moodPlan: 'White silk canopy, gold candelabras, floral arbors.',
  },
  {
    id: 'e-104',
    refId: 'PRT-2026-0148',
    title: 'Solstice Motors Electric SUV Reveal',
    client: 'Solstice Motors',
    tier: 'Tier-2 Premium',
    venue: 'Okada Manila Glass Dome Auditorium',
    targetDate: '2026-09-16',
    installationStart: '2026-09-15',
    installationEnd: '2026-09-16',
    eventStart: '19:00',
    eventEnd: '22:30',
    ingressTime: '10:00',
    fullStop: '23:59',
    budget: 2800000,
    status: 'In Production',
    moodPlan: 'Sleek brushed aluminum stages and laser lighting.',
  },
  {
    id: 'e-105',
    refId: 'PRT-2026-0149',
    title: 'Apex Global Financial Leaders Summit',
    client: 'Apex Global Forum',
    tier: 'Tier-1 VIP (Bespoke Logistics)',
    venue: 'Marriott Grand Ballroom, Pasay',
    targetDate: '2026-09-24',
    installationStart: '2026-09-23',
    installationEnd: '2026-09-24',
    eventStart: '08:30',
    eventEnd: '16:30',
    ingressTime: '05:30',
    fullStop: '18:00',
    budget: 3900000,
    status: 'In Production',
    moodPlan: 'Mahogany banquet tables with refined brass table lamps.',
  },
  {
    id: 'e-106',
    refId: 'PRT-2026-0150',
    title: 'Haute Couture Resort Collection Showcase',
    client: 'Maison Couture Paris',
    tier: 'Tier-1 VIP (Bespoke Logistics)',
    venue: 'City of Dreams Nüwa Ballroom, Parañaque',
    targetDate: '2026-10-03',
    installationStart: '2026-10-02',
    installationEnd: '2026-10-03',
    eventStart: '20:00',
    eventEnd: '23:00',
    ingressTime: '09:00',
    fullStop: '01:00',
    budget: 4850000,
    status: 'Initialized',
    moodPlan: 'Mirror catwalk with rose gold accents and velvet seating.',
  },
  {
    id: 'e-107',
    refId: 'PRT-2026-0151',
    title: 'Luminary Sustainability & Innovation Awards',
    client: 'Global Eco Initiative',
    tier: 'Tier-2 Premium',
    venue: 'BGC Amphitheater Outdoor Arena, Taguig',
    targetDate: '2026-10-14',
    installationStart: '2026-10-13',
    installationEnd: '2026-10-14',
    eventStart: '17:00',
    eventEnd: '21:30',
    ingressTime: '08:00',
    fullStop: '23:00',
    budget: 2300000,
    status: 'In Production',
    moodPlan: 'Living green walls and recycled timber centerpieces.',
  },
  {
    id: 'e-108',
    refId: 'PRT-2026-0152',
    title: 'Horizon Gaming & Esports Championship Final',
    client: 'Horizon Interactive',
    tier: 'Tier-1 VIP (Bespoke Logistics)',
    venue: 'Mall of Asia Arena Main Stage, Pasay',
    targetDate: '2026-10-20',
    installationStart: '2026-10-18',
    installationEnd: '2026-10-20',
    eventStart: '13:00',
    eventEnd: '21:00',
    ingressTime: '06:00',
    fullStop: '23:00',
    budget: 6500000,
    status: 'In Production',
    moodPlan: 'Neon blue trusses and immersive arena seating layout.',
  },
  {
    id: 'e-109',
    refId: 'PRT-2026-0153',
    title: 'Empress Fine Jewelry Private Exhibition',
    client: 'Empress House of Jewels',
    tier: 'Tier-1 VIP (Bespoke Logistics)',
    venue: 'The Peninsula Manila Conservatory',
    targetDate: '2026-10-25',
    installationStart: '2026-10-24',
    installationEnd: '2026-10-25',
    eventStart: '18:30',
    eventEnd: '22:00',
    ingressTime: '10:00',
    fullStop: '23:30',
    budget: 7120000,
    status: 'In Production',
    moodPlan: 'Bulletproof glass pedestals with pinpoint spotlighting.',
  },
  {
    id: 'e-110',
    refId: 'PRT-2026-0154',
    title: 'AeroSpace Defense Systems Expo 2026',
    client: 'Global Aerospace Consortium',
    tier: 'Tier-2 Premium',
    venue: 'World Trade Center Metro Manila Hall A',
    targetDate: '2026-10-29',
    installationStart: '2026-10-27',
    installationEnd: '2026-10-29',
    eventStart: '09:00',
    eventEnd: '18:00',
    ingressTime: '06:00',
    fullStop: '20:00',
    budget: 3100000,
    status: 'Completed',
    moodPlan: 'High-tech modular displays and aviation-grade flooring.',
  },
]

const seedLogs: ActivityLog[] = []

const seedUserActions: UserAction[] = []

const seedProcurement: ProcurementItem[] = [
  {
    id: 'p-1',
    assetId: 'LM-0041',
    name: 'Floral Arch',
    category: 'Production Assets',
    currentStock: 1,
    threshold: 15,
    unit: 'unit',
    status: 'Not Purchased',
  },
  {
    id: 'p-2',
    assetId: 'LM-0089',
    name: 'Ivory Pillar Candles',
    category: 'Stockroom Assets',
    currentStock: 8,
    threshold: 40,
    unit: 'units',
    status: 'Not Purchased',
  },
  {
    id: 'p-3',
    assetId: 'LM-0114',
    name: 'Champagne Coupe Glasses',
    category: 'Stockroom Assets',
    currentStock: 24,
    threshold: 60,
    unit: 'units',
    status: 'Not Purchased',
  },
  {
    id: 'p-4',
    assetId: 'LM-0207',
    name: 'Velvet Ceremony Chairs',
    category: 'Event Assets',
    currentStock: 18,
    threshold: 30,
    unit: 'units',
    status: 'Not Purchased',
  },
  {
    id: 'p-5',
    assetId: 'LM-0332',
    name: 'Gold Linen Table Runners',
    category: 'Stockroom Assets',
    currentStock: 11,
    threshold: 25,
    unit: 'units',
    status: 'In Procurement',
    reorderQty: 14,
    poRef: 'PO-44810',
    etaHours: 24,
  },
  {
    id: 'p-6',
    assetId: 'LM-0458',
    name: 'Ornate Mirror Panels',
    category: 'Production Assets',
    currentStock: 7,
    threshold: 10,
    unit: 'units',
    status: 'In Procurement',
    reorderQty: 6,
    poRef: 'PO-44821',
    etaHours: 48,
  },
  {
    id: 'p-7',
    assetId: 'LM-0519',
    name: 'Eucalyptus Garland Sets',
    category: 'Stockroom Assets',
    currentStock: 3,
    threshold: 20,
    unit: 'units',
    status: 'In Procurement',
    reorderQty: 17,
    poRef: 'PO-44835',
    etaHours: 12,
  },
  {
    id: 'p-8',
    assetId: 'LM-0035',
    name: 'Round Linen Banquet Tables',
    category: 'Furniture · Banquet',
    currentStock: 30,
    threshold: 30,
    unit: 'units',
    status: 'Received',
  },
]

const seedVendors: Vendor[] = [
  {
    id: 'v-1',
    name: 'Maison Botanique',
    contactName: 'Élise Fontaine',
    email: 'orders@maisonbotanique.fr',
    phone: '+33 1 45 22 88 10',
    specialty: 'Florals, greenery & living arches',
    leadTimeHours: 36,
    rating: 4.9,
    priceTier: 'Premium',
    preferred: true,
    matches: ['floral', 'floristry', 'greenery', 'eucalyptus', 'garland', 'arch'],
  },
  {
    id: 'v-2',
    name: 'Lumière Wax & Co.',
    contactName: 'Tomas Berg',
    email: 'supply@lumierewax.com',
    phone: '+1 212 555 0148',
    specialty: 'Candles, wax goods & ambiance',
    leadTimeHours: 24,
    rating: 4.7,
    priceTier: 'Standard',
    preferred: true,
    matches: ['candle', 'wax', 'ambiance', 'illumination'],
  },
  {
    id: 'v-3',
    name: 'Atelier Verre',
    contactName: 'Sofia Marchetti',
    email: 'procurement@atelierverre.it',
    phone: '+39 02 7600 4421',
    specialty: 'Glassware, mirrors & crystal',
    leadTimeHours: 48,
    rating: 4.8,
    priceTier: 'Premium',
    preferred: false,
    matches: ['glass', 'glassware', 'coupe', 'mirror', 'crystal', 'beverage'],
  },
  {
    id: 'v-4',
    name: 'Heritage Seating Group',
    contactName: 'Marcus Cole',
    email: 'fulfillment@heritageseating.com',
    phone: '+44 20 7946 0322',
    specialty: 'Chairs, tables & banquet furniture',
    leadTimeHours: 72,
    rating: 4.5,
    priceTier: 'Standard',
    preferred: false,
    matches: ['chair', 'seating', 'table', 'furniture', 'banquet'],
  },
  {
    id: 'v-5',
    name: 'Soie & Lin Textiles',
    contactName: 'Amélie Rousseau',
    email: 'hello@soieetlin.fr',
    phone: '+33 4 91 13 77 05',
    specialty: 'Linens, runners & table textiles',
    leadTimeHours: 30,
    rating: 4.6,
    priceTier: 'Standard',
    preferred: false,
    matches: ['linen', 'textile', 'runner', 'table décor', 'décor'],
  },
  {
    id: 'v-6',
    name: 'Global Events Wholesale',
    contactName: 'Priya Nair',
    email: 'bulk@globaleventswholesale.com',
    phone: '+1 800 555 0199',
    specialty: 'General catalog · rapid bulk supply',
    leadTimeHours: 18,
    rating: 4.2,
    priceTier: 'Economy',
    preferred: false,
    matches: [],
  },
]

const seedEventUpdates: EventUpdate[] = [
  { id: 'eu-1', title: 'New Venue Booking (Standard)', status: 'Scheduled' },
  { id: 'eu-2', title: 'Supplier Contract Updated', status: 'Action Required' },
  { id: 'eu-3', title: 'Menu Selection Confirmed', status: 'Completed' },
]

const seedDamage: DamageException[] = [
  {
    id: 'd1',
    logId: 'EXC-2026-798',
    boundEvent: 'Hartwell Estate Gala',
    reportingOfficer: 'R. Montoya',
    officerRole: 'Ground Crew',
    assetName: 'Gold Chiavari Chair — Leg Fracture',
    assetSku: 'LMR-FURN-CH08',
    damageType: 'Structural leg fracture, non-repairable',
    imageUrl: '/damage/chair-leg-fracture.png',
    gps: '14.5492° N, 121.019° E',
    capturedAt: '12 Dec 2025 · 22:40',
    exifVerified: true,
    estimatedCost: 4200,
    notes: 'Chair leg snapped during teardown. Captured under venue floodlight, EXIF intact.',
    status: 'Validated',
  },
  {
    id: 'd2',
    logId: 'EXC-2026-799',
    boundEvent: 'Casa Ruiz Wedding',
    reportingOfficer: 'T. Alcantra',
    officerRole: 'Ground Crew',
    assetName: 'White Linen Table Runner — Stain',
    assetSku: 'LMR-LIN-TR04',
    damageType: 'Red wine staining, laundering attempted',
    imageUrl: '/damage/linen-runner-stain.png',
    gps: '14.5603° N, 121.032° E',
    capturedAt: '20 Apr 2026 · 08:15',
    exifVerified: true,
    estimatedCost: 850,
    notes: 'Stain persists after first wash cycle. Routed to textile recovery before write-off.',
    status: 'Dismissed',
  },
  {
    id: 'd3',
    logId: 'EXC-2026-800',
    boundEvent: 'Bernardo Anniversary',
    reportingOfficer: 'S. de Leon',
    officerRole: 'Ground Crew',
    assetName: 'Serpentine Bar Counter — Chip',
    assetSku: 'LMR-BAR-SPC01',
    damageType: 'Edge chip on lacquered surface',
    imageUrl: '/damage/bar-counter-chip.png',
    gps: '14.5521° N, 121.024° E',
    capturedAt: '10 May 2026 · 23:55',
    exifVerified: true,
    estimatedCost: 2100,
    notes: 'Cosmetic chip on front edge. Refinishing quote pending from vendor.',
    status: 'Validated',
  },
  {
    id: 'd4',
    logId: 'EXC-2026-801',
    boundEvent: 'La Nuit Dorée',
    reportingOfficer: 'Eleanor Vance',
    officerRole: 'Field Lead',
    assetName: 'Faceted Crystal Vase',
    assetSku: 'LMR-VAS-011',
    damageType: 'Hairline fracture along base, awaiting verdict',
    imageUrl: '/damage/crystal-vase-fracture.png',
    gps: '14.5547° N, 121.0244° E',
    capturedAt: '30 May 2026 · 01:14 AM',
    exifVerified: false,
    estimatedCost: 6800,
    notes:
      'Low-light capture during late strike. No photographic evidence was captured on site — EXIF timestamp could not be authenticated. Held for audit pending two Executive sign-offs.',
    status: 'Held for Audit',
    noPhotographicEvidence: true,
  },
  {
    id: 'd5',
    logId: 'EXC-2026-802',
    boundEvent: 'Solandra Rooftop Launch',
    reportingOfficer: 'M. Fajardo',
    officerRole: 'Field Lead',
    assetName: 'Hand-Blown Amber Pendant Light',
    assetSku: 'LMR-LGT-045',
    damageType: 'Shattered globe, cause disputed — awaiting verdict',
    imageUrl: '/damage/crystal-vase-fracture.png',
    gps: '14.5581° N, 121.0289° E',
    capturedAt: '26 Aug 2026 · 11:52 PM',
    exifVerified: false,
    estimatedCost: 5400,
    notes:
      'Fixture found shattered during breakdown; no photographic evidence was captured on site — EXIF timestamp could not be authenticated. Held for audit pending two Executive sign-offs.',
    status: 'Held for Audit',
    noPhotographicEvidence: true,
  },
  {
    id: 'd6',
    logId: 'EXC-2026-803',
    boundEvent: 'Casa Ruiz Wedding',
    reportingOfficer: 'T. Alcantra',
    officerRole: 'Ground Crew',
    assetName: 'Ivory Damask Drapery Panel',
    assetSku: 'LMR-DRP-022',
    damageType: 'Red wine staining along lower panel, awaiting verdict',
    imageUrl: '/damage/linen-runner-stain.png',
    gps: '14.5603° N, 121.032° E',
    capturedAt: '26 Aug 2026 · 09:20 PM',
    exifVerified: true,
    estimatedCost: 1200,
    notes: 'Panel stained during teardown reception service. Field photo captured with intact EXIF.',
    status: 'Pending Verdict',
  },
]

const seedInventory: InventoryItem[] = [
  {
    id: 'mat-inv-1',
    assetId: 'LM-MAT-001',
    name: 'Plywood sheet 4x8',
    category: 'Raw Materials & Hardware',
    image: '/assets/inventory/tiffany-chair.png',
    stock: 25,
    capacity: 50,
    status: 'Available',
    updated: 'Updated today',
    description: '3/4 inch exterior grade hardwood plywood sheet',
    dateAdded: '01/10/2026',
    store: 'Manila Industrial Supply',
    representative: 'Ramon Cruz',
    contact: '0917-111-2233',
    height: '244 cm',
    width: '122 cm',
    weight: '25.0 kg',
    fragile: false,
    unit: 'sheets',
    cost: 45000.0,
    costPerUnit: 1800.0,
  },
  {
    id: 'mat-inv-2',
    assetId: 'LM-MAT-002',
    name: 'Steel frame tubing',
    category: 'Raw Materials & Hardware',
    image: '/assets/inventory/tiffany-chair.png',
    stock: 30,
    capacity: 60,
    status: 'Available',
    updated: 'Updated today',
    description: 'Square hollow steel tubing 2x2 inch',
    dateAdded: '01/10/2026',
    store: 'SteelCraft Metals',
    representative: 'Juan Mercado',
    contact: '0918-222-3344',
    height: '600 cm',
    width: '5 cm',
    weight: '12.0 kg',
    fragile: false,
    unit: 'meters',
    cost: 36000.0,
    costPerUnit: 1200.0,
  },
  {
    id: 'mat-inv-3',
    assetId: 'LM-MAT-003',
    name: 'Acrylic panel — clear',
    category: 'Raw Materials & Hardware',
    image: '/assets/inventory/tiffany-chair.png',
    stock: 15,
    capacity: 30,
    status: 'Available',
    updated: 'Updated today',
    description: '4mm clear cast acrylic panel 4x8',
    dateAdded: '01/10/2026',
    store: 'Plastix Solutions',
    representative: 'Elena Santos',
    contact: '0919-333-4455',
    height: '244 cm',
    width: '122 cm',
    weight: '14.0 kg',
    fragile: true,
    unit: 'panels',
    cost: 52500.0,
    costPerUnit: 3500.0,
  },
  {
    id: 'mat-inv-4',
    assetId: 'LM-MAT-004',
    name: 'Spray paint — matte black',
    category: 'Raw Materials & Hardware',
    image: '/assets/inventory/tiffany-chair.png',
    stock: 40,
    capacity: 80,
    status: 'Available',
    updated: 'Updated today',
    description: 'Industrial quick-dry matte black acrylic spray',
    dateAdded: '01/10/2026',
    store: 'ColorCo Coating',
    representative: 'Mark Tan',
    contact: '0915-444-5566',
    height: '20 cm',
    width: '7 cm',
    weight: '0.4 kg',
    fragile: false,
    unit: 'cans',
    cost: 14000.0,
    costPerUnit: 350.0,
  },
  {
    id: 'mat-inv-5',
    assetId: 'LM-MAT-005',
    name: 'LED strip — warm white',
    category: 'Raw Materials & Hardware',
    image: '/assets/inventory/tiffany-chair.png',
    stock: 20,
    capacity: 40,
    status: 'Available',
    updated: 'Updated today',
    description: '12V 3000K warm white high-density LED tape 5m roll',
    dateAdded: '01/10/2026',
    store: 'Lumiere Electronics',
    representative: 'David Chen',
    contact: '0916-555-6677',
    height: '1 cm',
    width: '500 cm',
    weight: '0.2 kg',
    fragile: false,
    unit: 'rolls',
    cost: 18000.0,
    costPerUnit: 900.0,
  },
  {
    id: 'mat-inv-6',
    assetId: 'LM-MAT-006',
    name: 'Foam board',
    category: 'Raw Materials & Hardware',
    image: '/assets/inventory/tiffany-chair.png',
    stock: 50,
    capacity: 60,
    status: 'Available',
    updated: 'Updated today',
    description: '5mm high-density white foam core board 4x8',
    dateAdded: '01/10/2026',
    store: 'Craft & Print Depot',
    representative: 'Sarah Lee',
    contact: '0912-666-7788',
    height: '244 cm',
    width: '122 cm',
    weight: '1.5 kg',
    fragile: false,
    unit: 'sheets',
    cost: 22500.0,
    costPerUnit: 450.0,
  },
  {
    id: 'mat-inv-7',
    assetId: 'LM-MAT-007',
    name: 'Wood stain',
    category: 'Raw Materials & Hardware',
    image: '/assets/inventory/tiffany-chair.png',
    stock: 12,
    capacity: 25,
    status: 'Available',
    updated: 'Updated today',
    description: 'Dark walnut oil-based interior wood finish stain',
    dateAdded: '01/10/2026',
    store: 'WoodPro Finishes',
    representative: 'Arthur King',
    contact: '0917-777-8899',
    height: '20 cm',
    width: '15 cm',
    weight: '1.2 kg',
    fragile: false,
    unit: 'liters',
    cost: 14400.0,
    costPerUnit: 1200.0,
  },
  {
    id: 'mat-inv-8',
    assetId: 'LM-MAT-008',
    name: 'Fabric — velvet backdrop',
    category: 'Raw Materials & Hardware',
    image: '/assets/inventory/tiffany-chair.png',
    stock: 18,
    capacity: 35,
    status: 'Available',
    updated: 'Updated today',
    description: 'Heavyweight emerald velvet acoustic backdrop fabric',
    dateAdded: '01/10/2026',
    store: 'Maison Textile Co.',
    representative: 'Claire Dupont',
    contact: '0918-888-9900',
    height: '100 cm',
    width: '150 cm',
    weight: '0.8 kg',
    fragile: false,
    unit: 'meters',
    cost: 27000.0,
    costPerUnit: 1500.0,
  },
  {
    id: 'i-1',
    assetId: 'LM-0012',
    name: 'Premium White Resin Tiffany Chair',
    category: 'Event Assets',
    image: '/assets/inventory/tiffany-chair.png',
    stock: 150,
    capacity: 150,
    status: 'Available',
    updated: 'Updated 2 days ago',
    description: 'White, Resin, Tiffany-style, Indoor, Outdoor, Stackable, Wedding-grade',
    dateAdded: '03/12/2025',
    store: 'LM Event Supply Co.',
    representative: 'Maria Santos',
    contact: '0917-842-1130',
    height: '90 cm',
    width: '42 cm',
    weight: '3.8 kg',
    fragile: false,
    unit: 'pcs',
    cost: 85000.0,
    costPerUnit: 566.67,
  },
  {
    id: 'i-2',
    assetId: 'LM-0027',
    name: 'Luxury Crystal Chandelier',
    category: 'Event Assets',
    image: '/assets/inventory/crystal-chandelier.png',
    stock: 22,
    capacity: 24,
    status: 'In Maintenance',
    updated: 'Under service · 2 units',
    description: 'Crystal, Brass-finish, Pendant, 220V, Dimmable, Statement-piece, Ballroom',
    dateAdded: '05/20/2025',
    store: 'Luminos Décor & Lighting',
    representative: 'Carlos Reyes',
    contact: '0918-334-7720',
    height: '120 cm',
    width: '80 cm',
    weight: '18.5 kg',
    fragile: true,
    unit: 'units',
    cost: 192000.0,
    costPerUnit: 8000.0,
  },
  {
    id: 'i-3',
    assetId: 'LM-0035',
    name: 'Round Linen Banquet Table',
    category: 'Event Assets',
    image: '/assets/inventory/banquet-table.png',
    stock: 14,
    capacity: 30,
    status: 'Low Stock',
    updated: 'Updated 4 hours ago',
    description: 'Round, 5ft Diameter, Linen-ready, Foldable, Banquet, Ivory-finish',
    dateAdded: '01/08/2025',
    store: 'Prestige Furnishings PH',
    representative: 'Ana Villanueva',
    contact: '0915-660-4482',
    height: '75 cm',
    width: '152 cm',
    weight: '22.0 kg',
    fragile: false,
    unit: 'pcs',
    cost: 63000.0,
    costPerUnit: 2100.0,
  },
  {
    id: 'i-4',
    assetId: 'LM-0041',
    name: 'Ivory Floral Arch',
    category: 'Production Assets',
    image: '/assets/inventory/floral-arch.png',
    stock: 2,
    capacity: 15,
    status: 'Critical Deficit',
    updated: 'Reorder pending',
    description: 'Ivory, Floral, Arch, Ceremony-backdrop, Garden-style, Freestanding, 7ft',
    dateAdded: '02/14/2025',
    store: 'Blooms & Beyond Décor',
    representative: 'Grace Lim',
    contact: '0919-221-5563',
    height: '213 cm',
    width: '152 cm',
    weight: '8.2 kg',
    fragile: true,
    unit: 'sets',
    cost: 48750.0,
    costPerUnit: 3250.0,
  },
  {
    id: 'i-5',
    assetId: 'LM-0089',
    name: 'Ivory Pillar Candle Set',
    category: 'Stockroom Assets',
    image: '/assets/inventory/pillar-candles.png',
    stock: 5,
    capacity: 40,
    status: 'Critical Deficit',
    updated: 'Reorder pending',
    description: 'Ivory, Pillar, Unscented, Dripless, 10-inch, Wedding-table, Centerpiece',
    dateAdded: '04/01/2025',
    store: 'Candela Home & Events',
    representative: 'Jose Mendoza',
    contact: '0916-774-9901',
    height: '25 cm',
    width: '7 cm',
    weight: '0.4 kg',
    fragile: false,
    unit: 'sets/6',
    cost: 12000.0,
    costPerUnit: 300.0,
  },
  {
    id: 'i-6',
    assetId: 'LM-0114',
    name: 'Champagne Coupe Glasses',
    category: 'Stockroom Assets',
    image: '/assets/inventory/coupe-glasses.png',
    stock: 28,
    capacity: 60,
    status: 'Low Stock',
    updated: 'Updated today',
    description: 'Champagne, Coupe, Lead-free Crystal, 180ml, Dishwasher-safe, Elegant-stem',
    dateAdded: '06/15/2025',
    store: 'Cristal Glassware Imports',
    representative: 'Bianca Torres',
    contact: '0912-558-3344',
    height: '15 cm',
    width: '9 cm',
    weight: '0.18 kg',
    fragile: true,
    unit: 'pcs',
    cost: 18000.0,
    costPerUnit: 300.0,
  },
  {
    id: 'i-7',
    assetId: 'LM-0207',
    name: 'Velvet Gold Chiavari Chair',
    category: 'Event Assets',
    image: '/assets/inventory/velvet-chair.png',
    stock: 30,
    capacity: 30,
    status: 'Available',
    updated: 'Updated 3 days ago',
    description: 'Velvet-cushion, Gold-frame, Chiavari, Stackable, Indoor, 250kg-capacity',
    dateAdded: '11/22/2024',
    store: 'Regency Event Rentals',
    representative: 'Paolo Cruz',
    contact: '0920-117-6680',
    height: '95 cm',
    width: '44 cm',
    weight: '4.5 kg',
    fragile: false,
    unit: 'pcs',
    cost: 75000.0,
    costPerUnit: 2500.0,
  },
  {
    id: 'i-8',
    assetId: 'LM-0519',
    name: 'Eucalyptus Garland Set',
    category: 'Stockroom Assets',
    image: '/assets/inventory/eucalyptus-garland.png',
    stock: 3,
    capacity: 20,
    status: 'Critical Deficit',
    updated: 'Reorder pending',
    description: 'Eucalyptus, Preserved, Garland, 6ft, Table-runner, Arch-draping, Natural',
    dateAdded: '07/03/2025',
    store: 'Verde Florals & Greens',
    representative: 'Lea Gonzales',
    contact: '0917-993-2201',
    height: '10 cm',
    width: '182 cm',
    weight: '0.9 kg',
    fragile: false,
    unit: 'sets',
    cost: 14000.0,
    costPerUnit: 700.0,
  },
  {
    id: 'i-9',
    assetId: 'LM-0034',
    name: 'Gold Chiavari Chair',
    category: 'Event Assets',
    image: '/assets/inventory/velvet-chair.png',
    stock: 200,
    capacity: 250,
    status: 'Available',
    updated: 'Updated yesterday',
    description: 'Gold finish, lightweight aluminum frame, stackable, elegant',
    dateAdded: '15/11/2025',
    store: 'LM Event Supply Co.',
    representative: 'Maria Santos',
    contact: '0917-842-1130',
    height: '88 cm',
    width: '40 cm',
    weight: '3.5 kg',
    fragile: false,
    unit: 'pcs',
    cost: 150000.0,
    costPerUnit: 750.0,
  },
  {
    id: 'i-10',
    assetId: 'LM-0035',
    name: 'Round Banquet Table (8-seater)',
    category: 'Furniture · Banquet',
    image: '/assets/inventory/banquet-table.png',
    stock: 35,
    capacity: 50,
    status: 'Available',
    updated: 'Updated 3 days ago',
    description: 'White, 1.5m diameter, elegant pedestal base',
    dateAdded: '22/10/2025',
    store: 'Heritage Seating Group',
    representative: 'Marcus Cole',
    contact: '0917-555-1234',
    height: '75 cm',
    width: '150 cm',
    weight: '45 kg',
    fragile: false,
    unit: 'pcs',
    cost: 18000.0,
    costPerUnit: 18000.0,
  },
  {
    id: 'i-11',
    assetId: 'LM-0036',
    name: 'LED Pin Spot Lighting',
    category: 'Lighting · Statement',
    image: '/assets/inventory/crystal-chandelier.png',
    stock: 48,
    capacity: 100,
    status: 'Low Stock',
    updated: 'Updated 1 day ago',
    description: 'RGB LED, DMX controllable, compact, 10W',
    dateAdded: '08/01/2026',
    store: 'Lumière Lighting Co.',
    representative: 'Tech Support',
    contact: '0917-888-5555',
    height: '12 cm',
    width: '8 cm',
    weight: '0.5 kg',
    fragile: false,
    unit: 'pcs',
    cost: 8000.0,
    costPerUnit: 400.0,
  },
  {
    id: 'i-12',
    assetId: 'LM-0037',
    name: 'Backdrop Stand System',
    category: 'Décor · Backdrop',
    image: '/assets/inventory/floral-arch.png',
    stock: 12,
    capacity: 20,
    status: 'Critical Deficit',
    updated: 'Updated today',
    description: 'Aluminum frame, adjustable, fabric ready',
    dateAdded: '02/02/2026',
    store: 'Global Events Wholesale',
    representative: 'Priya Nair',
    contact: '0917-999-7777',
    height: '240 cm',
    width: '360 cm',
    weight: '28 kg',
    fragile: false,
    unit: 'sets',
    cost: 25000.0,
    costPerUnit: 25000.0,
  },
  {
    id: 'i-13',
    assetId: 'LM-0038',
    name: 'Champagne Glass Set (72 pcs)',
    category: 'Beverage · Glassware',
    image: '/assets/inventory/coupe-glasses.png',
    stock: 8,
    capacity: 15,
    status: 'Low Stock',
    updated: 'Updated 2 days ago',
    description: 'Crystal, lead-free, dishwasher safe',
    dateAdded: '10/12/2025',
    store: 'Fine Glassware & Linens',
    representative: 'Jacques Laurent',
    contact: '0917-111-2222',
    height: '18 cm',
    width: '7 cm',
    weight: '0.1 kg',
    fragile: true,
    unit: 'sets',
    cost: 28000.0,
    costPerUnit: 3500.0,
  },
  {
    id: 'i-14',
    assetId: 'LM-0039',
    name: 'Rose & Hydrangea Garland',
    category: 'Floristry · Greenery',
    image: '/assets/inventory/eucalyptus-garland.png',
    stock: 42,
    capacity: 60,
    status: 'Available',
    updated: 'Updated today',
    description: 'Fresh floral, blush & ivory tones, 10ft strands',
    dateAdded: '01/05/2026',
    store: 'Verde Florals & Greens',
    representative: 'Lea Gonzales',
    contact: '0917-993-2201',
    height: '10 cm',
    width: '300 cm',
    weight: '2.2 kg',
    fragile: true,
    unit: 'strands',
    cost: 42000.0,
    costPerUnit: 1500.0,
  },
]

/* ----------------------------- Helpers ----------------------------- */

const now = () => {
  const d = new Date()
  return {
    timestamp: d.toLocaleTimeString('en-US', { hour12: false }),
    date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
  }
}

const randomIp = () =>
  `192.168.${Math.floor(Math.random() * 9) + 1}.${Math.floor(Math.random() * 254) + 1}`

const pad = (n: number) => String(n).padStart(4, '0')

const deriveStockStatus = (stock: number, capacity: number): StockStatus => {
  if (stock <= 0) return 'Depleted'
  const pct = capacity > 0 ? stock / capacity : 1
  if (pct <= 0.15) return 'Critical Deficit'
  if (pct < 0.5) return 'Low Stock'
  return 'Available'
}

/* ----------------------------- Context ----------------------------- */

interface PortalContextValue {
  staff: Staff[]
  events: PortalEvent[]
  logs: ActivityLog[]
  userActions: UserAction[]
  eventUpdates: EventUpdate[]
  procurement: ProcurementItem[]
  vendors: Vendor[]
  damageExceptions: DamageException[]
  isBackendConnected: boolean
  inventory: InventoryItem[]
  subRolesByParent: Record<string, SubRole[]>
  setSubRolesByParent: Dispatch<SetStateAction<Record<string, SubRole[]>>>
  // Ground Crew's sub-roles, modeled as a recursive tree (see SubRoleNode).
  groundCrewTree: SubRoleNode[]
  setGroundCrewTree: Dispatch<SetStateAction<SubRoleNode[]>>
  // Newly created sub-roles that still need their permission table saved at
  // least once, for the System Dashboard's Pending Actions panel.
  pendingSubRoleSetups: { id: string; parentId: string; parentName: string; subRoleId: string; name: string }[]
  addStaff: (draft: NewStaffDraft) => Promise<void>
  addEmployeeRecord: (draft: NewEmployeeRecordDraft) => void
  removeStaff: (id: string) => Promise<void>
  toggleSuspend: (id: string) => Promise<void>
  updateStaff: (staff: Staff) => void
  forceLogout: (id: string) => void
  addEvent: (
    draft: NewEventDraft,
    initiatorRole?: string,
    allowConflictOverride?: boolean,
  ) => Promise<{ success: boolean; conflict?: boolean; message?: string; conflictingEvents?: any[] }>
  updateEvent: (id: string, draft: Partial<PortalEvent>, initiatorRole?: string) => void
  resolveUserAction: (id: string) => void
  addUserAction: (action: Omit<UserAction, 'id'>) => void
  routeReorder: (draft: ReorderDraft) => void
  updateThreshold: (id: string, threshold: number) => void
  resolveDamage: (
    id: string,
    verdict: Exclude<DamageVerdict, 'Pending Verdict'>,
    note: string,
    initiatorRole?: string,
    staffEmail?: string,
    staffName?: string,
    unblockMetadata?: SubRoleEmergencyUnblockMetadata,
    selfValidation?: DamageSelfValidationRecord,
  ) => void
  completeMaintenance: (assetId: string, initiatorRole?: string) => void
  settleEvent: (eventId: string, initiatorRole?: string) => Promise<{ success: boolean; reason?: string }>
  addInventoryItem: (item: InventoryItem) => void
  updateInventoryItem: (item: InventoryItem) => void
  refetchLogs: () => Promise<void>
}

const PortalContext = createContext<PortalContextValue | null>(null)

export function PortalProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff[]>(() => {
    try {
      const cached = localStorage.getItem('_lumiere_cached_staff')
      if (cached) return JSON.parse(cached)
    } catch {}
    return seedStaff
  })
  const [events, setEvents] = useState<PortalEvent[]>(() => {
    try {
      const cached = localStorage.getItem('_lumiere_cached_events')
      if (cached) return JSON.parse(cached)
    } catch {}
    return seedEvents
  })

  // Hydrate events list from backend REST API (GET /api/events)
  useEffect(() => {
    let active = true

    const loadEvents = () => {
      import('@/lib/eventsApi').then(({ fetchEventsApi }) => {
        fetchEventsApi().then((remoteEvents) => {
          if (!active) return
          if (remoteEvents && remoteEvents.length > 0) {
            setEvents(remoteEvents)
            try {
              localStorage.setItem('_lumiere_cached_events', JSON.stringify(remoteEvents))
            } catch {}
          }
        })
      })
    }

    loadEvents()

    const onFocus = () => {
      loadEvents()
    }
    window.addEventListener('focus', onFocus)

    // Periodic checkpoint refresh (30s polling fallback)
    const interval = setInterval(loadEvents, 30000)

    return () => {
      active = false
      window.removeEventListener('focus', onFocus)
      clearInterval(interval)
    }
  }, [])

  // Hydrate the staff directory from the database (portal_accounts is the source of truth).
  useEffect(() => {
    let active = true

    const loadStaff = async () => {
      try {
        const token = getAuthToken()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`${API_BASE_URL}/api/workforce`, { headers })
        if (!active) return
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setStaff((prev) => {
              const records = prev.filter((s) => s.recordKind === 'employee-record')
              const updated = [...data.map(rowToStaff), ...records]
              try {
                localStorage.setItem('_lumiere_cached_staff', JSON.stringify(updated))
              } catch {}
              return updated
            })
          }
        }
      } catch (err) {
        console.warn('[Workforce] GET /api/workforce fetch error:', err)
      }
    }

    loadStaff()

    const onFocus = () => {
      void loadStaff()
    }
    window.addEventListener('focus', onFocus)

    const interval = setInterval(() => {
      void loadStaff()
    }, 30000)

    return () => {
      active = false
      window.removeEventListener('focus', onFocus)
      clearInterval(interval)
    }
  }, [])
  const [logs, setLogs] = useState<ActivityLog[]>(seedLogs)
  const [userActions, setUserActions] = useState<UserAction[]>(seedUserActions)

  const refetchLogs = useCallback(async () => {
    const token = getAuthToken()
    if (!token) return
    try {
      const { logs: fetchedLogs, connected } = await fetchAuditLogs(200)
      if (connected) {
        setLogs(fetchedLogs)
      }
    } catch (err) {
      console.warn('[store] Failed to load audit logs from backend:', err)
    }
  }, [])

  // Hydrate activity audit logs from the backend REST API endpoint
  useEffect(() => {
    let active = true

    const loadAuditLogs = async () => {
      const token = getAuthToken()
      if (!token) return
      try {
        const { logs: fetchedLogs, connected } = await fetchAuditLogs(200)
        if (!active) return
        if (connected) {
          setLogs(fetchedLogs)
        }
      } catch (err) {
        console.warn('[store] Failed to load audit logs from backend:', err)
      }
    }

    loadAuditLogs()

    const onFocus = () => {
      void loadAuditLogs()
    }
    window.addEventListener('focus', onFocus)

    const interval = setInterval(() => {
      void loadAuditLogs()
    }, 30000)

    return () => {
      active = false
      window.removeEventListener('focus', onFocus)
      clearInterval(interval)
    }
  }, [])

  // Hydrate pending account requests (forgot-password / request-access) from the database.
  useEffect(() => {
    let active = true

    const loadAccessRequests = async () => {
      const { data, error } = await supabase
        .from('access_requests')
        .select('id, email, type, status')
        .order('created_at', { ascending: false })

      if (!active) return
      if (error) {
        console.error('[v0] Failed to load access requests:', error)
        return
      }
      if (data) {
        const fromDb: UserAction[] = data.map((row: any) => ({
          id: row.id,
          type: row.type as UserAction['type'],
          user: row.email,
          status: row.status as UserAction['status'],
        }))
        setUserActions([...fromDb, ...seedUserActions])
      }
    }

    loadAccessRequests()

    const onFocus = () => {
      void loadAccessRequests()
    }
    window.addEventListener('focus', onFocus)

    const interval = setInterval(() => {
      void loadAccessRequests()
    }, 30000)

    return () => {
      active = false
      window.removeEventListener('focus', onFocus)
      clearInterval(interval)
    }
  }, [])
  const [eventUpdates] = useState<EventUpdate[]>(seedEventUpdates)
  const [procurement, setProcurement] = useState<ProcurementItem[]>(seedProcurement)
  const [vendors] = useState<Vendor[]>(seedVendors)
  const [damageExceptions, setDamageExceptions] = useState<DamageException[]>(seedDamage)
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true)
  const [inventory, setInventory] = useState<InventoryItem[]>(seedInventory)

  // Hydrate damage reports across active events from the REST API endpoint
  useEffect(() => {
    let active = true
    const loadReports = async () => {
      const token = getAuthToken()
      if (!token) return

      try {
        const { reports, connected } = await damageApi.fetchDamageReportsAllEvents(events)
        if (!active) return
        setIsBackendConnected(connected)
        if (connected && reports.length > 0) {
          setDamageExceptions(reports)
        }
      } catch (err) {
        console.warn('[v0] Failed to load damage reports from backend:', err)
        if (active) setIsBackendConnected(false)
      }
    }

    loadReports()
    const interval = setInterval(loadReports, 3000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [events])

  // Live, editable copy of each parent role's sub-roles (Roles & Sub-Roles
  // screen). Lifted here — rather than kept local to AdminRolesPage — so the
  // System Dashboard's Pending Actions panel can surface newly created
  // sub-roles that still need their permission table configured.
  const [subRolesByParent, setSubRolesByParent] = useState<Record<string, SubRole[]>>(() => {
    const map: Record<string, SubRole[]> = {}
    PARENT_ROLES.forEach((parent) => {
      map[parent.id] = parent.subRoles
    })
    return map
  })

  // Ground Crew's sub-roles are a recursive tree (arbitrary-depth
  // organizational tiers) rather than the flat list WOM uses — see
  // SubRoleNode in lib/rbac.ts. Lifted here for the same reason as
  // subRolesByParent: the System Dashboard's Pending Actions panel needs to
  // surface unconfigured leaf tiers from anywhere in the tree.
  const [groundCrewTree, setGroundCrewTree] = useState<SubRoleNode[]>(GROUND_CREW_TREE_SEED)

  // Newly created sub-roles whose permission table has never been saved —
  // i.e. `permissionsConfigured === false`. Once an Admin saves the
  // permissions table for a sub-role (even leaving everything at None on
  // purpose), it is permanently considered configured and drops off this list.
  // Combines WOM's flat sub-roles with every unconfigured leaf tier anywhere
  // in the Ground Crew tree (at any depth).
  const pendingSubRoleSetups = useMemo(
    () => [
      ...PARENT_ROLES.flatMap((parent) =>
        (subRolesByParent[parent.id] ?? [])
          .filter((sub) => !isPermissionsConfigured(sub))
          .map((sub) => ({
            id: `subrole-setup-${sub.id}`,
            parentId: parent.id,
            parentName: parent.name,
            subRoleId: sub.id,
            name: sub.name,
          })),
      ),
      ...collectPendingLeaves(groundCrewTree).map((leaf) => ({
        id: `subrole-setup-${leaf.id}`,
        parentId: 'ground-crew',
        parentName: 'Ground Crew',
        subRoleId: leaf.id,
        name: leaf.breadcrumb,
      })),
    ],
    [subRolesByParent, groundCrewTree],
  )

  const pushLog = useCallback(
    (entry: Omit<ActivityLog, 'id' | 'timestamp' | 'date' | 'logId'>) => {
      const ts = now()
      setLogs((prev) => [
        {
          id: `l-${Date.now()}`,
          logId: `LOG-${Math.floor(10000 + Math.random() * 89999)}`,
          timestamp: ts.timestamp,
          date: ts.date,
          ...entry,
        },
        ...prev,
      ])
    },
    [],
  )

  const addStaff = useCallback(
    async (draft: NewStaffDraft) => {
      const role = (draft.role || 'Ground Crew') as StaffRole
      const subRole = draft.subRole
      const fullName = `${draft.firstName} ${draft.surname}`.trim()
      const email = draft.email.trim().toLowerCase()

      const localStaff: Staff = {
        id: `s-${Date.now()}`,
        employeeId: draft.employeeId,
        surname: draft.surname,
        firstName: draft.firstName,
        middleName: draft.middleName,
        email,
        contact: draft.contact,
        role,
        subRole,
        sessionStatus: 'Offline Session',
        lastAccess: '—',
        recordKind: 'full-account',
        accountStatus: 'Pending',
        tempPassword: draft.tempPassword,
      }

      // Always save to local storage cache so offline / local auth fallbacks can log in
      try {
        const existing = JSON.parse(localStorage.getItem('_lumiere_added_staff') || '[]')
        const filtered = existing.filter((s: any) => s.email !== email)
        localStorage.setItem('_lumiere_added_staff', JSON.stringify([...filtered, localStaff]))
      } catch {}

      // Persist the account to the database via REST API
      const token = getAuthToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE_URL}/api/workforce`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          fullName,
          role,
          subRole: subRole || null,
          surname: draft.surname,
          firstName: draft.firstName,
          middleName: draft.middleName,
          contact: draft.contact,
        }),
      })

      if (!res.ok) {
        throw new Error(`Failed to create account. Server returned status ${res.status}`)
      }

      const data = await res.json()
      setStaff((prev) => [...prev, rowToStaff(data)])
      pushLog({
        account: draft.employeeId,
        initiatorRole: 'Admin',
        action: 'New Employee Profile Created',
        detail: `Provisioned account for ${fullName} (${role}). Account saved to directory; temporary password generated server-side.`,
        ip: randomIp(),
        status: 'Success',
      })
    },
    [pushLog],
  )

  const removeStaff = useCallback(
    async (id: string) => {
      const target = staff.find((s) => s.id === id)
      const token = getAuthToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE_URL}/api/workforce/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        throw new Error(`Failed to remove account. Server returned status ${res.status}`)
      }

      setStaff((prev) => prev.filter((s) => s.id !== id))

      if (target?.employeeId && supabase) {
        try {
          await supabase.from('crew_roster').update({ status: 'Inactive' }).eq('employee_id', target.employeeId)
        } catch (err) {
          console.warn('[Workforce] Soft-deactivating crew_roster row failed silently:', err)
        }
      }
      if (target) {
        pushLog({
          account: target.employeeId,
          initiatorRole: 'Admin',
          action: 'Employee Account Revoked',
          detail: `Access for ${target.firstName} ${target.surname} permanently exited from the directory.`,
          ip: randomIp(),
          status: 'Success',
        })
      }
    },
    [pushLog, staff],
  )

  const toggleSuspend = useCallback(
    async (id: string) => {
      const target = staff.find((s) => s.id === id)
      if (!target) return
      const suspending = (target.accountStatus ?? 'Active') !== 'Suspended'
      const fullName = `${target.firstName} ${target.surname}`

      if (target.recordKind === 'employee-record') {
        setStaff((prev) =>
          prev.map((s) =>
            s.id === id
              ? { ...s, accountStatus: suspending ? 'Suspended' : 'Active', archived: suspending }
              : s,
          ),
        )
        pushLog({
          account: target.employeeId,
          initiatorRole: 'Admin',
          action: suspending ? 'Employee Record Archived' : 'Employee Record Reactivated',
          detail: `${fullName} (${target.employmentType ?? 'employee record'}) was ${
            suspending ? 'archived' : 'reactivated from the archive'
          }.`,
          ip: randomIp(),
          status: 'Success',
        })
        return
      }

      const nextStatus = suspending ? 'Suspended' : 'Active'
      const token = getAuthToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE_URL}/api/workforce/${encodeURIComponent(id)}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!res.ok) {
        throw new Error(`Failed to update status. Server returned status ${res.status}`)
      }

      setStaff((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, sessionStatus: suspending ? 'Suspended' : 'Active Session', accountStatus: nextStatus }
            : s,
        ),
      )
      pushLog({
        account: target.employeeId,
        initiatorRole: 'Admin',
        action: suspending ? 'Session Privileges Revoked' : 'Session Restored',
        detail: `${fullName} account status changed to ${nextStatus}.`,
        ip: randomIp(),
        status: 'Success',
      })
    },
    [pushLog, staff],
  )

  const addEmployeeRecord = useCallback(
    (draft: NewEmployeeRecordDraft) => {
      const seq = staff.filter((s) => s.recordKind === 'employee-record').length + 1
      const employeeId = `EMP-${String(seq).padStart(4, '0')}`
      const fullName = `${draft.firstName} ${draft.surname}`.trim()
      const record: Staff = {
        id: `er-${Date.now()}`,
        employeeId,
        surname: draft.surname,
        firstName: draft.firstName,
        middleName: '',
        email: '',
        contact: draft.contact,
        role: 'Field & Production Crew',
        sessionStatus: 'Offline Session',
        lastAccess: '—',
        recordKind: 'employee-record',
        accountStatus: 'Active',
        employmentType: draft.employmentType,
      }
      setStaff((prev) => [...prev, record])
      pushLog({
        account: employeeId,
        initiatorRole: 'Admin',
        action: 'Employee Record Created',
        detail: `Added ${fullName} as an ${draft.employmentType} employee record with no portal credentials.`,
        ip: randomIp(),
        status: 'Success',
      })
    },
    [pushLog, staff],
  )

  const updateStaff = useCallback(
    async (updated: Staff) => {
      const token = getAuthToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE_URL}/api/workforce/${encodeURIComponent(updated.id)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          firstName: updated.firstName,
          surname: updated.surname,
          contact: updated.contact,
          email: updated.email,
          role: updated.role,
        }),
      })

      if (!res.ok) {
        throw new Error(`Failed to update profile. Server returned status ${res.status}`)
      }

      setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      pushLog({
        account: updated.employeeId,
        initiatorRole: 'Admin',
        action: 'Employee Profile Updated',
        detail: `Profile details for ${updated.firstName} ${updated.surname} (${updated.role}) were edited.`,
        ip: randomIp(),
        status: 'Success',
      })
    },
    [pushLog],
  )

  const forceLogout = useCallback(
    async (id: string) => {
      const target = staff.find((s) => s.id === id)
      if (!target) return
      const token = getAuthToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE_URL}/api/workforce/${encodeURIComponent(id)}/force-logout`, {
        method: 'POST',
        headers,
      })

      if (!res.ok) {
        throw new Error(`Failed to force logout. Server returned status ${res.status}`)
      }

      setStaff((prev) =>
        prev.map((s) => (s.id === id ? { ...s, sessionStatus: 'Offline Session' } : s)),
      )
      pushLog({
        account: target.employeeId,
        initiatorRole: 'Admin',
        action: 'Session Force-Terminated',
        detail: `Active session for ${target.firstName} ${target.surname} was forcibly terminated by an administrator.`,
        ip: randomIp(),
        status: 'Success',
      })
    },
    [pushLog, staff],
  )

  const addEvent = useCallback(
    async (
      draft: NewEventDraft,
      initiatorRole = 'Executive',
      allowConflictOverride = false,
    ): Promise<{ success: boolean; conflict?: boolean; message?: string; conflictingEvents?: any[] }> => {
      const token = getAuthToken()

      const sanitizeToIsoDate = (val?: string): string => {
        if (!val) return ''
        const trimmed = val.trim()
        if (trimmed.includes('T')) return trimmed.split('T')[0]
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
        const d = new Date(trimmed)
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${y}-${m}-${day}`
        }
        return ''
      }

      const cleanTargetDate = sanitizeToIsoDate(draft.targetDate) || new Date().toISOString().slice(0, 10)
      const cleanIngressDate = sanitizeToIsoDate(draft.ingressDate) || sanitizeToIsoDate(draft.installationStart) || cleanTargetDate

      const dateOfEventIso = `${cleanTargetDate}T00:00:00Z`
      const ingressDateIso = `${cleanIngressDate}T00:00:00Z`

      const formatTimeStr = (t?: string, defaultVal = '08:00:00') => {
        if (!t) return defaultVal
        return t.length === 5 ? `${t}:00` : t
      }

      const backendPayload = {
        eventName: draft.title,
        eventVenue: draft.venue || 'Venue Pending',
        geoClass: draft.geoClass || 'Local',
        dateOfEvent: dateOfEventIso,
        ingressDate: ingressDateIso,
        ingressTime: formatTimeStr(draft.ingressTime, '08:00:00'),
        fullStop: formatTimeStr(draft.fullStop, '23:00:00'),
        allowConflictOverride,
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(backendPayload),
        })

        if (res.status === 409) {
          const conflictData = await res.json().catch(() => ({}))
          console.warn('[store] POST /api/events 409 Conflict:', conflictData)
          return {
            success: false,
            conflict: true,
            message: conflictData.error || conflictData.message || 'Venue scheduling conflict detected.',
            conflictingEvents: conflictData.conflictingEvents || [],
          }
        }

        if (res.ok) {
          const created = await res.json().catch(() => ({}))
          const realId = created ? (created.eventId || created.id) : `e-${Date.now()}`
          const refId = `PRT-2026-${pad(145 + events.length)}`

          const newEvt: PortalEvent = {
            id: realId,
            refId,
            title: draft.title,
            client: draft.client,
            tier: 'Tier-3 Standard',
            venue: draft.venue,
            targetDate: draft.targetDate,
            installationStart: draft.installationStart,
            installationEnd: draft.installationEnd,
            budget: 0,
            status: 'Initialized',
            moodPlan: draft.moodPlan,
          }

          setEvents((prev) => [...prev, newEvt])
          pushLog({
            account: initiatorRole === 'Executive' ? 'EXEC-ROOT' : 'SYS-ROOT',
            initiatorRole,
            action: 'Event Registry Initialized',
            detail: `New portfolio "${draft.title}" registered${
              draft.client ? ` for ${draft.client}` : ''
            }. Ref ${refId}.${allowConflictOverride ? ' (Conflict Overridden)' : ''}`,
            ip: randomIp(),
            status: 'Success',
          })

          return { success: true }
        } else {
          const errData = await res.json().catch(() => ({}))
          console.warn('[store] POST /api/events non-ok response, creating local event fallback:', res.status, errData)
          
          const realId = `e-local-${Date.now()}`
          const refId = `PRT-2026-${pad(145 + events.length)}`
          const newEvt: PortalEvent = {
            id: realId,
            refId,
            title: draft.title,
            client: draft.client,
            tier: 'Tier-3 Standard',
            venue: draft.venue,
            targetDate: draft.targetDate,
            installationStart: draft.installationStart,
            installationEnd: draft.installationEnd,
            budget: 0,
            status: 'Initialized',
            moodPlan: draft.moodPlan,
          }
          setEvents((prev) => [...prev, newEvt])
          pushLog({
            account: initiatorRole === 'Executive' ? 'EXEC-ROOT' : 'SYS-ROOT',
            initiatorRole,
            action: 'Event Registry Initialized (Local Fallback)',
            detail: `New portfolio "${draft.title}" registered locally. Ref ${refId}.`,
            ip: randomIp(),
            status: 'Success',
          })
          return { success: true, message: 'Saved to local portfolio' }
        }
      } catch (err: any) {
        console.warn('[store] POST /api/events failed, creating local event fallback:', err)
        const realId = `e-local-${Date.now()}`
        const refId = `PRT-2026-${pad(145 + events.length)}`
        const newEvt: PortalEvent = {
          id: realId,
          refId,
          title: draft.title,
          client: draft.client,
          tier: 'Tier-3 Standard',
          venue: draft.venue,
          targetDate: draft.targetDate,
          installationStart: draft.installationStart,
          installationEnd: draft.installationEnd,
          budget: 0,
          status: 'Initialized',
          moodPlan: draft.moodPlan,
        }
        setEvents((prev) => [...prev, newEvt])
        return { success: true, message: 'Saved to local portfolio' }
      }
    },
    [pushLog, events.length],
  )

  const updateEvent = useCallback(
    (id: string, draft: Partial<PortalEvent>, initiatorRole = 'Executive') => {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                ...draft,
              }
            : e,
        ),
      )
      pushLog({
        account: initiatorRole === 'Executive' ? 'EXEC-ROOT' : 'SYS-ROOT',
        initiatorRole,
        action: 'Event Registry Updated',
        detail: `Portfolio "${draft.title ?? id}" details were updated.`,
        ip: randomIp(),
        status: 'Success',
      })
    },
    [pushLog],
  )

  const resolveUserAction = useCallback(
    (id: string) => {
      setUserActions((prev) =>
        prev.map((a) => {
          if (a.id !== id || a.status === 'completed') return a
          pushLog({
            account: a.user,
            initiatorRole: 'Admin',
            action:
              a.type === 'access-request'
                ? 'Access Request Approved & Account Created'
                : a.type === 'forgot-password'
                  ? 'Temporary Password Generated'
                  : 'Account Unlocked & Temp Password Sent',
            detail:
              a.type === 'access-request'
                ? `Access request approved for ${a.user}. Account created.`
                : a.type === 'forgot-password'
                  ? `Temporary password generated and dispatched to ${a.user}. User must reset on next login.`
                  : `Account ${a.user} unlocked. Temporary password issued pending reset.`,
            ip: randomIp(),
            status: 'Success',
          })
          // Persist the resolution so the request leaves the pending queue.
          void supabase
            .from('access_requests')
            .update({ status: 'completed' })
            .eq('id', id)
            .then(({ error }) => {
              if (error) console.error('[v0] Failed to resolve access request:', error)
            })
          return { ...a, status: 'completed' }
        }),
      )
    },
    [pushLog],
  )

  const addUserAction = useCallback((action: Omit<UserAction, 'id'>) => {
    const newAction: UserAction = {
      id: `ua-req-${Date.now()}`,
      ...action,
    }
    setUserActions((prev) => [newAction, ...prev])
  }, [])

  const routeReorder = useCallback(
    (draft: ReorderDraft) => {
      const vendor = seedVendors.find((v) => v.id === draft.vendorId)
      setProcurement((prev) =>
        prev.map((item) => {
          if (item.id !== draft.itemId) return item
          const poRef = `PO-${Math.floor(40000 + Math.random() * 9999)}`
          pushLog({
            account: 'WAREHOUSE_MGR_01',
            initiatorRole: 'Warehouse Manager',
            action: 'Inventory Reorder Requisition Routed',
            detail: `Reorder of ${draft.reorderQty} ${item.unit} for ${item.name} (${item.assetId}) routed to ${
              vendor ? vendor.name : 'Purchasing'
            }. ${poRef} dispatched.${draft.note ? ` Note: ${draft.note}` : ''}`,
            ip: randomIp(),
            status: 'Success',
          })
          return {
            ...item,
            status: 'In Procurement',
            reorderQty: draft.reorderQty,
            poRef,
            etaHours: vendor ? vendor.leadTimeHours : 48,
            supplier: vendor?.name,
          }
        }),
      )
    },
    [pushLog],
  )

  const updateThreshold = useCallback(
    (id: string, threshold: number) => {
      setProcurement((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item
          // Re-evaluate lifecycle state against the new threshold (unless an order is already in flight).
          let status = item.status
          if (status !== 'In Procurement') {
            const ratio = threshold > 0 ? item.currentStock / threshold : 1
            status = ratio < 1 ? 'Not Purchased' : 'Received'
          }
          pushLog({
            account: 'WAREHOUSE_MGR_01',
            initiatorRole: 'Warehouse Manager',
            action: 'Replenishment Threshold Adjusted',
            detail: `Minimum threshold for ${item.name} (${item.assetId}) updated to ${threshold} ${item.unit}.`,
            ip: randomIp(),
            status: 'Success',
          })
          return { ...item, threshold, status }
        }),
      )
    },
    [pushLog],
  )

  const resolveDamage = useCallback(
    (
      id: string,
      verdict: Exclude<DamageVerdict, 'Pending Verdict'>,
      note: string,
      initiatorRole = 'Warehouse Ops',
      staffEmail?: string,
      staffName?: string,
      unblockMetadata?: SubRoleEmergencyUnblockMetadata,
      selfValidation?: DamageSelfValidationRecord,
    ) => {
      let targetItem: DamageException | null = null
      setDamageExceptions((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i
          targetItem = i

          const isAuditResolution =
            (verdict === 'Repair' || verdict === 'Write-off' || verdict === 'Validated' || verdict === 'Dismissed') &&
            (i.status === 'Held for Audit' || i.status === 'Pending Second Sign-off')

          if (isAuditResolution && !selfValidation) {
            const signOff: DamageSignOff = {
              staffEmail: staffEmail ?? '',
              staffName: staffName ?? initiatorRole,
              womRole: initiatorRole,
              verdict: verdict as any,
              note,
              timestamp: now().timestamp,
            }

            if (i.status === 'Held for Audit') {
              pushLog({
                account: 'SYS-ROOT',
                initiatorRole,
                action: 'Damage Exception First Sign-off',
                detail: `Exception ${i.logId} for ${i.assetName} received first sign-off "${verdict}" from ${signOff.staffName} (${initiatorRole}). Awaiting second sign-off.${
                  note ? ` Note: ${note}` : ''
                }`,
                ip: randomIp(),
                status: 'Success',
              })
              return {
                ...i,
                status: 'Pending Second Sign-off',
                firstSignOff: signOff,
                custodyMode: 'genuine-dual-custody' as DamageCustodyMode,
              }
            }

            // Already Pending Second Sign-off — check distinct actor
            if (
              i.firstSignOff &&
              staffEmail &&
              i.firstSignOff.staffEmail === staffEmail
            ) {
              pushLog({
                account: 'SYS-ROOT',
                initiatorRole,
                action: 'Damage Exception Second Sign-off Rejected',
                detail: `Exception ${i.logId}: ${signOff.staffName} attempted to provide both sign-offs — rejected. A different qualifying WOM user is required.`,
                ip: randomIp(),
                status: 'Flagged',
              })
              return i // unchanged — same user cannot finalize
            }
            pushLog({
              account: 'SYS-ROOT',
              initiatorRole,
              action: 'Damage Exception Second Sign-off',
              detail: `Exception ${i.logId} for ${i.assetName} received second sign-off "${verdict}" from ${signOff.staffName} (${initiatorRole}), finalizing verdict.${
                note ? ` Note: ${note}` : ''
              }`,
              ip: randomIp(),
              status: 'Success',
            })
            return {
              ...i,
              status: verdict,
              secondSignOff: signOff,
              custodyMode: 'genuine-dual-custody' as DamageCustodyMode,
              notes: note ? `${i.notes}\n\nVerdict note: ${note}` : i.notes,
            }
          }

          const mode: DamageCustodyMode = selfValidation
            ? selfValidation.custodyMode
            : unblockMetadata
              ? 'admin-enabled-override'
              : i.custodyMode ?? 'standing-self-validation'

          pushLog({
            account: 'SYS-ROOT',
            initiatorRole,
            action: `Damage Exception ${verdict}`,
            detail: `Exception ${i.logId} for ${i.assetName} marked "${verdict}" by ${initiatorRole} (${staffName || 'Staff'}) [Custody: ${mode}].${
              note ? ` Note: ${note}` : ''
            }`,
            ip: randomIp(),
            status: verdict === 'Dismissed' ? 'Flagged' : 'Success',
          })
          void logAuditEvent({
            actor_id: staffEmail || 'sys-admin',
            actor_name: staffName || initiatorRole,
            module: 'damage',
            action_type: unblockMetadata ? 'EMERGENCY_UNBLOCK' : 'DAMAGE_VERDICT',
            target_id: i.id,
            target_snapshot: (i as unknown) as Record<string, unknown>,
            reason: unblockMetadata?.emergencyReason || note || `Verdict: ${verdict}`,
          })

          return {
            ...i,
            status: verdict,
            custodyMode: mode,
            unblockMetadata: unblockMetadata ?? i.unblockMetadata,
            selfValidation: selfValidation ?? i.selfValidation,
            notes: note ? `${i.notes}\n\nVerdict note: ${note}` : i.notes,
          }
        }),
      )

      // Async Backend Integration for Damage Sign-Off / Emergency Unblock
      if (unblockMetadata) {
        damageApi.adminUnblock(id, { verdict, note, unblockMetadata, selfValidation }).catch((err) => {
          console.warn('[store] Admin unblock REST API call failed:', err)
          setIsBackendConnected(false)
        })
      } else {
        damageApi.recordSignOff(id, { verdict, note, initiatorRole, staffEmail, staffName, selfValidation }).catch((err) => {
          console.warn('[store] Sign-off REST API call failed:', err)
          setIsBackendConnected(false)
        })
      }

      // Side Effects on Asset Registry
      if (targetItem) {
        const target = targetItem as DamageException
        if (verdict === 'Repair') {
          setInventory((inv) =>
            inv.map((asset) => {
              if (
                asset.assetId === target.assetSku ||
                asset.name.toLowerCase() === target.assetName.toLowerCase()
              ) {
                return {
                  ...asset,
                  status: 'In Maintenance',
                  updated: 'In maintenance · Under repair',
                }
              }
              return asset
            }),
          )
          pushLog({
            account: 'SYS-ROOT',
            initiatorRole: initiatorRole || 'Warehouse Ops',
            action: 'Asset Status Updated to In Maintenance',
            detail: `Asset ${target.assetName} (${target.assetSku}) status changed to 'In Maintenance' following Repair verdict on log ${target.logId}.`,
            ip: randomIp(),
            status: 'Success',
          })
        } else if (verdict === 'Write-off') {
          setInventory((inv) =>
            inv.map((asset) => {
              if (
                asset.assetId === target.assetSku ||
                asset.name.toLowerCase() === target.assetName.toLowerCase()
              ) {
                const nextStock = Math.max(0, asset.stock - 1)
                const nextStatus = nextStock === 0 ? 'Depleted' : deriveStockStatus(nextStock, asset.capacity)
                return {
                  ...asset,
                  stock: nextStock,
                  status: nextStatus,
                  updated: 'Stock decremented · Write-off loss ledger',
                }
              }
              return asset
            }),
          )
          pushLog({
            account: 'SYS-ROOT',
            initiatorRole: initiatorRole || 'Warehouse Ops',
            action: 'Asset Written Off — Loss Ledger Updated',
            detail: `Asset ${target.assetName} (${target.assetSku}) written off following Write-off verdict on log ${target.logId}. Loss-ledger entry logged. Stock decremented.`,
            ip: randomIp(),
            status: 'Flagged',
          })
        }
      }
    },
    [pushLog],
  )

  const completeMaintenance = useCallback(
    (assetId: string, initiatorRole = 'Warehouse Ops') => {
      damageApi.completeMaintenanceBackend(assetId).catch((err) => {
        console.warn('[store] Complete maintenance REST API call failed:', err)
        setIsBackendConnected(false)
      })

      setInventory((prev) =>
        prev.map((item) => {
          if (item.id !== assetId && item.assetId !== assetId) return item
          const nextStatus = deriveStockStatus(item.stock, item.capacity)
          const restoredStatus = nextStatus === 'In Maintenance' ? 'Available' : nextStatus
          pushLog({
            account: 'SYS-ROOT',
            initiatorRole,
            action: 'Maintenance Completed · Return to Stock',
            detail: `Maintenance completed for ${item.name} (${item.assetId}). Asset status restored to '${restoredStatus}'.`,
            ip: randomIp(),
            status: 'Success',
          })
          return {
            ...item,
            status: restoredStatus,
            updated: 'Returned to stock from maintenance',
          }
        }),
      )
    },
    [pushLog],
  )

  const settleEvent = useCallback(
    async (eventId: string, initiatorRole = 'Warehouse Ops') => {
      const target = events.find(
        (e) => e.id === eventId || e.title === eventId || e.refId === eventId,
      )
      if (!target) return { success: false, reason: 'Event not found' }

      const blockingItems = damageExceptions.filter((d) => {
        const matchesEvent =
          d.boundEvent === target.title || d.boundEvent === target.refId || d.boundEvent === target.id
        const isBlocking =
          d.status === 'Pending Verdict' ||
          d.status === 'Held for Audit' ||
          d.status === 'Pending Second Sign-off'
        return matchesEvent && isBlocking
      })

      if (blockingItems.length > 0) {
        return {
          success: false,
          reason: `${blockingItems.length} pending damage item(s) must be resolved first`,
        }
      }

      try {
        const check = await damageApi.checkSettlementBlockedBackend(eventId)
        if (check.blocked) {
          return {
            success: false,
            reason: `Backend settlement blocked: ${check.blockingItemsCount} blocking damage item(s) active on server`,
          }
        }
      } catch (err) {
        console.warn('[store] Settlement check REST API call failed:', err)
        setIsBackendConnected(false)
        return {
          success: false,
          reason: 'Could not verify settlement status with backend — please retry when connected',
        }
      }

      setEvents((prev) =>
        prev.map((e) => (e.id === target.id ? { ...e, status: 'Settled' } : e)),
      )

      pushLog({
        account: 'SYS-ROOT',
        initiatorRole,
        action: 'Event Portfolio Settled',
        detail: `Event portfolio "${target.title}" (${target.refId}) transitioned to Settled state following resolution of all damage liabilities.`,
        ip: randomIp(),
        status: 'Success',
      })

      return { success: true }
    },
    [events, damageExceptions, pushLog],
  )

  const addInventoryItem = useCallback(
    (item: InventoryItem) => {
      setInventory((prev) => [item, ...prev])
      pushLog({
        account: 'WAREHOUSE_MGR_01',
        initiatorRole: 'Warehouse Manager',
        action: 'Asset Registered to Inventory',
        detail: `New asset "${item.name}" (${item.assetId}) added to the shared inventory registry.`,
        ip: randomIp(),
        status: 'Success',
      })
    },
    [pushLog],
  )

  const updateInventoryItem = useCallback((item: InventoryItem) => {
    setInventory((prev) => prev.map((it) => (it.id === item.id ? item : it)))
  }, [])

  const value = useMemo(
    () => ({
      staff,
      events,
      logs,
      userActions,
      eventUpdates,
      procurement,
      vendors,
      damageExceptions,
      isBackendConnected,
      inventory,
      subRolesByParent,
      setSubRolesByParent,
      groundCrewTree,
      setGroundCrewTree,
      pendingSubRoleSetups,
      addStaff,
      addEmployeeRecord,
      removeStaff,
      toggleSuspend,
      updateStaff,
      forceLogout,
      addEvent,
      updateEvent,
      resolveUserAction,
      addUserAction,
      routeReorder,
      updateThreshold,
      resolveDamage,
      completeMaintenance,
      settleEvent,
      addInventoryItem,
      updateInventoryItem,
      refetchLogs,
    }),
    [
      staff,
      events,
      logs,
      userActions,
      eventUpdates,
      procurement,
      vendors,
      damageExceptions,
      isBackendConnected,
      inventory,
      subRolesByParent,
      setSubRolesByParent,
      groundCrewTree,
      setGroundCrewTree,
      pendingSubRoleSetups,
      addStaff,
      addEmployeeRecord,
      removeStaff,
      toggleSuspend,
      updateStaff,
      forceLogout,
      addEvent,
      updateEvent,
      resolveUserAction,
      addUserAction,
      routeReorder,
      updateThreshold,
      resolveDamage,
      completeMaintenance,
      settleEvent,
      addInventoryItem,
      updateInventoryItem,
      refetchLogs,
    ],
  )

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortal() {
  const ctx = useContext(PortalContext)
  if (!ctx) throw new Error('usePortal must be used within a PortalProvider')
  return ctx
}
