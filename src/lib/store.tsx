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
  DamageException,
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

/* ----------------------------- Seed data ----------------------------- */

const seedStaffRaw: Staff[] = [
  {
    id: 's-1',
    employeeId: 'LM-0001',
    surname: 'Dela Cruz',
    firstName: 'Juan',
    middleName: 'Santos',
    email: 'juandelacruz@lumiere.com',
    contact: '09123456789',
    role: 'Event Planner',
    sessionStatus: 'Active Session',
    lastAccess: 'May 14, 2026 · 08:42',
    dateAdded: 'Jan 08, 2026',
  },
  {
    id: 's-2',
    employeeId: 'LM-0007',
    surname: 'Laurent',
    firstName: 'Camille',
    middleName: 'Marie',
    email: 'warehouse@lumiere.com',
    contact: '09987654321',
    role: 'Warehouse Manager',
    sessionStatus: 'Active Session',
    lastAccess: 'May 27, 2026 · 07:11',
    dateAdded: 'Jan 15, 2026',
  },
  {
    id: 's-3',
    employeeId: 'LM-0002',
    surname: 'Rodriguez',
    firstName: 'Maria',
    middleName: 'Elena',
    email: 'maria.rodriguez@lumiere.com',
    contact: '09111222333',
    role: 'Event Planner',
    sessionStatus: 'Offline Session',
    lastAccess: 'May 26, 2026 · 14:22',
    dateAdded: 'Feb 04, 2026',
  },
  {
    id: 's-4',
    employeeId: 'LM-0003',
    surname: 'Chen',
    firstName: 'Wei',
    middleName: 'Ming',
    email: 'wei.chen@lumiere.com',
    contact: '09222333444',
    role: 'Field & Production Crew',
    sessionStatus: 'Active Session',
    lastAccess: 'May 28, 2026 · 09:15',
    dateAdded: 'Feb 19, 2026',
  },
  {
    id: 's-5',
    employeeId: 'LM-0004',
    surname: 'Okafor',
    firstName: 'Amara',
    middleName: 'Chioma',
    email: 'amara.okafor@lumiere.com',
    contact: '09333444555',
    role: 'Field & Production Crew',
    sessionStatus: 'Active Session',
    lastAccess: 'May 28, 2026 · 11:30',
    dateAdded: 'Mar 03, 2026',
  },
  {
    id: 's-6',
    employeeId: 'LM-0005',
    surname: 'Singh',
    firstName: 'Rajesh',
    middleName: 'Kumar',
    email: 'rajesh.singh@lumiere.com',
    contact: '09444555666',
    role: 'Warehouse Manager',
    sessionStatus: 'Suspended',
    lastAccess: 'May 27, 2026 · 16:45',
    accountStatus: 'Suspended',
    dateAdded: 'Mar 21, 2026',
  },
  {
    id: 's-7',
    employeeId: 'LM-0006',
    surname: 'Martinez',
    firstName: 'Sofia',
    middleName: 'Gabriela',
    email: 'sofia.martinez@lumiere.com',
    contact: '09555666777',
    role: 'Admin',
    sessionStatus: 'Active Session',
    lastAccess: 'May 28, 2026 · 08:00',
    dateAdded: 'Apr 02, 2026',
  },
  {
    id: 's-8',
    employeeId: 'LM-0008',
    surname: 'Thompson',
    firstName: 'David',
    middleName: 'James',
    email: 'david.thompson@lumiere.com',
    contact: '09666777888',
    role: 'Field & Production Crew',
    sessionStatus: 'Active Session',
    lastAccess: 'May 28, 2026 · 10:20',
    dateAdded: 'Apr 17, 2026',
  },
  {
    id: 's-9',
    employeeId: 'LM-0009',
    surname: 'Park',
    firstName: 'Min-jun',
    middleName: 'Ho',
    email: 'min.park@lumiere.com',
    contact: '09777888999',
    role: 'Event Planner',
    sessionStatus: 'Offline Session',
    lastAccess: '—',
    accountStatus: 'Pending',
    tempPassword: 'Lm-Temp-4471',
    dateAdded: 'May 06, 2026',
  },
  {
    id: 's-10',
    employeeId: 'LM-0010',
    surname: 'Rossi',
    firstName: 'Isabella',
    middleName: 'Francesca',
    email: 'isabella.rossi@lumiere.com',
    contact: '09888999000',
    role: 'Executive',
    sessionStatus: 'Active Session',
    lastAccess: 'May 28, 2026 · 12:45',
    dateAdded: 'May 12, 2026',
  },
  // These two staff records mirror the two Executive login accounts
  // (executive@lumiere.com / executive2@lumiere.com) so Admin's Workforce
  // suspend toggle can simulate "only one Executive active" for the
  // two-sign-off Damage Validation flow.
  {
    id: 's-11',
    employeeId: 'LM-0011',
    surname: 'Devereux',
    firstName: 'Adrienne',
    middleName: '',
    email: 'executive@lumiere.com',
    contact: '09811223344',
    role: 'Executive',
    sessionStatus: 'Active Session',
    lastAccess: 'May 30, 2026 · 09:10',
    dateAdded: 'Jun 02, 2026',
  },
  {
    id: 's-12',
    employeeId: 'LM-0012',
    surname: 'Whitfield',
    firstName: 'Marcus',
    middleName: '',
    email: 'executive2@lumiere.com',
    contact: '09822334455',
    role: 'Executive',
    sessionStatus: 'Active Session',
    lastAccess: 'May 30, 2026 · 09:12',
    dateAdded: 'Jun 20, 2026',
  },
  {
    id: 's-13',
    employeeId: 'LM-0013',
    surname: 'Rostova',
    firstName: 'Elena',
    middleName: '',
    email: 'eventadmin@lumiere.com',
    contact: '09833445566',
    role: 'Event Admin',
    sessionStatus: 'Active Session',
    lastAccess: 'Jun 01, 2026 · 08:30',
    dateAdded: 'Jun 25, 2026',
  },
]

