# LUMIÈRE — Pre-Branding UI/UX Experience Audit

**Document Status:** Baseline Pre-Branding Architectural & UX Evaluation  
**Target Repository:** `Shunrenn/Lumiere-UI` (`Lumiere_Frontend`)  
**Audit Date:** September 2026  
**Scope:** Read-only inspection of frontend architecture, componentry, role surfaces, interaction flows, visual hierarchy, ergonomics, and branding readiness prior to design system overhaul.

---

## 1. Executive Summary

Lumière is an operational partner platform engineered specifically for the intricate, high-stakes demands of a premier **Event Styling Company**. Unlike generic ERPs or simplified inventory trackers, Lumière represents the rigorous logistical, creative, and forensic machinery operating behind visible luxury events.

The platform balances three primary operational pillars alongside rich secondary capabilities:
1. **Resource Allocation:** Workforce manning, crew rosters, task deployments, equipment reservation buffers (Local 1/1 vs. National 3/5 day padding), and venue asset distribution.
2. **Forensic Enforcement & Accountability:** Dual-custody damage verifications, cryptographic photo hashing (SHA-256 / EXIF metadata verification via HAVA), audit log ledgers, 6-digit confirmation PIN gates, and administrative override tracking.
3. **Event & Asset Lifecycle Management:** Visual 2D spatial canvas layout, asset catalog thresholds, deficit procurement queues, vendor PO routing, dispatch manifest transit tracking, and post-event settlement.
4. **Institutional Memory & Proposal Pitching:** PM client pitching lifecycle, conflict detection (date/venue double-booking and title overlap), and system health metrics.

### Current Architectural State
The application operates as a single-page application (SPA) built with React 19, TypeScript, Vite, Tailwind CSS v4, and Lucide icons, backed by a dual-delivery model:
- **Desktop Web Console:** Multi-role operational workstation utilizing distinct shell paradigms (`AdminShell`, `ExecutiveShell`, `ConsoleLayout`, `WarehouseHomePage`, `ProjectManagerDashboardPage`, `CanvasWorkspacePage`).
- **Mobile PWA Interface:** Focused, touch-oriented viewport (`.mobile-shell`, `PwaHeader`, `PwaBottomNav`, `PwaCard`, `PwaModal`) targeted at on-site Ground Crew, Warehouse Leads/Members, Manning Officers, Production Managers, and Inventory Officers.

### Core Audit Takeaways
- **Strong Domain Alignment:** The domain model mirrors the realities of physical event styling with exceptional accuracy—specifically temporal conflict detection, damage escrow holds, and deficit replenishment queues.
- **Architectural & Visual Fragmentation:** The UI suffers from five competing shell layout implementations, ad-hoc inline color overrides alongside CSS variables, multiple disconnected modal patterns, and divergent navigation architectures.
- **Branding Readiness:** The underlying design tokens (`:root` / `.dark` in [`src/index.css`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/index.css) and [`src/App.css`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/App.css)) provide a solid foundation for a luxury "Walnut & Gold / Paper & Ink" aesthetic, but require structural cleanup and component consolidation before a global visual refresh can be applied cleanly.

---

## 2. Product Surface Map

Below is the verified inventory of all routes, portal boundaries, layout shells, and UI patterns currently implemented across the application.

```
                                  ┌────────────────────────────────────────┐
                                  │             AUTHENTICATION             │
                                  │  LoginPage.tsx / GroundCrewLoginPage   │
                                  └───────────────────┬────────────────────┘
                                                      │
                                           [ Gate / Role Guard ]
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       │                                                             │
            [ Web Desktop Console ]                                       [ Mobile PWA Portal ]
                       │                                                             │
     ┌─────────────────┼─────────────────┐                         ┌─────────────────┼─────────────────┐
     ▼                 ▼                 ▼                         ▼                 ▼                 ▼
[ AdminShell ]  [ ExecutiveShell ] [ ConsoleLayout ]         [ GroundCrewPage ] [ ManningPage ]  [ WOM Mobile ]
- System Dash   - Event Dash     - Replenishment             - Checkpoints     - Breaches        - Lead/Member
- Workforce     - Registry       - Damage Validation         - Checklists      - Delegations     - Production
- RBAC Tree     - Security Logs  - Inventory Stock           - Damage Filing   - Incident PIN    - Inventory Off.
- Audit Trail                    - Crew Roster / Deploy
                                 - Dispatch Manifests
                                 - Canvas Workspace
```

### 2.1 Complete Route & Surface Inventory

