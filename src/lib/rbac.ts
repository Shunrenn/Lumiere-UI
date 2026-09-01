// Data model for the Roles & Sub-Roles (RBAC) screen.
//
// The platform recognizes five structural account types. Three of them
// (Admin, Executive, Event Planner) are single-scope structural roles — they
// exist at the account level and are not configured per company. The remaining
// two (Warehouse Operations Manager, Ground Crew) fan out into sub-roles that
// each company can switch on or off, because not every company staffs every
// function.

export type AccessLevel = 'View' | 'Interact' | 'Modify' | 'None'

// Description of each level for the on-screen legend.
export const ACCESS_LEVELS: { level: AccessLevel; label: string; hint: string }[] = [
  { level: 'View', label: 'View', hint: 'Read-only visibility' },
  { level: 'Interact', label: 'Interact', hint: 'Act within existing records / workflows' },
  { level: 'Modify', label: 'Modify', hint: 'Create, edit, and delete' },
  { level: 'None', label: 'None', hint: 'No access' },
]

export interface ModulePermission {
  module: string
  level: AccessLevel
  note: string
}

export interface SubRole {
  id: string
  name: string
  // One-line summary of the permission philosophy for this sub-role.
  summary: string
  // The single domain in which this sub-role may Modify.
  domain: string
  // Full permission detail, grouped by module.
  permissions: ModulePermission[]
  // Greyed-out, not yet available sub-roles (e.g. Production Crew).
  comingSoon?: boolean
  // Whether an Admin has explicitly saved this sub-role's permission table at
  // least once. Undefined/omitted (the case for every pre-existing sub-role
  // below) is treated as configured — only newly created sub-roles start
  // out false, via commitPinAction in AdminRolesPage. Once true, it stays
  // true permanently; later edits never reset it. See isPermissionsConfigured.
  permissionsConfigured?: boolean
}

// Pre-existing sub-roles never set `permissionsConfigured`, so treat
// `undefined` the same as `true` — only an explicit `false` (newly created,
// never-saved) counts as needing setup.
export function isPermissionsConfigured(sub: SubRole): boolean {
  return sub.permissionsConfigured !== false
}

export interface StructuralRole {
  id: string
  name: string
  scope: string
  description: string
}

export interface ParentRole {
  id: string
  name: string
  description: string
  subRoles: SubRole[]
}

/* ----------------------------- Structural account types ----------------------------- */

export const STRUCTURAL_ROLES: StructuralRole[] = [
  {
    id: 'admin',
    name: 'Admin',
    scope: 'Global — all modules, all companies',
    description:
      'Full platform administration: user provisioning, role configuration, and audit oversight. Assigned at the account level and identical across every company.',
  },
  {
    id: 'executive',
    name: 'Executive',
    scope: 'Cross-company read — dashboards & analytics',
    description:
      'Strategic, read-only oversight of every event, portfolio, and analytics surface. Executives observe but do not operate day-to-day workflows.',
  },
  {
    id: 'event-planner',
    name: 'Event Planner',
    scope: 'Event design, canvas & pipeline',
    description:
      'Owns the event design and planning lifecycle — the design canvas, event registry, and pipeline. A single structural scope shared by all planners.',
  },
]

/* ----------------------------- Warehouse Operations Manager sub-roles ----------------------------- */

// Shared warehouse modules referenced across WOM sub-roles.
export const WOM_MODULES = [
  'Event Operations',
  'Inventory & Stock',
  'Asset Catalog',
  'Production',
  'Manpower & Crew',
  'Dispatch & Manifest',
  'Procurement & Vendors',
  'Replenishment',
] as const

// Build a WOM sub-role: everything is View/Interact broadly, with Modify only
// in the sub-role's own domain module(s).
function womSubRole(
  id: string,
  name: string,
  summary: string,
  domain: string,
  modifyModules: string[],
  interactModules: string[] = [],
): SubRole {
  return {
    id,
    name,
    summary,
    domain,
    permissions: WOM_MODULES.map((module) => {
      if (modifyModules.includes(module)) {
        return { module, level: 'Modify', note: 'Full control within this sub-role’s domain.' }
      }
      if (interactModules.includes(module)) {
        return { module, level: 'Interact', note: 'Act on existing records to coordinate work.' }
      }
      return { module, level: 'View', note: 'Read-only visibility for cross-team awareness.' }
    }),
  }
}