// On-call / seasonal workers who periodically return but hold no portal login.
// Kept client-side (they never authenticate) and preserved across DB hydration.
const seedEmployeeRecords: Staff[] = [
  {
    id: 'er-1',
    employeeId: 'EMP-0001',
    surname: 'Mendes',
    firstName: 'Lucia',
    middleName: '',
    email: '',
    contact: '09211334455',
    role: 'Field & Production Crew',
    sessionStatus: 'Offline Session',
    lastAccess: '—',
    recordKind: 'employee-record',
    accountStatus: 'Active',
    employmentType: 'On-call',
    dateAdded: 'Jan 22, 2026',
  },
  {
    id: 'er-2',
    employeeId: 'EMP-0002',
    surname: 'Vidal',
    firstName: 'Tomas',
    middleName: '',
    email: '',
    contact: '09455778899',
    role: 'Field & Production Crew',
    sessionStatus: 'Offline Session',
    lastAccess: '—',
    recordKind: 'employee-record',
    accountStatus: 'Active',
    employmentType: 'Seasonal',
    dateAdded: 'Mar 11, 2026',
  },
  {
    id: 'er-3',
    employeeId: 'EMP-0003',
    surname: 'Cruz',
    firstName: 'Bianca',
    middleName: '',
    email: '',
    contact: '09677889900',
    role: 'Field & Production Crew',
    sessionStatus: 'Offline Session',
    lastAccess: '—',
    recordKind: 'employee-record',
    accountStatus: 'Suspended',
    employmentType: 'Seasonal',
    archived: true,
    dateAdded: 'May 29, 2026',
  },
]