| Route (`types.ts`) | Page Component | Primary Shell / Layout | Target Role(s) | Primary Purpose & Features |
| :--- | :--- | :--- | :--- | :--- |
| `overview` | [`AdminSystemDashboardPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/AdminSystemDashboardPage.tsx) / [`WarehouseHomePage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/WarehouseHomePage.tsx) / [`OverviewPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/OverviewPage.tsx) | `AdminShell` / Custom Grid / `ConsoleLayout` | Admin, Warehouse Ops, General Staff | Top-level operational metrics, module launcher, quick health diagnostics. |
| `dashboard` | [`EventDashboardPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/EventDashboardPage.tsx) | `ExecutiveShell` | Executive | Executive portfolio overview, event/damage distributions, live feed, methodology modal. |
| `workforce` | [`AdminWorkforcePage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/AdminWorkforcePage.tsx) | `AdminShell` | Admin | Staff directory, user provisioning, account status filtering, user growth analytics. |
| `rbac` | [`AdminRolesPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/AdminRolesPage.tsx) | `AdminShell` | Admin | RBAC configuration, WOM sub-roles, recursive Ground Crew organizational tree, PIN gate. |
| `security-audit`| [`AdminSecurityAuditPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/AdminSecurityAuditPage.tsx) | `AdminShell` | Admin | Comprehensive system security audit trail, IP logging, action filters, export options. |
| `project-manager`| [`ProjectManagerDashboardPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/ProjectManagerDashboardPage.tsx)| PM Custom Console | Project Manager | Pitch-to-event pipeline, master calendar, conflict resolution dialogs, proposal builder. |
| `registry` | [`EventRegistryPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/EventRegistryPage.tsx) | `ExecutiveShell` | Executive, Planner | Master event registry, tier status, settlement triggers, detail drawer launchers. |
| `event-detail` | [`EventDetailPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/EventDetailPage.tsx) | `ConsoleLayout` | Planner, PM, Warehouse | Comprehensive event profile: timing, venue, budget, allocated items, damage escrow. |
| `canvas` | [`DesignCanvasHubPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/DesignCanvasHubPage.tsx) | Fullscreen Canvas Hub | Event Planner, PM | Grid/calendar view of design canvases, mood boards, quick duplicate/export actions. |
| `canvas-workspace`| [`CanvasWorkspacePage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/CanvasWorkspacePage.tsx)| Fullscreen Konva Artboard| Event Planner | Infinite 2D drag-and-drop layout canvas, asset allocation panel, deficit triggers. |
| `inventory` | [`InventoryStockPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/InventoryStockPage.tsx) | `ConsoleLayout` / `AdminShell` / `ExecutiveShell` | Warehouse Manager, Inventory Off. | Asset registry, stock counts, category tabs, item profile modal, maintenance tracker. |
| `replenishment`| [`ReplenishmentPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/ReplenishmentPage.tsx) | `ConsoleLayout` | Warehouse Ops, Purchasing | Stock deficit queue, supplier PO routing, lead time estimation, procurement PDF export. |
| `damage` | [`DamageValidationPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/DamageValidationPage.tsx) | `ExecutiveShell` / `ConsoleLayout` | Warehouse Manager, Executive | Incident triage, dual sign-off verdicts, HAVA photo audit, emergency override unblocks. |
| `dispatch` | [`DispatchManifestPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/DispatchManifestPage.tsx) | `ConsoleLayout` | Warehouse Lead, Dispatcher | Fleet batch manifests, vehicle assignments, transit stall/resume, handoff verification. |
| `crew` | [`CrewRosterPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/CrewRosterPage.tsx) | `ConsoleLayout` | Manning Officer, Lead | Staff shift rosters, auto-allocation algorithms, fatigue monitoring, headcount limits. |
| `deployments` | [`TaskDeploymentsPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/TaskDeploymentsPage.tsx) | `ConsoleLayout` | Warehouse Lead, PM | Active event task force deployments, operational status tracking, team assignment modal. |
| `warehouse-logs`| [`WarehouseLogsPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/WarehouseLogsPage.tsx) | `ConsoleLayout` | Warehouse Lead, Auditor | Warehouse floor ledger, asset movement history, return validations, stock adjustment logs. |
| `logs` | [`ActivityLogsPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/ActivityLogsPage.tsx) | `ExecutiveShell` | Executive | General system operational activity feed, authentication audits, status update history. |
| `field-ops` | [`GroundCrewPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/GroundCrewPage.tsx) | `.mobile-shell` (PWA) | Ground Crew, Field Lead | On-site checkpoint verification, item packing lists, camera damage reporting, leave requests. |
| `manning` | [`ManningPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/ManningPage.tsx) | `.mobile-shell` (PWA) | Manning Officer | Manning SLA breach warnings, overdue task triage, incident escalation, PIN unlocking. |
| `warehouse-lead`| [`WarehouseLeadPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/WarehouseLeadPage.tsx)| `.mobile-shell` (PWA) | Warehouse Lead | Mobile picking & staging checklists, load-out confirmation, batch transit handoffs. |
| `warehouse-member`| [`WarehouseMemberPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/WarehouseMemberPage.tsx)| `.mobile-shell` (PWA) | Warehouse Member | Staging execution tasks, item scanning/counting, floor hazard reporting. |
| `production-manager`| [`ProductionManagerPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/ProductionManagerPage.tsx)| `.mobile-shell` (PWA) | Production Manager | Build quotas, fabrication stage progress, staging handoff sign-offs. |
| `inventory-officer`| [`InventoryOfficerPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/InventoryOfficerPage.tsx)| `.mobile-shell` (PWA) | Inventory Officer | Stock count audits, damage item flagging, stockroom replenishment triggers. |

---

## 3. Current Design System Inventory

### 3.1 Foundations & Tokens

```
CURRENT COLOR SYSTEM (index.css & App.css)
┌────────────────────────────────────────────────────────────────────────┐
│ Light Theme Base:                                                      │
│   --background: #f5f0e8 (Warm Cream Field)                             │
│   --foreground: #272522 (Deep Charcoal Ink)                            │
│   --card:       #fbf8f2 (Parchment Card)                               │
│   --primary:    #9b6b3f (Walnut Bronze)                                │
│   --secondary:  #e8dfd2 (Warm Sand)                                    │
│   --muted:      #eee7dc (Soft Cream Muted)                             │
│   --border:     #d8cec0 (Muted Earth Border)                           │
│   --destructive:#a84d3b (Terracotta Rust)                              │
│                                                                        │
│ Dark Theme Base:                                                       │
│   --background: #181715 (Deep Espresso Black)                          │
│   --foreground: #f0ece1 (Warm Linen Text)                              │
│   --card:       #22201d (Charcoal Board)                               │
│   --primary:    #c49666 (Polished Brass Gold)                          │
│   --border:     #38342e (Smoked Bronze Border)                         │
└────────────────────────────────────────────────────────────────────────┘
```

