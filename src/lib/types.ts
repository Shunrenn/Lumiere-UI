// Shared domain types for the LUMIÈRE admin console

export type Route =
  | 'overview'
  | 'workforce'
  | 'dashboard'
  | 'registry'
  | 'logs'
  | 'security-audit'
  | 'rbac'
  | 'damage'
  | 'replenishment'
  // Warehouse supervisor console
  | 'inventory'
  | 'warehouse-logs'
  | 'crew'
  | 'deployments'
  | 'dispatch'
  // Event planner console
  | 'event-detail'
  | 'canvas'
  | 'canvas-workspace'
  // Ground crew field app
  | 'field-ops'
  // Warehouse mobile workspaces
  | 'warehouse-lead'
  | 'warehouse-member'
  | 'manning'
  | 'production-manager'
  | 'inventory-officer'

/* ---------- Procurement / Replenishment ---------- */

// Lifecycle state of a stocked asset relative to its replenishment threshold.
export type DeficitStatus =
  | 'Critical Deficit'
  | 'Low Stock'
  | 'Order Placed'
  | 'Available'

export interface ProcurementItem {
  id: string
  assetId: string
  name: string
  category: string
  currentStock: number
  threshold: number
  unit: string
  status: DeficitStatus
  // Populated once a reorder requisition has been routed.
  reorderQty?: number
  poRef?: string
  etaHours?: number
  supplier?: string
  image?: string
}

// A supplier/contact a reorder requisition can be routed to.
export interface Vendor {
  id: string
  name: string
  contactName: string
  email: string
  phone: string
  specialty: string
  leadTimeHours: number
  rating: number
  priceTier: 'Economy' | 'Standard' | 'Premium'
  preferred: boolean
  // Category keywords used to recommend a vendor for a given item.
  matches: string[]
}

export interface ReorderDraft {
  itemId: string
  reorderQty: number
  note: string
  vendorId: string
}

/* ---------- Staff / Access Control ---------- */

export const STAFF_ROLES = [
  'Admin',
  'Executive',
  'Warehouse Manager',
  'Event Planner',
  'Ground Crew',
  'Event Admin',
  'Warehouse Lead',
  'Warehouse Member',
  'Field & Production Crew',
] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export type SessionStatus =
  | 'Active Session'
  | 'Offline Session'
  | 'Suspended'

// A directory entry is either a full portal account (can authenticate) or an
// employee record (on-call / seasonal worker with no standing login).
export type RecordKind = 'full-account' | 'employee-record'

// The lifecycle state surfaced in Workforce Management, distinct from the live
// session state. Locked is derived from an open account-locked request.
export type AccountStatus = 'Active' | 'Pending' | 'Locked' | 'Suspended'

export type EmploymentType = 'On-call' | 'Seasonal'

export interface Staff {
  id: string
  employeeId: string
  surname: string
  firstName: string
  middleName?: string
  email: string
  contact: string
  role: StaffRole
  sessionStatus: SessionStatus
  lastAccess: string
  // Date the staff member was onboarded, used to group hires in the User
  // Growth Summary modal. Display format matches lastAccess (e.g. 'Feb 03, 2026').
  dateAdded?: string
  // Fields below are optional so existing screens/records keep type-checking;
  // Workforce Management normalizes any missing value to a 'full-account' default.
  recordKind?: RecordKind
  accountStatus?: AccountStatus
  employmentType?: EmploymentType
  // Present (unclaimed) only for a Pending full account awaiting first login.
  tempPassword?: string
  // Employee records can be archived and reactivated later.
  archived?: boolean
}

export interface NewStaffDraft {
  employeeId: string
  surname: string
  firstName: string
  middleName: string
  email: string
  contact: string
  role: StaffRole | ''
  tempPassword: string
}

// Employee record has no login credentials — no email, password, or role prompt.
export interface NewEmployeeRecordDraft {
  firstName: string
  surname: string
  contact: string
  employmentType: EmploymentType
}

/* ---------- Events ---------- */

export type ExperienceTier =
  | 'Tier-1 VIP (Bespoke Logistics)'
  | 'Tier-2 Premium'
  | 'Tier-3 Standard'