// Full accounts default to an Active portal account unless the raw entry says
// otherwise; employee records follow.
const seedStaff: Staff[] = [
  ...seedStaffRaw.map((s) => ({
    recordKind: 'full-account' as const,
    accountStatus: 'Active' as AccountStatus,
    ...s,
  })),
  ...seedEmployeeRecords,
]

const seedEvents: PortalEvent[] = [
  {
    id: 'e-1',
    refId: 'PRT-2026-0142',
    title: 'La Nuit Dorée — Spring Gala 2026',
    client: 'Maison Valois Group',
    tier: 'Tier-1 VIP (Bespoke Logistics)',
    venue: 'Chateau-Laffite Grand Ballroom',
    targetDate: 'Oct 14, 2026',
    installationStart: '4:00 PM',
    installationEnd: '11:00 PM',
    budget: 4850000,
    status: 'In Production',
    moodPlan: 'Gilded art-deco opulence with candlelit warmth.',
  },
  {
    id: 'e-2',
    refId: 'PRT-2026-0143',
    title: 'Grand Ballroom Wedding',
    client: 'Aurelio & Reyes Families',
    tier: 'Tier-2 Premium',
    venue: 'Ritz-Carlton Residency',
    targetDate: 'Oct 18, 2026',
    installationStart: '2:00 PM',
    installationEnd: '9:00 PM',
    budget: 2300000,
    status: 'Initialized',
    moodPlan: 'Soft ivory florals, romantic ambient lighting.',
  },
  {
    id: 'e-3',
    refId: 'PRT-2026-0144',
    title: 'Louvre Gala Event',
    client: 'Conseil des Arts',
    tier: 'Tier-1 VIP (Bespoke Logistics)',
    venue: 'The Louvre Pyramid Courtyard',
    targetDate: 'Nov 02, 2026',
    installationStart: '5:00 PM',
    installationEnd: '11:30 PM',
    budget: 7120000,
    status: 'On Hold',
    moodPlan: 'Monumental classical staging with modern projection.',
  },
]

const seedLogs: ActivityLog[] = [
  {
    id: 'l-1',
    timestamp: '08:42:11',
    date: 'May 14, 2026',
    logId: 'LOG-99281',
    account: 'LM-0001',
    initiatorRole: 'Event Planner',
    action: 'Portal Session Authenticated',
    detail: 'Successful login from registered terminal T-02 within approved access scope.',
    ip: '192.168.4.21',
    status: 'Success',
  },
  {
    id: 'l-2',
    timestamp: '07:15:48',
    date: 'May 14, 2026',
    logId: 'LOG-99275',
    account: 'SYS-ROOT',
    initiatorRole: 'Admin',
    action: 'Audit Log Integrity Check',
    detail: 'Scheduled checksum verification completed across 14 audit nodes. Zero tamper indicators.',
    ip: '10.0.0.1',
    status: 'Success',
  },
]

const seedUserActions: UserAction[] = [
  // One row per non-Admin account type, each pointing at a real roster member
  // (see seedStaff above) and tagged with that member's account type.
  {
    id: 'ua-1',
    type: 'account-locked',
    user: 'isabella.rossi@lumiere.com',
    accountType: 'Executive',
    status: 'pending',
  },
  {
    id: 'ua-2',
    type: 'forgot-password',
    user: 'juandelacruz@lumiere.com',
    accountType: 'Event Planner',
    status: 'pending',
  },
  {
    id: 'ua-3',
    type: 'account-locked',
    user: 'warehouse@lumiere.com',
    accountType: 'Warehouse Manager',
    status: 'pending',
  },
  {
    id: 'ua-4',
    type: 'forgot-password',
    user: 'wei.chen@lumiere.com',
    accountType: 'Field & Production Crew',
    status: 'pending',
  },
]