#### Typography Stack
- **Serif / Display:** `'Cinzel', 'Marcellus', 'Playfair Display', Georgia, serif`  
  *Usage:* Page titles (`h1`), modal titles, brand wordmark (`LUMIÈRE`), key metric cards.
- **Sans / UI Body:** `'Montserrat', ui-sans-serif, system-ui, sans-serif`  
  *Usage:* Table cells, form labels, body copy, tooltips, buttons.
- **Micro-Typography:** Small uppercase labels with heavy tracking (`tracking-[0.15em]`, `tracking-[0.2em]`, `text-[0.6rem]`, `font-bold`) used ubiquitously for section headers, status tags, and metadata captions.

#### Spacing, Elevation & Glow Utilities
- **Corner Radii:** Standardized via tokens `--radius-md: 0.35rem`, `--radius-lg: 0.5rem`, with frequent direct use of `rounded-xl` (`12px`) and `rounded-full`.
- **Borders:** Consistent 1px boundary lines (`border border-border`) enclosing cards, tables, and modal headers.
- **Ambient Luxury Glows ([`src/App.css`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/App.css)):**
  - `.glow-primary`: Walnut/Gold ambient spread (`box-shadow: 0 0 20px -3px color-mix(...)`).
  - `.glow-gold`: High-intensity metallic glow (`rgba(196, 150, 102, 0.4)`).
  - `.glow-card`: Deep soft card elevation (`0 8px 32px -4px ...`).

### 3.2 Global vs. Module-Specific UI Pattern Breakdown

| Pattern Category | Global Implementation | Module-Specific Variations | Consistency Rating |
| :--- | :--- | :--- | :--- |
| **Navigation Shells** | Icon Rail (64px desktop width) + Top Bar | 5 distinct shell components: `AdminShell`, `ExecutiveShell`, `ConsoleLayout`, `WarehouseHeader`, `mobile-shell`. | **Low** (Fragmented) |
| **Data Tables** | Bordered container, sticky header, alternating hover states | Workforce uses custom pagination and inline action menus; Security Audit uses row modal inspect; Manifest uses expandable rows. | **Medium** |
| **Status Badges** | Rounded-full pill with dot indicator | Mixed token usage: some pages use `.status-submitted` / `.status-approved`, others use custom Tailwind color mixes (`bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80`). | **Medium-Low** |
| **Confirmation Modals** | [`ConfirmDialog.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/components/ConfirmDialog.tsx) for binary decisions | Damage verdicts use [`DamageVerdictModal.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/components/DamageVerdictModal.tsx); RBAC uses inline PIN modals; Canvas uses custom prompt overlays. | **Medium** |
| **Empty / Loading States** | [`EmptyState.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/components/EmptyState.tsx), [`LoadingSkeleton.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/components/LoadingSkeleton.tsx) | PWA has dedicated `PwaEmptyState` and `PwaStateFeedback` components. | **High** |
| **Search & Filters** | Search input with leading `Search` icon + status filter tabs | Inventory has multi-dropdown + grid/list toggle; Replenishment has 4-card KPI filters; Activity Logs has role dropdowns. | **Medium-High** |

---

## 4. Role-Based UX Assessment

Evaluating Lumière through the lens of actual day-to-day operations reveals stark contrasts between operational roles.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ROLE ERGONOMIC HEATMAP                           │
├─────────────────────┬───────────────────┬───────────────────┬───────────────┤
│ Operational Persona │ Cognitive Load    │ Action Efficiency │ Stress Rating │
├─────────────────────┼───────────────────┼───────────────────┼───────────────┤
│ Executive / Partner │ Low               │ High (Read-only)  │ Calm          │
│ Platform Admin      │ Medium            │ High              │ Moderate      │
│ Project Manager     │ High (Multi-task) │ Medium            │ High          │
│ Warehouse Lead      │ High (High-tempo) │ Medium-Low        │ Very High     │
│ Ground Crew (Field) │ Low-Medium        │ Medium            │ Extreme       │
└─────────────────────┴───────────────────┴───────────────────┴───────────────┘
```

### 4.1 Executive / Management User
- **Mindset:** "Give me total visibility into corporate risk, event health, and financial liability without making me sift through warehouse pick-lists."
- **Current Experience:** Highly polished. The [`EventDashboardPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/EventDashboardPage.tsx) cleanly separates high-level event metrics from open damage liability claims. The interactive donut distribution cards and trend charts provide immediate clarity.
- **UX Friction Points:**
  - Inability to perform quick approvals directly from the dashboard feed without navigating to the full [`DamageValidationPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/DamageValidationPage.tsx).
  - Lack of high-level budget vs. actual expenditure aggregates across all concurrent events.

### 4.2 Admin / Operations User
- **Mindset:** "I need to provision staff, enforce role permissions, unlock locked accounts, and audit anomalous access instantly."
- **Current Experience:** Fast, authoritative, and secure. The [`AdminShell.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/components/admin/AdminShell.tsx) with [`AdminTopBar.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/components/admin/AdminTopBar.tsx) keeps system health and quick action counters permanently anchored. The PIN gate for RBAC modifications effectively prevents catastrophic accidental permission changes.
- **UX Friction Points:**
  - The RBAC configuration tree ([`AdminRolesPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/AdminRolesPage.tsx)) is over 1,900 lines of complex nested state, making deep tree navigation slightly visually overwhelming on smaller laptop displays.

### 4.3 Project Manager / Event Planner
- **Mindset:** "I am managing 4 client pitches, converting signed proposals to real events, designing floor layouts, and ensuring no other PM steals my candelabras."
- **Current Experience:** Extremely capable but cognitively demanding. The [`ProjectManagerDashboardPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/ProjectManagerDashboardPage.tsx) integrates pitch conversion with venue conflict detection, while [`CanvasWorkspacePage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/CanvasWorkspacePage.tsx) gives full spatial control.
- **UX Friction Points:**
  - Disconnect between Canvas asset placement and Warehouse Deficit alerts: when an asset is depleted on the canvas, the deficit drawer requires manual confirmation before entering the procurement pipeline.
  - Modals inside the 2D canvas workspace can obstruct the actual artboard viewport during intensive layout planning.