export type EventStatus =
  | 'Initialized'
  | 'In Production'
  | 'Completed'
  | 'On Hold'
  | 'Reserved'
  | 'Cancelled'

export interface PortalEvent {
  id: string
  refId: string
  title: string
  client: string
  tier: ExperienceTier
  venue: string
  targetDate: string
  installationStart: string
  installationEnd: string
  budget: number
  status: EventStatus
  moodPlan: string
}

/* ---------- Dispatch & Batches ---------- */

export type DispatchBatchStatus =
  | 'Planned'
  | 'Loaded'
  | 'In Transit'
  | 'Stalled In Transit'
  | 'Delivered'
  | 'Returned'

export interface NewEventDraft {
  title: string
  client: string
  venue: string
  targetDate: string
  installationStart: string
  installationEnd: string
  moodPlan: string
}

/* ---------- Account / User Actions ---------- */

// Pending account requests surfaced on the Overview and in Access Control.
export type UserActionType = 'forgot-password' | 'request-password' | 'account-locked'

export type UserActionStatus = 'pending' | 'completed'

export interface UserAction {
  id: string
  type: UserActionType
  user: string
  status: UserActionStatus
  // Account type of the roster member this request belongs to. Rendered as a
  // visible tag so the Admin can verify the queue spans every account type.
  accountType?: StaffRole
}

/* ---------- Event Updates ---------- */

export type EventUpdateStatus = 'Scheduled' | 'Action Required' | 'Completed'

export interface EventUpdate {
  id: string
  title: string
  status: EventUpdateStatus
}

/* ---------- Damage Validation ---------- */

// Verdict state for a post-event logistics damage exception.
// 'Pending Second Sign-off' and the two audit resolutions ('Repair' /
// 'Write-off') only apply to exceptions that were held for audit due to
// missing photographic evidence — resolving out of that hold requires two
// distinct Executive sign-offs.
export type DamageVerdict =
  | 'Pending Verdict'
  | 'Validated'
  | 'Dismissed'
  | 'Held for Audit'
  | 'Pending Second Sign-off'
  | 'Repair'
  | 'Write-off'

// A single Executive's sign-off on resolving a Held-for-Audit exception.
export interface DamageSignOff {
  executiveEmail: string
  executiveName: string
  verdict: 'Repair' | 'Write-off'
  note: string
  timestamp: string
}

export interface DamageException {
  id: string
  logId: string
  boundEvent: string
  reportingOfficer: string
  officerRole: string
  assetName: string
  assetSku: string
  damageType: string
  imageUrl: string
  gps: string
  capturedAt: string
  exifVerified: boolean
  estimatedCost: number
  notes: string
  status: DamageVerdict
  // Tags this exception as lacking photographic evidence — routes it to
  // "Held for Audit" and requires two distinct Executive sign-offs to resolve.
  noPhotographicEvidence?: boolean
  // The first Executive's sign-off while resolving out of "Held for Audit".
  // Present once status is 'Pending Second Sign-off' or a final audit verdict.
  firstSignOff?: DamageSignOff
  // The second, confirming/overriding Executive's sign-off. Present only once
  // the exception has fully resolved to 'Repair' or 'Write-off'.
  secondSignOff?: DamageSignOff
}

/* ---------- Inventory / Asset Registry ---------- */

export type StockStatus =
  | 'Available'
  | 'Low Stock'
  | 'Critical Deficit'
  | 'Order Placed'
  | 'Depleted'
  | 'In Maintenance'

export interface InventoryItem {
  id: string
  assetId: string
  name: string
  category: string
  image: string
  stock: number
  capacity: number
  status: StockStatus
  updated: string
  // Extended detail fields for the asset profile view
  description?: string
  dateAdded?: string
  store?: string
  representative?: string
  contact?: string
  height?: string
  width?: string
  weight?: string
  fragile?: boolean
  unit?: string
  cost?: number
  costPerUnit?: number
}

/* ---------- Activity Logs ---------- */

export interface ActivityLog {
  id: string
  timestamp: string
  date: string
  logId: string
  account: string
  initiatorRole: string
  action: string
  detail: string
  ip: string
  status: string
}