export const WOM_SUBROLES: SubRole[] = [
  womSubRole(
    'manning-officer',
    'Manning Officer',
    'Broad view across warehouse operations; modifies crew scheduling and manpower only.',
    'Manpower & Crew',
    ['Manpower & Crew'],
    ['Dispatch & Manifest', 'Event Operations'],
  ),
  womSubRole(
    'warehouse-manager',
    'Warehouse Manager',
    'Oversees the floor with broad visibility; modifies the asset catalog and warehouse records.',
    'Asset Catalog',
    ['Asset Catalog', 'Inventory & Stock'],
    ['Dispatch & Manifest', 'Production', 'Event Operations'],
  ),
  womSubRole(
    'production-manager',
    'Production Manager',
    'Coordinates fabrication broadly; modifies production runs and quotas only.',
    'Production',
    ['Production'],
    ['Manpower & Crew', 'Inventory & Stock', 'Event Operations'],
  ),
  womSubRole(
    'inventory-officer',
    'Inventory Officer',
    'Tracks stock across the operation; modifies inventory counts and stock records only.',
    'Inventory & Stock',
    ['Inventory & Stock'],
    ['Asset Catalog', 'Replenishment'],
  ),
  womSubRole(
    'purchasing-officer',
    'Purchasing Officer',
    'Sees the full supply picture; modifies procurement, vendors, and replenishment only.',
    'Procurement & Vendors',
    ['Procurement & Vendors', 'Replenishment'],
    ['Inventory & Stock'],
  ),
]

/* ----------------------------- Ground Crew sub-roles (recursive tree) ----------------------------- */

export const GROUND_MODULES = [
  'Assigned Tasks',
  'Dispatch Handoff',
  'Field Checklists',
  'Warehouse Staging',
  'Production Floor',
] as const

// Ground Crew is modeled as a tree of arbitrary depth (organizational
// containers like "Warehouse Operations" nesting down to leaf tiers like
// "Team Lead" / "Member") rather than the flat SubRole list used by WOM.
//
// A node is a LEAF — the only kind of node people are actually assigned to,
// and the only kind whose permission table is operationally meaningful —
// when it has no children. The moment an Admin adds a child underneath a
// node, that node becomes an organizational container: assignment and
// permission configuration move down to the new child tiers, so the
// parent's own permission table (still present on the object for data-model
// consistency) is no longer surfaced or required. This is derived from
// structure (children.length), not a separately-maintained flag, so the two
// can never drift out of sync.
export interface SubRoleNode {
  id: string
  name: string
  summary?: string
  permissions: ModulePermission[]
  // Same semantics as SubRole.permissionsConfigured — only meaningful for
  // leaf nodes. See isNodeConfigured.
  permissionsConfigured?: boolean
  comingSoon?: boolean
  children: SubRoleNode[]
}

export function isLeafNode(node: SubRoleNode): boolean {
  return node.children.length === 0
}

// Container nodes are never "pending setup" — only a leaf's own explicit
// `false` counts as needing configuration.
export function isNodeConfigured(node: SubRoleNode): boolean {
  if (!isLeafNode(node)) return true
  return node.permissionsConfigured !== false
}

function groundLeaf(
  id: string,
  name: string,
  summary: string,
  modifyModules: string[],
  interactModules: string[] = [],
  comingSoon = false,
): SubRoleNode {
  return {
    id,
    name,
    summary,
    comingSoon,
    children: [],
    permissions: GROUND_MODULES.map((module) => {
      if (modifyModules.includes(module)) {
        return { module, level: 'Modify', note: 'Update and complete work in this domain.' }
      }
      if (interactModules.includes(module)) {
        return { module, level: 'Interact', note: 'Acknowledge and act on assigned items.' }
      }
      return { module, level: 'View', note: 'Read-only visibility of related work.' }
    }),
  }
}

// Seed: each of these starts as a leaf tier (matches current behavior
// exactly — real permissions, people assigned directly). An Admin can nest
// further tiers underneath any of them at any depth via "Add sub-role".
export const GROUND_CREW_TREE_SEED: SubRoleNode[] = [
  groundLeaf(
    'event-admin',
    'Event Admin',
    'Event-scoped 2nd-tier confirmation authority between Team Lead/Field Lead and Manning.',
    ['Assigned Tasks', 'Field Checklists'],
    ['Dispatch Handoff'],
  ),
  groundLeaf(
    'field-crew',
    'Field Crew',
    'Executes on-site setup; modifies field checklists and acknowledges dispatch handoffs.',
    ['Field Checklists'],
    ['Assigned Tasks', 'Dispatch Handoff'],
  ),
  groundLeaf(
    'warehouse-crew',
    'Warehouse Crew',
    'Handles picking, staging, and load-out; modifies warehouse staging tasks only.',
    ['Warehouse Staging'],
    ['Assigned Tasks', 'Dispatch Handoff'],
  ),
  {
    id: 'production-crew',
    name: 'Production Crew',
    summary: 'Production floor execution — not yet available on the platform.',
    comingSoon: true,
    children: [],
    permissions: GROUND_MODULES.map((module) => ({
      module,
      level: 'None' as AccessLevel,
      note: 'Scope defined once this sub-role launches.',
    })),
  },
]

/* ----------------------------- Tree helpers (pure, immutable) ----------------------------- */

export function findNode(tree: SubRoleNode[], id: string): SubRoleNode | undefined {
  for (const node of tree) {
    if (node.id === id) return node
    const found = findNode(node.children, id)
    if (found) return found
  }
  return undefined
}