### 4.4 Warehouse / Logistics User (WOM & Floor Leads)
- **Mindset:** "Trucks are rolling in 45 minutes. I need to know which items are picked, which batches are stalled in transit, and who didn't show up for shift call."
- **Current Experience:** Rich in features, but navigationally divided. The [`WarehouseHomePage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/WarehouseHomePage.tsx) provides a 4-column module launcher, but moving between Dispatch, Replenishment, Inventory, and Manning requires frequent context switches.
- **UX Friction Points:**
  - High click count: Resolving a missing item requires drilling from Event Detail → Inventory Stock → Replenishment Requisition.
  - Redundant module representations: Desktop WOM sees full tables, but mobile WOM sub-roles see narrow cards with truncated data.

### 4.5 Ground Crew / Field PWA User
- **Mindset:** "I'm standing in a noisy ballroom loading dock with spotty 4G, dusty hands, and a phone screen. I need to take a photo of a cracked mirror, tag the SKU, and submit."
- **Current Experience:** Purpose-built mobile layout with high-contrast elements and bottom navigation. The camera capture workflow in [`GroundCrewPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/GroundCrewPage.tsx) computes real SHA-256 hashes and EXIF metadata via HAVA.
- **UX Friction Points:**
  - Several touch targets on secondary action buttons measure under 40px height, violating touch ergonomics during fast-paced physical handling.
  - The "Offline-ready" banner creates an expectation of background offline service worker synchronization, but actual background sync relies on memory queues.

---

## 5. Workflow Analysis

### 5.1 Workflow Traces

```
WORKFLOW 1: EVENT CREATION & TEMPORAL CONFLICT PREVENTION
[PM / Planner] ──> Click "+ Register Event" Drawer
               ──> Input Event Title, Client, Venue, Dates, Ingress Window
               ──> System checks checkEventConflicts() & checkDateAdvisory()
                   ├── IF Title Overlap (≥75%) OR Same Venue & Overlapping Date:
                   │   └── HARD BLOCK: Save disabled, conflict details surfaced.
                   └── IF Same Date (Different Venue):
                       └── ADVISORY: Amber banner warning of resource contention.
               ──> Submit ──> Event persisted & added to Master Calendar.
```

```
WORKFLOW 2: DAMAGE FORENSIC TRIAGE & DUAL-CUSTODY RESOLUTION
[Ground Crew]  ──> Captures damage photo on-site via PWA Camera
               ──> HAVA engine extracts EXIF, GPS coords, and generates SHA-256 hash
               ──> Exception posted as "Pending Verdict"
[Warehouse]    ──> Reviews in DamageValidationPage
               ──> Opens DamageVerdictModal (inspects HAVA cryptographic proof)
                   ├── Choice A: Validate (Posts liability to inventory ledger)
                   ├── Choice B: Dismiss (Returns asset to stock)
                   └── Choice C: Hold for Audit (Missing photo / suspicious claim)
                       └── Requires TWO distinct Executive sign-offs with PIN
                           to resolve to "Repair" (In Maintenance) or "Write-off".
```

```
WORKFLOW 3: DEFICIT REPLENISHMENT & VENDOR ROUTING
[Canvas / Stock]──> Asset allocated beyond available capacity (Deficit triggered)
[Procurement]   ──> Appears in ReplenishmentPage as "Not Purchased"
                ──> User clicks "Reorder" ──> ReorderRequisitionModal opens
                ──> Selects matched Vendor based on specialty & lead-time rating
                ──> Generates PO Number & routes to "In Procurement"
                ──> Exports official Replenishment Procurement PDF summary.
```

### 5.2 Workflow Friction Summary Table

| Workflow | Entry Point | Friction Identified | Unclear Transitions | Missing Feedback |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & Gate** | [`LoginPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/LoginPage.tsx) | Switching between Staff and Crew portal requires full form state discard. | Wrong portal error forces logout instead of graceful redirect. | Password reset requirements list is tall and pushes action buttons below fold on small screens. |
| **Pitch Conversion** | [`ProjectManagerDashboardPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/ProjectManagerDashboardPage.tsx) | 409 Conflict Dialog opens as a separate modal overlay over the pitching card. | Successful conversion refreshes event list but does not automatically navigate to the newly created event canvas. | Missing visual indicator of which assets in the pitch mood board have deficits. |
| **Asset Allocation** | [`CanvasWorkspacePage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/CanvasWorkspacePage.tsx) | Dragging assets from the left panel to the canvas requires mode switching to "Planning" with PIN entry. | Right-side logistics drawer (`allocated` vs `pending`) collapses when clicking outside. | No real-time stock countdown indicator inside the asset palette selector. |
| **Damage Sign-Off** | [`DamageValidationPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/DamageValidationPage.tsx) | Multi-step sign-off requires switching between table view, modal view, and secondary sign-off prompt. | In emergency single-evaluator mode, unblock reason textarea lacks character count guidance. | Audit ledger update confirmation toast disappears rapidly (3 seconds). |

---

## 6. Dashboard & Analytics Assessment