const seedProcurement: ProcurementItem[] = [
  {
    id: 'p-1',
    assetId: 'LM-0041',
    name: 'Floral Arch',
    category: 'Tabletop · Illumination',
    currentStock: 1,
    threshold: 15,
    unit: 'unit',
    status: 'Critical Deficit',
  },
  {
    id: 'p-2',
    assetId: 'LM-0089',
    name: 'Ivory Pillar Candles',
    category: 'Ambiance · Wax Goods',
    currentStock: 8,
    threshold: 40,
    unit: 'units',
    status: 'Critical Deficit',
  },
  {
    id: 'p-3',
    assetId: 'LM-0114',
    name: 'Champagne Coupe Glasses',
    category: 'Beverage · Glassware',
    currentStock: 24,
    threshold: 60,
    unit: 'units',
    status: 'Low Stock',
  },
  {
    id: 'p-4',
    assetId: 'LM-0207',
    name: 'Velvet Ceremony Chairs',
    category: 'Seating · Ceremony',
    currentStock: 18,
    threshold: 30,
    unit: 'units',
    status: 'Low Stock',
  },
  {
    id: 'p-5',
    assetId: 'LM-0332',
    name: 'Gold Linen Table Runners',
    category: 'Textile · Table Décor',
    currentStock: 11,
    threshold: 25,
    unit: 'units',
    status: 'Low Stock',
  },
  {
    id: 'p-6',
    assetId: 'LM-0458',
    name: 'Ornate Mirror Panels',
    category: 'Décor · Backdrop',
    currentStock: 7,
    threshold: 10,
    unit: 'units',
    status: 'Order Placed',
    reorderQty: 6,
    poRef: 'PO-44821',
    etaHours: 48,
  },
  {
    id: 'p-7',
    assetId: 'LM-0519',
    name: 'Eucalyptus Garland Sets',
    category: 'Floristry · Greenery',
    currentStock: 3,
    threshold: 20,
    unit: 'units',
    status: 'Critical Deficit',
  },
  {
    id: 'p-8',
    assetId: 'LM-0035',
    name: 'Round Linen Banquet Tables',
    category: 'Furniture · Banquet',
    currentStock: 12,
    threshold: 30,
    unit: 'units',
    status: 'Low Stock',
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
    id: 'i-1',
    assetId: 'LM-0012',
    name: 'Premium White Resin Tiffany Chair',
    category: 'Seating · Ceremony',
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
    category: 'Lighting · Statement',
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
    category: 'Furniture · Banquet',
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
    category: 'Décor · Backdrop',
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
    category: 'Ambiance · Wax Goods',
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
    category: 'Beverage · Glassware',
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
    category: 'Seating · Ceremony',
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
    category: 'Floristry · Greenery',
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
    category: 'Seating · Ceremony',
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
  addEvent: (draft: NewEventDraft, initiatorRole?: string) => void
  updateEvent: (id: string, draft: NewEventDraft, initiatorRole?: string) => void
  resolveUserAction: (id: string) => void
  routeReorder: (draft: ReorderDraft) => void
  updateThreshold: (id: string, threshold: number) => void
  resolveDamage: (
    id: string,
    verdict: Exclude<DamageVerdict, 'Pending Verdict'>,
    note: string,
    initiatorRole?: string,
    executiveEmail?: string,
    executiveName?: string,
  ) => void
  addInventoryItem: (item: InventoryItem) => void
  updateInventoryItem: (item: InventoryItem) => void
}

const PortalContext = createContext<PortalContextValue | null>(null)

export function PortalProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff[]>(seedStaff)
  const [events, setEvents] = useState<PortalEvent[]>(seedEvents)

  // Hydrate the staff directory from the database (portal_accounts is the source of truth).
  useEffect(() => {
    let active = true
    ;(async () => {
      const { data, error } = await supabase
        .from('portal_accounts')
        .select(
          'id, email, name, role, temporary_password, employee_id, surname, first_name, middle_name, contact, session_status, updated_at',
        )
        .order('employee_id', { ascending: true })

      if (!active) return
      if (error) {
        console.error('[v0] Failed to load staff from database:', error)
        return
      }
      if (data) {
        // Full accounts are DB-owned; employee records live only in the client,
        // so preserve them when the directory syncs from the database.
        setStaff((prev) => {
          const records = prev.filter((s) => s.recordKind === 'employee-record')
          return [...data.map(rowToStaff), ...records]
        })
      }
    })()
    return () => {
      active = false
    }
  }, [])
  const [logs, setLogs] = useState<ActivityLog[]>(seedLogs)
  const [userActions, setUserActions] = useState<UserAction[]>(seedUserActions)

  // Hydrate pending account requests (forgot-password / request-access) from the database.
  useEffect(() => {
    let active = true
    ;(async () => {
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
    })()
    return () => {
      active = false
    }
  }, [])
  const [eventUpdates] = useState<EventUpdate[]>(seedEventUpdates)
  const [procurement, setProcurement] = useState<ProcurementItem[]>(seedProcurement)
  const [vendors] = useState<Vendor[]>(seedVendors)
  const [damageExceptions, setDamageExceptions] = useState<DamageException[]>(seedDamage)
  const [inventory, setInventory] = useState<InventoryItem[]>(seedInventory)

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
      const fullName = `${draft.firstName} ${draft.surname}`.trim()
      const email = draft.email.trim().toLowerCase()

      // Persist the account to the database so it can authenticate at the login page.
      const { data, error } = await supabase
        .from('portal_accounts')
        .insert({
          email,
          password_hash: draft.tempPassword,
          name: fullName,
          role,
          temporary_password: true,
          employee_id: draft.employeeId,
          surname: draft.surname,
          first_name: draft.firstName,
          middle_name: draft.middleName,
          contact: draft.contact,
          session_status: 'Offline Session',
        })
        .select(
          'id, email, name, role, temporary_password, employee_id, surname, first_name, middle_name, contact, session_status, updated_at',
        )
        .single()

      if (error || !data) {
        // No live database in this environment: fall back to an in-memory
        // account so the directory stays functional. The temporary password is
        // retained and the account surfaces as "Pending" (forced first-login
        // password change) exactly like a persisted row would.
        console.error('[v0] Falling back to local account (DB unavailable):', error)
        const localStaff: Staff = {
          id: `s-${Date.now()}`,
          employeeId: draft.employeeId,
          surname: draft.surname,
          firstName: draft.firstName,
          middleName: draft.middleName,
          email,
          contact: draft.contact,
          role,
          sessionStatus: 'Offline Session',
          lastAccess: '—',
          recordKind: 'full-account',
          accountStatus: 'Pending',
          tempPassword: draft.tempPassword,
        }
        setStaff((prev) => [...prev, localStaff])
        pushLog({
          account: draft.employeeId,
          initiatorRole: 'Admin',
          action: 'New Employee Profile Created',
          detail: `Provisioned account for ${fullName} (${role}). Saved to the local directory with a temporary password; user must change it on first login.`,
          ip: randomIp(),
          status: 'Success',
        })
        return
      }

      // Ground crew get a matching roster record linked to their account.
      if (role === 'Ground Crew') {
        await supabase.from('crew_roster').insert({
          account_id: data.id,
          employee_id: draft.employeeId,
          name: fullName,
          role: 'Ground Crew Field',
          status: 'Available',
          week_mon: 1,
          week_tue: 1,
          week_wed: 1,
          week_thu: 1,
          week_fri: 1,
          week_sat: 0,
          week_sun: 0,
        })
      }

      setStaff((prev) => [...prev, rowToStaff(data)])
      pushLog({
        account: draft.employeeId,
        initiatorRole: 'Admin',
        action: 'New Employee Profile Created',
        detail: `Provisioned account for ${fullName} (${role}). Account saved to directory; user can sign in with the temporary password.`,
        ip: randomIp(),
        status: 'Success',
      })
    },
    [pushLog],
  )

  const removeStaff = useCallback(
    async (id: string) => {
      const target = staff.find((s) => s.id === id)
      // Remove from the database (crew_roster rows cascade via FK).
      const { error } = await supabase.from('portal_accounts').delete().eq('id', id)
      if (error) {
        console.error('[v0] Failed to remove account:', error)
        return
      }
      setStaff((prev) => prev.filter((s) => s.id !== id))
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

      // Employee records carry no portal session and never hit the database —
      // "suspend" archives them; "reactivate" restores them from the archive.
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

      const nextSession = suspending ? 'Suspended' : 'Active Session'
      // Best-effort DB persistence; the directory update applies regardless so
      // the action works even when no live database is connected.
      const { error } = await supabase
        .from('portal_accounts')
        .update({ session_status: nextSession })
        .eq('id', id)
      if (error) {
        console.error('[v0] Suspension persisted locally only (DB unavailable):', error)
      }
      setStaff((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, sessionStatus: nextSession, accountStatus: suspending ? 'Suspended' : 'Active' }
            : s,
        ),
      )
      pushLog({
        account: target.employeeId,
        initiatorRole: 'Admin',
        action: suspending ? 'Session Privileges Revoked' : 'Session Restored',
        detail: `${fullName} account status changed to ${suspending ? 'Suspended' : 'Active'}.`,
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
    (updated: Staff) => {
      setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      pushLog({
        account: updated.employeeId,
        initiatorRole: 'Admin',
        action: 'Employee Profile Updated',
        detail: `Profile details for ${updated.firstName} ${updated.surname} (${updated.role}) were edited.`,
        ip: randomIp(),
        status: 'Success',
      })
      // Best-effort persistence to the directory.
      void supabase
        .from('portal_accounts')
        .update({
          first_name: updated.firstName,
          surname: updated.surname,
          contact: updated.contact,
          email: updated.email,
          role: updated.role,
        })
        .eq('id', updated.id)
        .then(({ error }) => {
          if (error) console.error('[v0] Failed to update account:', error)
        })
    },
    [pushLog],
  )

  const forceLogout = useCallback(
    (id: string) => {
      const target = staff.find((s) => s.id === id)
      if (!target) return
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
    (draft: NewEventDraft, initiatorRole = 'Executive') => {
      setEvents((prev) => {
        const refId = `PRT-2026-${pad(145 + prev.length)}`
        pushLog({
          account: initiatorRole === 'Executive' ? 'EXEC-ROOT' : 'SYS-ROOT',
          initiatorRole,
          action: 'Event Registry Initialized',
          detail: `New portfolio "${draft.title}" registered${
            draft.client ? ` for ${draft.client}` : ''
          }. Ref ${refId}.`,
          ip: randomIp(),
          status: 'Success',
        })
        return [
          ...prev,
          {
            id: `e-${Date.now()}`,
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
          },
        ]
      })
    },
    [pushLog],
  )

  const updateEvent = useCallback(
    (id: string, draft: NewEventDraft, initiatorRole = 'Executive') => {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                title: draft.title,
                client: draft.client,
                venue: draft.venue,
                targetDate: draft.targetDate,
                installationStart: draft.installationStart,
                installationEnd: draft.installationEnd,
                moodPlan: draft.moodPlan,
              }
            : e,
        ),
      )
      pushLog({
        account: initiatorRole === 'Executive' ? 'EXEC-ROOT' : 'SYS-ROOT',
        initiatorRole,
        action: 'Event Registry Updated',
        detail: `Portfolio "${draft.title}" details were edited.`,
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
              a.type === 'forgot-password'
                ? 'Temporary Password Generated'
                : 'Account Unlocked & Temp Password Sent',
            detail:
              a.type === 'forgot-password'
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
            status: 'Order Placed',
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
          if (status !== 'Order Placed') {
            const ratio = threshold > 0 ? item.currentStock / threshold : 1
            status =
              ratio <= 0.3 ? 'Critical Deficit' : ratio < 1 ? 'Low Stock' : 'Available'
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
      initiatorRole = 'Executive',
      executiveEmail?: string,
      executiveName?: string,
    ) => {
      setDamageExceptions((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i

          // Resolving a Held-for-Audit item to Repair/Write-off requires two
          // distinct Executive sign-offs. First submission parks the item at
          // "Pending Second Sign-off"; a different executive's submission
          // finalizes it.
          const isAuditResolution =
            (verdict === 'Repair' || verdict === 'Write-off') &&
            (i.status === 'Held for Audit' || i.status === 'Pending Second Sign-off')

          if (isAuditResolution) {
            const signOff = {
              executiveEmail: executiveEmail ?? '',
              executiveName: executiveName ?? initiatorRole,
              verdict,
              note,
              timestamp: now().timestamp,
            }

            if (i.status === 'Held for Audit') {
              pushLog({
                account: initiatorRole === 'Executive' ? 'EXEC-ROOT' : 'SYS-ROOT',
                initiatorRole,
                action: 'Damage Exception First Sign-off',
                detail: `Exception ${i.logId} for ${i.assetName} received first sign-off "${verdict}" from ${signOff.executiveName}. Awaiting a second, different Executive.${
                  note ? ` Note: ${note}` : ''
                }`,
                ip: randomIp(),
                status: 'Success',
              })
              return {
                ...i,
                status: 'Pending Second Sign-off',
                firstSignOff: signOff,
              }
            }

            // Already Pending Second Sign-off — a different executive confirms
            // or overrides. Reject if the same executive attempts both sign-offs.
            if (
              i.firstSignOff &&
              executiveEmail &&
              i.firstSignOff.executiveEmail === executiveEmail
            ) {
              pushLog({
                account: 'EXEC-ROOT',
                initiatorRole,
                action: 'Damage Exception Second Sign-off Rejected',
                detail: `Exception ${i.logId}: ${signOff.executiveName} attempted to provide both sign-offs — rejected. A different Executive is required.`,
                ip: randomIp(),
                status: 'Flagged',
              })
              return i // unchanged — same executive cannot finalize
            }
            pushLog({
              account: initiatorRole === 'Executive' ? 'EXEC-ROOT' : 'SYS-ROOT',
              initiatorRole,
              action: 'Damage Exception Second Sign-off',
              detail: `Exception ${i.logId} for ${i.assetName} received second sign-off "${verdict}" from ${signOff.executiveName}, finalizing the audit verdict.${
                note ? ` Note: ${note}` : ''
              }`,
              ip: randomIp(),
              status: 'Success',
            })
            return {
              ...i,
              status: verdict,
              secondSignOff: signOff,
              notes: note ? `${i.notes}\n\nVerdict note: ${note}` : i.notes,
            }
          }

          pushLog({
            account: initiatorRole === 'Executive' ? 'EXEC-ROOT' : 'SYS-ROOT',
            initiatorRole,
            action: `Damage Exception ${verdict}`,
            detail: `Exception ${i.logId} for ${i.assetName} marked "${verdict}".${
              note ? ` Note: ${note}` : ''
            }`,
            ip: randomIp(),
            status: verdict === 'Dismissed' ? 'Flagged' : 'Success',
          })
          return {
            ...i,
            status: verdict,
            notes: note ? `${i.notes}\n\nVerdict note: ${note}` : i.notes,
          }
        }),
      )
    },
    [pushLog],
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
      routeReorder,
      updateThreshold,
      resolveDamage,
      addInventoryItem,
      updateInventoryItem,
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
      routeReorder,
      updateThreshold,
      resolveDamage,
      addInventoryItem,
      updateInventoryItem,
    ],
  )

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortal() {
  const ctx = useContext(PortalContext)
  if (!ctx) throw new Error('usePortal must be used within a PortalProvider')
  return ctx
}