// Returns the chain of ancestor nodes (not including the node itself) leading
// to `id`, root-first. Used for breadcrumbs and duplicate-name scoping.
export function findPath(tree: SubRoleNode[], id: string, trail: SubRoleNode[] = []): SubRoleNode[] | undefined {
  for (const node of tree) {
    if (node.id === id) return trail
    const found = findPath(node.children, id, [...trail, node])
    if (found) return found
  }
  return undefined
}

export function mapTree(tree: SubRoleNode[], id: string, fn: (node: SubRoleNode) => SubRoleNode): SubRoleNode[] {
  return tree.map((node) => {
    if (node.id === id) return fn(node)
    if (node.children.length === 0) return node
    return { ...node, children: mapTree(node.children, id, fn) }
  })
}

export function addChildToTree(tree: SubRoleNode[], parentId: string, child: SubRoleNode): SubRoleNode[] {
  return tree.map((node) => {
    if (node.id === parentId) return { ...node, children: [...node.children, child] }
    if (node.children.length === 0) return node
    return { ...node, children: addChildToTree(node.children, parentId, child) }
  })
}

export function removeFromTree(tree: SubRoleNode[], id: string): SubRoleNode[] {
  return tree
    .filter((node) => node.id !== id)
    .map((node) => (node.children.length === 0 ? node : { ...node, children: removeFromTree(node.children, id) }))
}

// Count of all descendants (children, grandchildren, ...) of a node — used
// for the cascade-delete warning.
export function countDescendants(node: SubRoleNode): number {
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0)
}

// Every leaf across the whole tree whose permission table has never been
// saved, with a breadcrumb name for display context.
export function collectPendingLeaves(
  tree: SubRoleNode[],
  trail: string[] = [],
): { id: string; name: string; breadcrumb: string }[] {
  return tree.flatMap((node) => {
    if (node.comingSoon) return []
    if (isLeafNode(node)) {
      if (isNodeConfigured(node)) return []
      return [{ id: node.id, name: node.name, breadcrumb: [...trail, node.name].join(' \u203a ') }]
    }
    return collectPendingLeaves(node.children, [...trail, node.name])
  })
}

/* ----------------------------- Parent roles with sub-roles ----------------------------- */

export const PARENT_ROLES: ParentRole[] = [
  {
    id: 'warehouse-ops-manager',
    name: 'Warehouse Operations Manager',
    description:
      'The operational backbone of each company. Broad visibility across warehouse modules, with each sub-role owning Modify rights in a single domain.',
    subRoles: WOM_SUBROLES,
  },
]

// Ground Crew is rendered separately from PARENT_ROLES as a recursive tree
// (see SubRoleNode above) rather than a flat sub-role list. This holds just
// the header copy for that section.
export const GROUND_CREW_PARENT = {
  id: 'ground-crew',
  name: 'Ground Crew',
  description:
    'Field and warehouse execution staff. Task-focused access scoped tightly to the work each crew type performs. Nest organizational tiers to any depth — people are assigned at the deepest leaf tier.',
}

// Maps each configurable parent role to the fixed module list its sub-roles
// are scoped against. Used when the Admin creates a brand-new sub-role, so
// its default permission table has the right rows for that account type.
export const PARENT_MODULES: Record<string, readonly string[]> = {
  'warehouse-ops-manager': WOM_MODULES,
  'ground-crew': GROUND_MODULES,
}

// Default enablement: which sub-roles are switched on out of the box for
// this single-company platform.
export const DEFAULT_ENABLED_SUBROLES: string[] = [
  'manning-officer',
  'warehouse-manager',
  'production-manager',
  'inventory-officer',
  'purchasing-officer',
  'event-admin',
  'field-crew',
  'warehouse-crew',
]

/* ----------------------------- Runtime permission resolution ----------------------------- */

// Maps the operational WarehouseModuleId keys used by the console UI to the
// RBAC module names defined on each sub-role above. This is the single bridge
// between "what the screen calls a module" and "what the Roles & Sub-Roles
// screen calls it", so permission gates always resolve against the same
// View/Interact/Modify/None badges shown to the user.
export const WOM_MODULE_RBAC_NAME: Record<string, string> = {
  assets: 'Asset Catalog',
  replenishment: 'Replenishment',
  vendors: 'Procurement & Vendors',
  manpower: 'Manpower & Crew',
  dispatch: 'Dispatch & Manifest',
  production: 'Production',
}

const WOM_SUBROLE_BY_NAME: Record<string, SubRole> = Object.fromEntries(
  WOM_SUBROLES.map((sub) => [sub.name, sub]),
)

// Resolves the AccessLevel a given WOM sub-role holds for a given operational
// module id, straight from the RBAC data. Returns 'None' for unknown sub-roles
// or modules. Full-access accounts are handled by the caller (they bypass this
// and are granted Modify everywhere).
export function womModuleAccessLevel(subRoleName: string, moduleId: string): AccessLevel {
  const sub = WOM_SUBROLE_BY_NAME[subRoleName]
  const moduleName = WOM_MODULE_RBAC_NAME[moduleId]
  if (!sub || !moduleName) return 'None'
  return sub.permissions.find((perm) => perm.module === moduleName)?.level ?? 'None'
}