Lumière contains four distinct dashboard surfaces:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DASHBOARD TAXONOMY                              │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│ Surface              │ Core Question        │ Primary Metrics Surfaced      │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ Admin System Dash    │ Is the platform safe?│ Active Sessions, Pending Sub- │
│                      │                      │ roles, Account Lockouts, Logs │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ Executive Portfolio  │ What is our liability│ Event Tiers, Settled Events,  │
│                      │ and operational load?│ Damage Claims, Dual Sign-offs │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ Project Manager Dash │ What proposals and   │ Pitches in Pipeline, Client   │
│                      │ events need action?  │ Briefs, Calendar Schedule     │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ Warehouse Home       │ Where are assets and │ Module Status, Daily Manifests│
│                      │ crews right now?     │ Upcoming Ingress/Egress Dates │
└──────────────────────┴──────────────────────┴───────────────────────────────┘
```

### 6.1 Analytics Classification

#### Category A: Metrics Already Available & Rendered
- Active staff by structural role & sub-role distribution (Donut chart in [`AdminAnalytics.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/components/admin/AdminAnalytics.tsx)).
- Historical user growth trend lines (Weekly onboardings in [`TrendChart.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/components/TrendChart.tsx)).
- Event pipeline status tallies (Completed, In Production, Reserved, On Hold, Initialized).
- Damage exception verdict breakdown (Pending, Validated, Held for Audit, Second Sign-off, Dismissed).
- Stock level deficit counts (Not Purchased, In Procurement, Received).

#### Category B: Metrics Derivable from Existing Data (No Backend Changes Required)
- **Asset Utilization Rate:** Ratio of total committed assets across active events vs. total warehouse stock capacity.
- **Average Lead Time by Vendor:** Mean delivery hours calculated from `procurement.etaHours` grouped by `vendorId`.
- **Damage Frequency by Asset Category:** Grouping `damageExceptions` by `assetCategory` to identify fragile or high-risk inventory items.
- **Crew Fatigue Index:** Total hours scheduled per crew member across concurrent event rosters in `CrewRosterPage`.
- **Pitch-to-Event Conversion Rate:** Percentage of pitches transitioning from `Pitching` to `Approved / Active Event`.

#### Category C: Metrics Requiring Future Backend / Schema Additions
- Real-time GPS vehicle telematics for in-transit dispatch batches.
- Actual vs. Budgeted financial cost variance per event item.
- Automated crew biometric check-in tracking.

---

## 7. Product Information Architecture

### 7.1 Structural IA Map

```
LUMIÈRE PLATFORM ARCHITECTURE
├── 1. IDENTITY & GOVERNANCE (Admin Console)
│   ├── System Dashboard (`overview`)
│   ├── Workforce Management (`workforce`)
│   ├── Roles & Permissions Tree (`rbac`)
│   └── Security Audit Trail (`security-audit`)
│
├── 2. STRATEGIC OVERSIGHT (Executive Console)
│   ├── Portfolio Health Dashboard (`dashboard`)
│   ├── Master Event Registry (`registry`)
│   ├── Damage Exception Audit (`damage`)
│   └── Operational Logs (`logs`)
│
├── 3. PROJECT COORDINATION & DESIGN (PM & Planner Hub)
│   ├── PM Command Center (`project-manager`)
│   ├── Canvas Design Hub (`canvas`)
│   └── 2D Infinite Workspace (`canvas-workspace`)
│
├── 4. WAREHOUSE LOGISTICS & OPERATIONS (WOM Floor)
│   ├── Module Central Grid (`overview`)
│   ├── Inventory & Stock Registry (`inventory`)
│   ├── Procurement & Replenishment (`replenishment`)
│   ├── Dispatch Manifests & Fleet (`dispatch`)
│   ├── Crew Rostering & Shifts (`crew`)
│   ├── Task Deployments (`deployments`)
│   └── Floor Ledger & Logs (`warehouse-logs`)
│
└── 5. FIELD EXECUTION (Mobile PWA)
    ├── Ground Crew Field App (`field-ops`)
    ├── Manning SLA & Breaches (`manning`)
    ├── Staging & Load-Out (`warehouse-lead` / `warehouse-member`)
    ├── Production Fabrication (`production-manager`)
    └── Stockroom Inspection (`inventory-officer`)
```

### 7.2 IA Evaluation Findings
1. **Route Definition Discrepancy:** In [`src/lib/nav.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/lib/nav.tsx), `VALID_ROUTES` contains 22 routes, but omits `'project-manager'`, whereas [`src/App.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/App.tsx) explicitly includes `'project-manager'` in its route resolution set.
2. **Dual-Role Navigation Overlap:** The route `overview` serves three entirely different page components depending on whether the user is an Admin ([`AdminSystemDashboardPage`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/AdminSystemDashboardPage.tsx)), a Warehouse Manager ([`WarehouseHomePage`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/WarehouseHomePage.tsx)), or General Staff ([`OverviewPage`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/OverviewPage.tsx)).
3. **Module Grouping Opportunity:** Dispatch, Deployments, and Rostering represent facets of "Workforce & Fleet Movement", but are currently exposed as three separate top-level sidebar items.

---

## 8. What Works Well (Preserve in Design System Integration)

The following architectural and UX elements are exceptionally well-executed and **MUST be preserved** during any visual rebranding:

### 1. Dual-Custody Forensic Damage Verification ([`DamageVerdictModal.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/components/DamageVerdictModal.tsx))
- **Why it works:** It prevents single-operator fraud by requiring two distinct executive sign-offs when photographic evidence is absent, with automatic SHA-256 / EXIF HAVA validation when photos exist.
- **Preservation Directive:** Keep the exact sign-off state machine, verification badge iconography, and audit-hold warning dialogues intact.

### 2. Temporal Conflict & Venue Double-Booking Engine ([`src/lib/store.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/lib/store.tsx))
- **Why it works:** The multi-tiered conflict detection distinguishes between hard blocks (same venue + overlapping dates, or ≥75% title overlap) and soft advisories (same date, different venue), preventing catastrophic booking collisions.
- **Preservation Directive:** Preserve the conflict alert layout inside [`RegisterEventDrawer.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/components/RegisterEventDrawer.tsx).

### 3. Click-Flash Micro-Interactions ([`src/lib/use-click-flash.ts`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/lib/use-click-flash.ts))
- **Why it works:** Gives immediate, satisfying haptic-like visual feedback on stat cards and action triggers before modal mounting or navigation transitions.
- **Preservation Directive:** Maintain the `.glow-primary` ring transition mechanism across all interactive KPI cards.

### 4. Recursive Organizational Tree for Ground Crew ([`AdminRolesPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/AdminRolesPage.tsx))
- **Why it works:** Accurately reflects how large styling teams partition labor (Team Leads → Sub-Tiers → Floor Members) with leaf-node permission inheritance.
- **Preservation Directive:** Retain the tree node rendering structure and folder toggle behaviors.

---

## 9. Friction & UX Problems

Issues are classified using standard severity tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ISSUE SEVERITY TOTALS                            │
├─────────────────────┬───────────────────┬───────────────────┬───────────────┤
│ CRITICAL (Blocks)   │ HIGH (Friction)   │ MEDIUM (Confusion)│ LOW (Polish)  │
├─────────────────────┼───────────────────┼───────────────────┼───────────────┤
│ 2 Issues            │ 5 Issues          │ 6 Issues          │ 4 Issues      │
└─────────────────────┴───────────────────┴───────────────────┴───────────────┘
```

### 9.1 Critical Issues (Blocks or Seriously Harms Task Completion)

#### ISSUE C1: Incomplete Route Synchronization in `nav.tsx`
- **Location:** [`src/lib/nav.tsx:27-51`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/lib/nav.tsx#L27-L51)
- **Affected User:** Project Manager
- **Problem:** `VALID_ROUTES` set in `nav.tsx` lacks `'project-manager'`, causing browser back/forward history navigation to fail when parsing URL query params on deep link refreshes.
- **Evidence:** `VALID_ROUTES` defines 22 routes, omitting `'project-manager'`, whereas `App.tsx:191` includes it.
- **Recommended Direction:** Add `'project-manager'` to `VALID_ROUTES` in `nav.tsx`.

#### ISSUE C2: Mobile Shell Viewport Overflow on PWA Form Keyboards
- **Location:** [`src/components/pwa/PwaModal.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/components/pwa/PwaModal.tsx), [`src/pages/GroundCrewPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/GroundCrewPage.tsx)
- **Affected User:** Ground Crew (Mobile PWA)
- **Problem:** On iOS Safari / Android Chrome when the virtual keyboard expands, fixed bottom sheets lack dynamic `100dvh` repositioning, obscuring the primary "Submit Report" button behind the keyboard tray.
- **Evidence:** Fixed padding in `.app-main` and `.sheet` uses static `calc(96px + env(safe-area-inset-bottom))` without visual viewport height bindings.
- **Recommended Direction:** Introduce dynamic viewport height hooks or keyboard-aware bottom padding utilities in PWA modal containers.

---

### 9.2 High Issues (Creates Meaningful Operational Friction or Risk)

#### ISSUE H1: Five Disparate Navigation Shell Implementations
- **Location:** `AdminShell.tsx`, `ExecutiveShell.tsx`, `ConsoleLayout.tsx`, `WarehouseHomePage.tsx`, `ProjectManagerDashboardPage.tsx`
- **Affected User:** All Desktop Users
- **Problem:** Every major portal implements its own outer layout container with differing rail widths, padding calculations, top bars, and scroll container behaviors.
- **Evidence:** `AdminShell` uses `fixed inset-0 flex bg-background`, `ConsoleLayout` uses `min-h-screen lg:ml-16`, and `ExecutiveShell` uses its own custom flex wrapper.
- **Recommended Direction:** Consolidate into a unified `AppShell` that accepts configuration props for rail items and role headers.

#### ISSUE H2: Inconsistent Touch Target Sizing in Mobile Workspaces
- **Location:** [`src/pages/ManningPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/ManningPage.tsx), [`src/pages/WarehouseLeadPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/WarehouseLeadPage.tsx)
- **Affected User:** Ground Crew & Warehouse Leads
- **Problem:** Several secondary action buttons (e.g., "Filter by Zone", "Dismiss Alert") have click heights of 28px–32px, violating the 44px minimum touch target standard for field devices.
- **Evidence:** Direct classes such as `h-7 px-2 text-xs` on interactive buttons.
- **Recommended Direction:** Enforce `.button-primary` / `.button-secondary` or `min-h-[44px]` touch targets across all `.mobile-shell` routes.

#### ISSUE H3: Hardcoded Color Inconsistencies Across Status Pills
- **Location:** [`src/pages/CrewRosterPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/CrewRosterPage.tsx), [`src/pages/TaskDeploymentsPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/TaskDeploymentsPage.tsx), [`src/App.css`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/App.css)
- **Affected User:** Warehouse Managers & Operations Staff
- **Problem:** Status pills use raw Tailwind classes like `bg-emerald-100 text-emerald-700` alongside CSS class tokens like `.status-approved`, resulting in slight shade variances between pages.
- **Evidence:** Grep results show 15+ variations of green/amber/rose status pill definitions.
- **Recommended Direction:** Unify all status pills into a single `StatusBadge` component driven by semantic tokens (`success`, `warning`, `danger`, `neutral`, `info`).

#### ISSUE H4: In-Memory Offline Declaration Queue Lacks IndexedDB Persistence
- **Location:** [`src/lib/ground-crew-declarations.ts`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/lib/ground-crew-declarations.ts), [`src/pages/GroundCrewPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/GroundCrewPage.tsx)
- **Affected User:** Ground Crew
- **Problem:** Declarations submitted while offline are stored in React state/localStorage and will be lost if browser cache is cleared or on hard tab resets.
- **Evidence:** `offlineQueue.ts` has preliminary queue structures, but field declarations in `ground-crew-declarations.ts` operate primarily in-memory.
- **Recommended Direction:** Connect PWA offline submissions to IndexedDB via an idempotent replay worker.

#### ISSUE H5: Modal Stacking & Z-Index Collision in Canvas Workspace
- **Location:** [`src/pages/CanvasWorkspacePage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/CanvasWorkspacePage.tsx)
- **Affected User:** Event Planner
- **Problem:** When opening the asset allocation deficit modal while the right-hand logistics panel is expanded, z-index layers overlap unpredictably on smaller screens.
- **Evidence:** Inconsistent `z-30`, `z-40`, and `z-50` declarations across canvas popovers.
- **Recommended Direction:** Standardize a global z-index layering scale (`--z-drawer: 40`, `--z-modal: 50`, `--z-toast: 60`).

---

### 9.3 Medium Issues (Causes Confusion or Inconsistency)

- **M1:** Search inputs lack unified debounce behaviors, causing rapid re-renders on large inventory lists.
- **M2:** Dark mode toggle switch in `LoginPage` is a 3-way toggle (Light/Dark/System), but in `ConsoleSidebar` it is a binary toggle.
- **M3:** Password criteria checklist in `TempPasswordResetScreen` occupies substantial vertical space, pushing confirmation buttons off-screen on low-height viewports.
- **M4:** Warehouse Home 4-column module grid switches to single-column abruptly on medium tablet breakpoints without a 2-column intermediate state.
- **M5:** Missing empty-state illustrations for empty search filter results in `WarehouseLogsPage` and `ActivityLogsPage`.
- **M6:** Table column headers in `AdminSecurityAuditPage` and `WorkforceTable` use slightly different font sizes (`text-[0.62rem]` vs `text-[0.68rem]`).

### 9.4 Low Issues (Visual Polish)

- **L1:** Minor pixel-level alignment differences between Lucide icons and adjacent text in sidebar navigation items.
- **L2:** Shimmer animation timing on loading skeletons varies between 1.5s and 1.8s across different components.
- **L3:** Date formatting strings vary between `'MMM DD, YYYY'` and `'YYYY-MM-DD'` across table ledger rows.
- **L4:** Ambient card glow borders (`.glow-card`) occasionally produce slight sub-pixel anti-aliasing artifacts on Chromium browsers in dark mode.

---

## 10. Accessibility & Responsive Findings

### 10.1 Accessibility (a11y) Evaluation
- **Contrast Ratios:**
  - *Light Mode:* High contrast on primary headings and body copy (ratio > 7:1 for `#272522` on `#f5f0e8`). Small uppercase captions (`#756f67` on `#f5f0e8`) achieve ~4.6:1, meeting WCAG AA for normal text.
  - *Dark Mode:* High contrast on body text (`#f0ece1` on `#181715`). Dark status badges (`dark:bg-emerald-950/80 dark:text-emerald-300`) achieve compliant 5.2:1 contrast.
- **Screen Reader Support:**
  - Modals and drawers include `aria-hidden="true"` on decorative icons and provide `aria-label` attributes on icon-only buttons (e.g., menu toggles, close buttons).
  - Missing: Explicit `role="alert"` announcements on dynamic conflict detection banners in `RegisterEventDrawer`.
- **Keyboard Navigation:**
  - Focus outlines are styled via `focus:ring-2 focus:ring-ring/30`. Tab navigation functions cleanly through form inputs and modal dialogs.
  - 2D Canvas workspace is primarily pointer/touch driven, which is expected for spatial layout artboards.

### 10.2 Responsive & Viewport Testing Findings
- **Desktop (1440px+):** Fluid, expansive layouts with well-proportioned card grids and spacious table views.
- **Laptop (1024px – 1366px):** Layouts remain clean; however, the RBAC permission matrix and Canvas logistics sidebar feel slightly dense.
- **Tablet (768px – 1023px):** Transition between collapsible sidebar and mobile drawer operates smoothly, though Warehouse Home grid collapses aggressively.
- **Mobile (375px – 430px PWA Viewport):** PWA routes render reliably within the `.mobile-shell` frame (`max-w-[430px]`), but form-heavy screens require keyboard height compensation.

---

## 11. Branding Readiness

### 11.1 Token Architecture Readiness Assessment

```
CURRENT DESIGN TOKEN ARCHITECTURE
┌────────────────────────────────────────────────────────────────────────┐
│ 1. CSS Custom Properties (:root & .dark in src/index.css)              │
│    - Status: READY. Semantic mapping for background, card, primary,    │
│      destructive, and sidebar is fully wired.                          │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Tailwind CSS v4 Theme Bindings (@theme in src/index.css)            │
│    - Status: READY. Fonts and color token references connect directly  │
│      to custom properties.                                             │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Ambient Shadow & Glow Library (src/App.css)                         │
│    - Status: READY. Luxury walnut/gold glow utilities are established  │
│      and parameterized with color-mix().                               │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Component-Level Hardcodes                                           │
│    - Status: REQUIRES REFACTORING. Scattered Tailwind color classes    │
│      (e.g., bg-amber-500, bg-sky-500, bg-rose-100) must be replaced   │
│      with semantic design tokens.                                      │
└────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Hardcoded Color Hotspots to Remap Before Branding

| Source File | Hardcoded Color Instances | Semantic Token Replacement |
| :--- | :--- | :--- |
| [`src/pages/ReplenishmentPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/ReplenishmentPage.tsx) | `bg-rose-100`, `text-rose-700`, `bg-amber-100` | `var(--status-danger-bg)`, `var(--status-danger-fg)` |
| [`src/pages/DamageValidationPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/DamageValidationPage.tsx) | `bg-sky-100`, `text-sky-700`, `bg-emerald-100` | `var(--status-info-bg)`, `var(--status-success-fg)` |
| [`src/components/admin/AdminAnalytics.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/components/admin/AdminAnalytics.tsx) | `#9b6b3f`, `#c49666`, `#e8dfd2` in Donut SVG | CSS variables referenced via computed styles |
| [`src/pages/DesignCanvasHubPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/DesignCanvasHubPage.tsx) | `EVENT_PALETTE` array with raw hex codes | Unified brand accent spectrum tokens |

---

## 12. Refactoring Risks Before Branding

Applying new visual branding without prior structural cleanup carries specific technical risks:

1. **Shell Fragmentation Breakage:** Modifying global padding or font scales could break sticky table headers in `AdminShell` while causing clipping in `ConsoleLayout`.
2. **PWA / Desktop Boundary Leaks:** PWA components rely on `.mobile-shell` CSS overrides in `App.css`. Changing base font sizes could misalign touch target calculations.
3. **Canvas Transform Scaling:** Konva infinite canvas in `KonvaInfiniteCanvas.tsx` relies on strict pixel dimensions (`ARTBOARD_W = 1920`, `ARTBOARD_H = 1080`). Canvas element styling must remain decoupled from global CSS rem scaling.

---

## 13. Opportunities

High-leverage UX improvements that can be achieved with existing data:
- **Unified Global Command Palette (`Cmd + K`):** Quick jump across all events, assets, staff accounts, and dispatch manifests.
- **Cross-Module Deep Links:** Direct navigation from a damage report to the corresponding event detail and asset procurement card in a single click.
- **Batch Action Toolbar:** Enable bulk status transitions for dispatch manifests and deficit approvals.
- **Interactive Timeline Gantt:** Consolidate master event dates, ingress windows, and full-stop teardown times into a continuous horizontal operational timeline.

---

## 14. User-Lens Verdict

*(Conversational Operational Reflection)*

> **"What do I genuinely like about using Lumière right now?"**  
> I love that Lumière feels like it truly understands our industry. It doesn't treat an event as a generic database row—it understands that reserving 50 crystal chandeliers in Manila locks those chandeliers for a multi-day buffer so no one else can take them. The dual-custody damage forensic flow with photo SHA-256 validation feels genuinely protective of both the styling firm and the client.
>
> **"What would frustrate me after using it every day?"**  
> Navigating between the different dashboards feels disjointed. When I am on the Warehouse Home, I am looking at a module grid; when I open Inventory, I am suddenly in a sidebar console; when I look at the Admin board, I am in an icon rail. I constantly have to re-orient my spatial awareness of where navigation controls live.
>
> **"What would make me hesitate or double-check myself?"**  
> Converting a project pitch into an active event. The 409 conflict dialog pops up as an intense warning modal, and even when I override an advisory conflict, I find myself checking the calendar three times to make sure I haven't accidentally double-booked a ballroom.
>
> **"What currently feels effortless?"**  
> The click feedback and ambient glow on stat cards. Tapping an action, watching the card flash, and having the modal pop open with pre-filled context feels smooth and responsive.
>
> **"What currently feels heavier than it needs to be?"**  
> Settle-event verification and deficit reordering. Reordering a depleted asset requires navigating through three separate screens just to send a PO to a preferred supplier.
>
> **"What information do I wish Lumière showed me sooner?"**  
> Real-time asset availability counts directly inside the Canvas asset picker, without waiting until I drop the item onto the board.
>
> **"What would I absolutely preserve in a redesign?"**  
> The "Paper & Ink" warm luxury aesthetic, the HAVA damage validation audit trail, the temporal conflict prevention engine, and the Ground Crew PWA camera verification.
>
> **"If the visuals were removed entirely, does the product flow feel coherent?"**  
> Yes. The operational spine is rock solid. The underlying data model connects events, assets, staff, deficits, and damage claims with exceptional domain rigor.
>
> **"What would make Lumière feel like an operational partner rather than merely a management system?"**  
> Proactive intelligence: alerting the planner immediately when an ingress window is too narrow, auto-routing reorders to vendors with the shortest lead times, and surfacing crew fatigue warnings before shift rosters are finalized.

---

## 15. Recommended Priority Order

Before and during the visual branding integration, follow this sequenced implementation roadmap:

```
PHASE 1: FOUNDATION FIXES & IA UNIFICATION (Pre-Branding)
├── 1. Fix route synchronization in nav.tsx (Add 'project-manager' to VALID_ROUTES).
├── 2. Consolidate desktop layout shells into a unified AppShell.
├── 3. Standardize mobile touch targets (ensure 44px min height across all PWA buttons).
└── 4. Unify status badge definitions into semantic StatusBadge component.

PHASE 2: DESIGN TOKEN NORMALIZATION (Branding Integration)
├── 1. Replace hardcoded hex/Tailwind status colors with CSS variables.
├── 2. Connect typography tokens across Cinzel / Playfair Display / Montserrat.
├── 3. Standardize card elevation and ambient glow utilities in App.css.
└── 4. Implement global dark/light theme consistency across all modal overlays.

PHASE 3: WORKFLOW ERGONOMICS & POLISH (Post-Branding)
├── 1. Integrate inline quick-approvals on Executive and Admin dashboard feeds.
├── 2. Add real-time stock counters to Canvas asset picker palette.
├── 3. Connect PWA offline submission queue to IndexedDB persistence.
└── 4. Implement unified Cmd+K operational command palette.
```

---
*End of Audit Document — Lumière UI/UX Pre-Branding Evaluation*
