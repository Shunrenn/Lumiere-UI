# LUMIÈRE Admin Console — Project State

**Project:** Lumière — asset tracking/accountability system for House of Hermosa (capstone project)
**Stack:** React PWA frontend (offline-first, IndexedDB), ASP.NET Core backend, Supabase/PostgreSQL

> **Purpose:** durable handoff reference for rebuilding backend logic in Claude Code.
>
> **Current snapshot:** frontend prototype / hybrid demo application. The UI is substantially implemented, but the data architecture is not yet a normalized production backend. Some account, roster, request, and operational mutations already call Supabase; many other domains remain seeded or in-memory.

## 1. App overview

### Product purpose

LUMIÈRE is a single-company luxury events operations platform. It covers event planning and design, warehouse and inventory operations, field/ground crew execution, workforce administration, procurement/replenishment, damage validation, security/audit review, and role-based access control.

The application currently presents multiple role-specific portals:

- **Web/admin console:** administration, executive oversight, event planning, warehouse operations, registry, analytics, and audit surfaces.
- **PWA/mobile workspaces:** Ground Crew, Warehouse Lead, Warehouse Member, Manning Officer, Production Manager, and Inventory Officer.
- **Event Planner workspace:** design canvas, décor library, pipeline, event detail, and committed design artifacts.

The current product model is explicitly **single-company**, not a multi-company SaaS tenancy model. Earlier multi-company selector behavior was removed; structural permissions and account scopes are intended to be consistent across the one operating company.

### Account and role model

The platform distinguishes **structural account types** from configurable operational sub-roles.

#### Structural account types

These are account-level identities with a fixed broad scope:

- **Admin:** global administration across all modules; manages users, role configuration, confirmation PINs, and audit oversight.
- **Executive:** cross-company / cross-operation read-only strategic oversight of events, portfolios, dashboards, analytics, and damage validation. The current demo has two Executive accounts because certain damage exceptions require two distinct Executive sign-offs.
- **Event Planner:** event design and planning lifecycle, including canvas, registry, pipeline, and event documents.

The RBAC model treats these as structural roles rather than company-configured sub-role lists.

#### Configurable operational roles

The two operational families fan out into configurable sub-roles:

- **Warehouse Operations Manager:** a flat list of five sub-roles: Manning Officer, Warehouse Manager, Production Manager, Inventory Officer, and Purchasing Officer. Each has broad View/Interact visibility and Modify rights concentrated in its domain.
- **Ground Crew:** a recursive organizational tree. Nodes may be containers or assignable leaves. People are assigned to deepest leaf tiers; only leaves have operationally meaningful permission tables. Any node can gain children at arbitrary depth.

The application also has operational account identities such as Warehouse Lead, Warehouse Member, and Ground Crew. These are represented in login/routing and PWA workspaces, while the current admin RBAC screen primarily models the Admin, Executive, Event Planner, WOM, and Ground Crew permission taxonomy.

### Permission levels

Each permission row uses one of four levels:

- **View:** read-only visibility.
- **Interact:** act within existing records/workflows.
- **Modify:** create, edit, and delete within the domain.
- **None:** no access.

The operational UI maps module IDs such as `assets`, `production`, `manpower`, and `dispatch` to RBAC module names through `WOM_MODULE_RBAC_NAME`.

---

## 2. Features implemented

### 2.1 Authentication, portal routing, and demo accounts

**Status:** partially done; demo authentication is implemented, production authentication is not.

**What it does:**

- Login page accepts email/password and distinguishes staff web portal from crew/PWA portal.
- Hardcoded demo accounts are available with the shared demo password `lumiere2026`.
- Supabase fallback queries `portal_accounts` for non-demo credentials.
- The app infers/validates the correct portal and displays a Wrong Portal boundary when a user opens the incompatible surface.
- Auth state is cached in browser `localStorage` under `_lumiere_auth_user` and `_lumiere_auth_portal`.
- Initial route is role-aware: Admin goes to System Dashboard; Executives to event dashboard; planners to canvas; warehouse and PWA roles to their relevant workspace.

**Persistence:** hybrid.

- Demo accounts and demo credential checks are frontend/mock logic.
- Non-demo login reads Supabase `portal_accounts`.
- Login session persistence is browser `localStorage`, not a secure server session/cookie.
- Password changes attempt to update `portal_accounts`, but the current demo shape compares/stores `password_hash` values as raw strings; this must be replaced with real password hashing and server-side auth.

**Important production rebuild work:** replace client-side auth, localStorage identity, raw password comparison, and client-side Supabase writes with a secure auth/session layer, server-side authorization, password hashing, and RLS.

### 2.2 System Dashboard

**Status:** done as a frontend prototype; partially backed by Supabase-derived data.

**What it does:**

- Admin icon-rail dashboard with System Health, Total Users, Locked Accounts, and Pending Activations cards.
- User distribution visualization by account family.
- Live Security Feed preview.
- Pending Actions panel for password/access/account-lock requests and newly-created RBAC sub-roles awaiting permission setup.
- Trend analytics and User Growth Summary modal.
- System Health methodology modal.
- Request resolution opens a confirmation dialog before marking the request complete.
- RBAC pending setup entries navigate to Roles & Sub-Roles with a configuration payload.

**Persistence:** hybrid.

- `staff` and access requests hydrate from Supabase when available.
- Dashboard counts and derived panels are frontend-computed from React context state.
- Seeded user actions, trend data, security preview data, and many analytics values are mock data.
- Resolving an access request calls the store and attempts to update `access_requests`; the visible state is also held in memory.

### 2.3 Roles & Sub-Roles / RBAC

**Status:** done as an interactive frontend prototype; no dedicated RBAC persistence table currently exists.

**What it does:**

- Shows structural roles Admin, Executive, and Event Planner.
- Shows WOM flat sub-roles with module-by-module permission dropdowns.
- Shows Ground Crew as a recursive tree with arbitrary nesting depth.
- Supports expand/collapse for tree containers and leaf permission panels.
- Supports adding a child beneath any node, including creating a child under a leaf and then nesting another child below it.
- Supports editing a leaf’s name and module permissions.
- Supports leaf and container deletion; container deletion is cascade-style in the in-memory tree.
- Newly-created sub-roles start with all permissions set to `None` and `permissionsConfigured: false`.
- Pending setup state is surfaced on the System Dashboard until the leaf’s permissions are saved.

**Confirmation behavior:**

- Create and delete actions require the admin’s six-digit confirmation PIN.
- Editing an existing node’s name/permissions uses an acknowledgement confirmation modal, not the PIN modal.
- The delete modal includes the descendant count for a container cascade.
- PIN attempts are lockout-scoped to the confirmation action, not the entire user account.

**Persistence:** frontend-only / in-memory React state.

- WOM state lives in `PortalProvider.subRolesByParent`.
- Ground Crew state lives in `PortalProvider.groundCrewTree`.
- Reloading the app restores the seed tree/list; no RBAC database table is currently written.
- Confirmation PIN state is also currently held on the cached client-side `PortalAccount` object.

**Backend rebuild requirement:** create normalized parent-role, sub-role/tree-node, permission, enabled-scope, and audit tables. Enforce all create/delete/edit authorization server-side; do not rely on client-side PIN checks.

### 2.4 Admin confirmation PIN system

**Status:** done as a frontend interaction prototype; not production-secure.

**What it does:**

- First-time PIN setup for an admin account.
- Change PIN flow requiring the current PIN.
- Forgot PIN flow re-verifies the login password, then permits PIN reset.
- Six-digit masked input.
- PIN confirmation gates high-risk RBAC create/delete operations.
- Wrong-PIN attempt lockout is scoped to the current confirmation action.

**Persistence:** frontend-only.

- `confirmationPinHash` is stored on the current user object and cached in `localStorage`.
- Despite the field name, the demo currently stores the raw PIN rather than a one-way hash.
- No Supabase account PIN column or server-side verification is currently implemented.

### 2.5 Workforce Management

**Status:** partially done; account operations have real Supabase paths with local fallback.

**What it does:**

- Directory table for full portal accounts and employee-only records.
- Search/filtering and role/status badges.
- Add new portal account with temporary password.
- Add employee record for on-call/seasonal workers without login credentials.
- Edit staff details.
- Suspend/reactivate account sessions.
- Force logout and remove account flows.
- User Growth Summary deep-links back to a highlighted staff record.

**Persistence:** hybrid.

- Full accounts hydrate from Supabase `portal_accounts`.
- New full accounts insert into `portal_accounts`; Ground Crew accounts additionally insert into `crew_roster`.
- Account removal and suspension attempt Supabase mutations.
- Employee-only records are client-side/in-memory and are deliberately preserved when the database account list hydrates.
- Activity log entries generated by UI operations are generally held in memory.

### 2.6 Security Audit Logs

**Status:** done as a read-only frontend screen; data is mock-only.

**What it does:**

- Cross-account security/access event table.
- Status filters: All, Success, Failed, Blocked, Warning.
- Account filters: All, Admin, Executive, Event Planner, Warehouse Ops, Ground Crew.
- Search by action, Employee ID, Log ID, and account type.
- Expandable row details exposing IP, terminal, token, and note.
- CSV export of the currently filtered rows.

**Persistence:** frontend-only.

- `SECURITY_EVENTS` in `src/lib/security-events.ts` is seeded static data.
- There is no audit-log Supabase query or insertion path today.
- Export creates a browser Blob/download only.

### 2.7 Event planning, pipeline, and design canvas

**Status:** substantially implemented UI; mostly mock/in-memory with selected Supabase hooks.

**What it does:**

- Event pipeline grouped by phases and statuses.
- Event registry and event detail views.
- Event creation/edit drawers and event updates.
- Design Canvas Hub with décor/inspiration library, designs, quick concepts, theme controls, and workspace navigation.
- Konva-based infinite canvas workspace for placing décor, floor plans, colors, and text.
- Canvas export/commit flows create design documents and material/checklist views in client state.
- Generated/committed artifacts can be associated with pipeline events.

**Canvas workspace features (implemented):**

- **Dual page navigation modes:** Flow mode (continuous vertical scroll with external per-page header bars, drag clamping, selection isolation on scroll) and Thumbnail mode (single-page view with bottom filmstrip navigation). Mode persists per project via `lumiere-page-nav-mode-${card.id}` in `localStorage`.
- **Per-page asset partitioning:** each placed element carries a `pageId`; elements render only on their assigned page. Drag movement is clamped within the originating page's artboard boundaries. Selection/Transformer auto-clears when the active page changes via scroll.
- **Cross-project canvas-leak fix:** `lumiere-canvas-assets-${card.id}` and `lumiere-pages-${card.id}` are namespaced per project/card ID. No global/shared storage key for canvas state remains.
- **Page management:** Add, Duplicate, Hide (opacity toggle), Delete, Move Up/Down, and Rename page actions, all accessible from Flow mode's external header bars and Thumbnail mode's page context controls.
- **Uploads tab drag-to-canvas:** uploaded images (and demo reference images) are draggable onto the canvas using the same `DRAG_MIME` pattern as the Elements tab. Click-to-add is also supported.

**Canvas workspace sidebar audit (current status):**

- **Elements tab:** fully functional end-to-end (search → drag → place → allocation tracking).
- **Text tab:** visual placeholder only — no buttons are wired to place Konva Text nodes.
- **Uploads tab:** fully functional — file upload + drag-to-canvas + click-to-add.
- **Tools tab:** visual placeholder only — tool selection state is local, never reaches canvas.
- **Projects tab:** search/accordion works, but sub-page navigation buttons are not wired.
- **Background tab:** UI controls work (color swatches, photo upload), but "Apply" button does not actually change the Konva artboard fill.

**Persistence:** mostly frontend-only/in-memory.

- Pipeline events, designs, placed elements, documents, and many updates are seeded React context state.
- Canvas assets and pages state persist per project in `localStorage` (`lumiere-canvas-assets-${card.id}`, `lumiere-pages-${card.id}`).
- Canvas handoff between screens uses `sessionStorage` for the selected workspace card.
- Theme preference uses `localStorage`.
- Some asset/catalog flows use Supabase `planner_assets`; verify each operation before treating the whole planning domain as persisted.
- No complete event/design/document relational persistence layer is present.

### 2.8 Inventory and asset registry

**Status:** partially done; catalog creation has a Supabase path, but the displayed catalog is largely seeded/in-memory.

**What it does:**

- Inventory stock overview with status/threshold information.
- Asset detail modal and extended physical metadata.
- Add/edit asset flows.
- Low stock, critical deficit, depleted, maintenance, and order-placed states.
- Event asset allocation-related modals and warehouse catalog views.

**Persistence:** hybrid.

- `planner_assets` inserts are attempted for new assets.
- The primary inventory list is initialized from seed data and updates in client state.
- Asset images are local public files.
- Backend consistency, inventory transactions, stock history, and authorization are not yet modeled as a complete server-side system.

### 2.9 Replenishment, procurement, and vendors

**Status:** frontend prototype; mostly mock/in-memory.

**What it does:**

- Deficit table with Critical Deficit, Low Stock, Order Placed, and Available states.
- Threshold editing.
- Reorder requisition drawer/modal.
- Vendor matching, supplier details, lead times, ratings, preferred vendors, and price tiers.
- Generate purchase order and bulk generation flows.

**Persistence:** frontend-only/in-memory in the current app. No complete purchase-order, requisition, vendor, or threshold persistence path is established.

### 2.10 Damage Validation

**Status:** interactive frontend workflow; in-memory state.

**What it does:**

- Review post-event damage exceptions with evidence metadata.
- Verdicts: Pending Verdict, Validated, Dismissed, Held for Audit, Pending Second Sign-off, Repair, Write-off.
- Photo/evidence checks and audit hold.
- Held-for-audit resolution requires two distinct available Executive sign-offs.
- Notes and sign-off metadata are represented in the domain model.

**Persistence:** frontend-only/in-memory. No completed Supabase mutation path for damage exceptions or sign-offs is currently present.

### 2.11 Warehouse operations and mobile workspaces

**Status:** broad UI coverage; mixed persistence, predominantly seeded/in-memory.

Implemented surfaces include:

- Warehouse Home / operations overview.
- Warehouse event detail with production, dispatch, crew, items, replenishment, and state panels.
- Warehouse Lead and Warehouse Member PWA pages.
- Manning Officer page and SLA/workflow modules.
- Production Manager page and production run/quota flows.
- Inventory Officer page.
- Warehouse logs.
- Crew roster and manpower/crew calendars.
- Task deployments and dispatch manifest.
- Incident reporting.

**Persistence:** mixed.

- Manning operations have multiple Supabase insert/update paths in `src/lib/manning.ts`.
- Some warehouse catalog, production, dispatch, crew, and vendor modules use in-memory stores with listener-based updates; several have Supabase imports or optional database paths that need auditing individually.
- Many displayed records and workflow statuses remain seeded demo data.

### 2.12 Access requests, password reset requests, and account actions

**Status:** partially done.

- Login/access request submission inserts into Supabase `access_requests`.
- The store hydrates access requests and combines them with seeded actions.
- Admin dashboard can resolve requests and mark them completed.
- Password reset and temporary-password behavior is represented in the UI.
- Actual email delivery, secure token lifecycle, rate limiting, and a production password reset service are not implemented.

### 2.13 Other implemented/supporting surfaces

The application also contains:

- Shared legacy Overview page and event dashboard.
- Activity Logs page with seeded operational logs.
- Event Calendar and Event Updates components.
- Notification bell and logout confirmation.
- Security incidents component.
- Admin checklist, analytics cards, system-health methodology, and user-growth modal.
- PWA workflow helpers and role-specific navigation shells.

These are principally UI/demo state unless called out above as having explicit Supabase operations.

---

## 3. Key design decisions and rationale

### Single-company model; remove the multi-company selector

The product was narrowed to one operating company. The selector added a tenancy concept that was not supported by the rest of the data model and risked implying company-scoped permissions without a real tenant boundary. Backend rebuild should therefore use one company initially, but retain a migration path if true multi-tenancy is later required.

### Structural roles versus configurable sub-roles

Admin, Executive, and Event Planner are structural account-level roles because their scopes are stable and not meant to be staffed differently per company. Warehouse Operations Manager and Ground Crew are configurable because operational staffing differs by function and the company may enable/disable those domains.

### Ground Crew uses a recursive tree, not a flat list

Ground Crew needs organizational tiers such as category → team lead → member. A recursive `SubRoleNode` supports arbitrary depth and avoids a future schema/UI rewrite when another layer is needed. A node becomes a container based on `children.length`; no separately-maintained `isContainer` flag can drift out of sync.

### Leaf-only operational permissions

Only deepest leaf nodes represent assignable people tiers. When a child is added, the parent becomes an organizational container and its own permission table is no longer operationally surfaced. This keeps assignment and permission meaning unambiguous.

### `permissionsConfigured` completion semantics — Option B

Existing seed roles omit the flag and are treated as configured. Newly-created roles explicitly start with `permissionsConfigured: false`. Saving the permission table once changes the state to configured permanently, even if the administrator intentionally leaves every module at `None`. This separates “the admin reviewed/configured this role” from “the role happens to have non-None permissions.”

### Tiered confirmation

- **PIN required for create/delete:** these actions change the RBAC structure and can remove access or create new authority boundaries, so they require stronger confirmation.
- **Acknowledgement-only for edits:** editing an existing permission table is consequential but remains within an existing node. A second acknowledgement reduces friction while still preventing accidental saves.
- **Cascade deletion warning:** the modal explicitly shows the descendant count before a container delete so the administrator understands the blast radius.

### PIN lockout is scoped to the confirmation action

A failed PIN challenge locks the current high-stakes confirmation action rather than suspending the entire admin account. This prevents one mistyped/forgotten confirmation PIN from taking the administrator out of the product and avoids conflating action authorization with login authentication.

### Forgot PIN has no separate retry lockout

Forgot PIN re-authenticates with the current login password. The design intentionally does not add a second lockout mechanism to that password-reentry step: login/password recovery already has its own authentication boundary, and a separate local lockout would add friction without providing a complete server-side security control. Production implementation should still rate-limit and audit re-authentication server-side.

### PIN is per admin account, not shared/global

A PIN belongs to the individual administrator account so high-stakes changes can be attributable to a specific person. A shared/global PIN would make revocation, accountability, and rotation difficult and would create a single secret shared by all administrators.

### Admin dashboard has one source of truth for pending RBAC setup

`PortalProvider.pendingSubRoleSetups` combines WOM flat roles and recursively scans Ground Crew leaves. The dashboard consumes this derived value instead of duplicating the scan logic. This prevents drift between the Roles screen and the Pending Actions panel.

### Confirmation of a new node is separate from configuration

Creation is committed after PIN confirmation so the structural tree change is immediate and visible. The new leaf starts unconfigured, which lets the dashboard surface a follow-up setup task. There is intentionally no draft/staging role object spanning creation and later permission editing.

### Demo fallback behavior

Several Supabase operations fall back to local/in-memory behavior when the database is unavailable so the prototype remains usable in Preview. This is useful for demonstration but must be removed or made explicit in a production rebuild; silent fallback can create divergent state and false success messages.

### Role-aware portal routing

The app routes users to the workspace appropriate for their account and blocks a user from opening the wrong portal. This avoids exposing a desktop/admin surface to a mobile operational account and keeps permissions aligned with the intended workflow.

### Two Executive sign-offs for audit-held damage

Damage exceptions lacking photographic evidence are held for audit and require two distinct Executive approvals to resolve. The two mock Executive accounts and workforce suspension state are used to test the availability and distinctness rule.

---

## 4. Known gaps and explicit out of scope

### Backend and security gaps

- No dedicated persisted RBAC schema for structural roles, sub-role trees, permissions, enabled scopes, or role assignments.
- Ground Crew/WOM edits reset to seed state on reload.
- Confirmation PIN is client-side and stored as raw data under a field named `confirmationPinHash`.
- Auth relies on mock credentials, browser localStorage, and client-side Supabase access.
- Passwords are represented as raw `password_hash` values in the demo path; this is not production-safe.
- Client-side permission gates are not sufficient authorization.
- No comprehensive server-side audit event insertion for admin actions.
- No complete email delivery, password-reset token service, or secure temporary-password lifecycle.
- Supabase RLS policies, server-side mutation boundaries, and database migrations need to be designed separately.

### Product/UX gaps intentionally deferred

- No draft/staging state for role creation; create is committed immediately after PIN confirmation.
- No separate role-versioning or approval workflow for RBAC edits.
- No assignment UI binding employees/accounts to arbitrary Ground Crew leaf nodes yet.
- No rename/move/reparent operation for tree nodes beyond editing a node name and adding/removing children.
- No drag-and-drop tree ordering or explicit sort persistence.
- No “Forgot PIN” recovery beyond re-entering the current login password and setting a replacement PIN.
- No account-wide lockout from failed confirmation PIN attempts; lockout is action-scoped by design.
- No cross-company tenancy selector or company-scoped role duplication.
- No complete notification/email/SMS dispatch system.
- No production-grade CSV export audit trail.
- No full server-backed real-time synchronization between multiple admins.

### Items to revisit

- Decide whether role permission edits need an approval/audit workflow once backend persistence exists.
- Decide whether `None` permissions should be allowed for a configured leaf or whether at least one operational permission is required.
- Define how account assignment maps to recursive Ground Crew leaf IDs.
- Normalize the distinction between `Warehouse Manager` as a structural/demo account role and `Warehouse Operations Manager` as the RBAC parent label.
- Audit all warehouse modules for which Supabase imports are present but mutations still fall back to in-memory state.
- Replace seeded security events with append-only server-side audit records.

---

## 5. Data model summary

### Authentication and accounts

`PortalAccount`

- `id`: account identifier.
- `email`, `name`: login/display identity.
- `role`: broad account role string.
- `portal`: `web` or `pwa`.
- `subRole?`: WOM sub-role for scoped operational accounts.
- `fullWarehouseAccess?`: unrestricted WOM super-account flag.
- `temporaryPassword`: whether first-login password replacement is required.
- `confirmationPinHash?`: currently client-side PIN value; should become a server-side hash.

`Staff`

- Directory identity fields: `id`, employee ID, surname, first/middle name, email, contact.
- `role`, `sessionStatus`, `lastAccess`, optional `dateAdded`.
- `recordKind`: full account vs employee-only record.
- `accountStatus`: Active, Pending, Locked, Suspended.
- `employmentType`, `tempPassword`, `archived`.

### RBAC

`StructuralRole`

- `id`, `name`, `scope`, `description`.

`ParentRole`

- `id`, `name`, `description`, flat `subRoles` list.

`SubRole`

- `id`, `name`, `summary`, `domain`.
- `permissions`: array of `{ module, level, note }`.
- Optional `comingSoon`.
- Optional `permissionsConfigured`; omitted/undefined means grandfathered configured, explicit `false` means newly created and not yet saved.

`SubRoleNode`

- `id`, `name`, optional `summary`.
- `permissions`: module permission rows.
- Optional `permissionsConfigured`, `comingSoon`.
- `children: SubRoleNode[]`.
- Leaf status is derived from `children.length === 0`.

`ModulePermission`

- `module`: display/RBAC module name.
- `level`: View, Interact, Modify, None.
- `note`: explanatory UI text.

### Events and planning

`PortalEvent`

- Event identity (`id`, `refId`, `title`, `client`), tier, venue, dates, budget, status, and mood plan.

`PipelineEvent`

- Planning-specific event identity, phase, portfolio tier/status, date, venue, record ID, gala date, countdown, footprint, attendance, and pipeline stage.

`CanvasDesign`

- `id`, title, created date, status, image, optional linked event ID.

`PlacedElement`

- Canvas element ID/kind/coordinates plus optional décor, floorplan, color, text, quantity, tracking, and text styling fields.

`EventDocument`

- `id`, name, metadata, kind (`design`, `plan`, `contract`, `spec`), optional design ID and generated file URL.

### Inventory and procurement

`InventoryItem`

- Asset identity/name/category/image, stock/capacity/status/update time, and optional physical/catalog metadata such as supplier, contact, dimensions, weight, fragility, unit, cost, and cost per unit.

`ProcurementItem`

- Asset/deficit identity, current stock, threshold, unit/status, and optional reorder quantity, PO reference, ETA, supplier, and image.

`Vendor`

- Vendor/contact identity, specialty, lead time, rating, price tier, preferred flag, and matching category keywords.

`ReorderDraft`

- Item ID, reorder quantity, note, and vendor ID.

### Damage validation

`DamageException`

- Exception/log/event/reporting identity, asset and damage details, image/GPS/EXIF evidence, estimated cost, notes, and verdict.
- Optional no-photographic-evidence flag.
- Optional `firstSignOff` and `secondSignOff` records.

`DamageSignOff`

- Executive email/name, verdict (`Repair` or `Write-off`), note, and timestamp.

### Requests, logs, and security

`UserAction`

- `id`, type (`forgot-password`, `request-password`, `account-locked`), user/email, status (`pending` or `completed`), optional account type.

`ActivityLog`

- `id`, timestamp/date, log ID, account, initiator role, action, detail, IP, and status.

`SecurityEvent`

- Security event ID, timestamp/date, log ID, employee ID, account role, action, status, IP, terminal, token, note, and UI dot color.

### Current backing status

**Known Supabase-backed tables/paths:**

- `portal_accounts`: login fallback, workforce hydration, account creation, deletion, suspension, password changes.
- `access_requests`: login request submission, hydration, and completion updates.
- `crew_roster`: Ground Crew roster insert linked to newly-created portal accounts; roster loading also queries the database.
- `planner_assets`: asset creation path from Inventory Stock.
- `manning_assignments`, `manning_tasks`, `manning_warnings`: multiple Manning operations in `src/lib/manning.ts`.

**Currently mock/in-memory or browser-only:**

- RBAC parent/sub-role/tree configuration.
- Confirmation PIN state.
- Security audit events.
- Most event pipeline/design/canvas state.
- Most damage validation state.
- Most procurement/vendor/replenishment state.
- Employee-only workforce records.
- Many warehouse operational stores and seeded dashboards.
- Theme preference and selected canvas workspace handoff use browser storage.

The exact production status of individual warehouse modules should be revalidated before backend implementation because some modules contain Supabase imports while still maintaining local caches/listeners.

---

## 6. Files touched / navigation map

### App shell and routing

- `src/App.tsx` — providers, authentication gate, role-aware initial route, route switch, portal boundary.
- `src/App.css`, `src/index.css` — global application styling.
- `src/lib/nav.tsx` — navigation context and route transitions.
- `src/components/ConsoleLayout.tsx`, `ConsoleSidebar.tsx` — shared/legacy console shell.

### Authentication and identity

- `src/lib/auth.tsx` — `AuthProvider`, demo accounts, Supabase login fallback, localStorage session cache, password and PIN methods.
- `src/pages/LoginPage.tsx` — staff login and access/password request entry.
- `src/pages/GroundCrewLoginPage.tsx` — crew/PWA login.
- `src/components/LogoutModal.tsx` — logout confirmation.
- `src/components/admin/AdminTopBar.tsx` — admin account menu, PIN setup/change/forgot-PIN flows.
- `src/components/admin/MaskedPinInput.tsx` — masked six-digit PIN input.

### Admin dashboard and admin navigation

- `src/pages/AdminSystemDashboardPage.tsx` — System Dashboard, stats, pending actions, analytics and request resolution.
- `src/components/admin/AdminShell.tsx` — admin icon rail shell.
- `src/components/admin/AdminRail.tsx` — admin destinations/navigation.
- `src/components/admin/AdminPendingActions.tsx` — pending request and RBAC setup panel.
- `src/components/admin/AdminSecurityFeed.tsx` — dashboard security feed preview.
- `src/components/admin/AdminAnalytics.tsx` — user distribution and trend cards.
- `src/components/admin/SystemHealthMethodologyModal.tsx` — health methodology modal.
- `src/components/admin/UserGrowthSummaryModal.tsx` — growth summary.
- `src/lib/admin-destinations.ts` — admin rail destination definitions.
- `src/lib/admin-growth-summary.tsx` — growth-summary context/actions.

### Workforce and audit

- `src/pages/AdminWorkforcePage.tsx` — workforce directory and account actions.
- `src/components/admin/workforce/WorkforceTable.tsx` — directory table.
- `src/components/admin/workforce/EmployeeRecordModal.tsx` — employee/full-account creation/edit modal.
- `src/components/admin/workforce/WorkforceBadges.tsx` — status/role badges.
- `src/pages/AdminSecurityAuditPage.tsx` — audit table, filters, expanded details, CSV export.
- `src/lib/security-events.ts` — static security audit events.
- `src/pages/ActivityLogsPage.tsx` — broader operational activity-log screen.

### RBAC and confirmation flows

- `src/pages/AdminRolesPage.tsx` — structural roles, WOM editor, recursive Ground Crew tree, create/edit/delete handlers and confirmation modals.
- `src/lib/rbac.ts` — access levels, structural roles, WOM definitions, Ground Crew tree seed/model/helpers, permission resolution.
- `src/lib/store.tsx` — shared staff/events/logs/actions/inventory state, `subRolesByParent`, `groundCrewTree`, and pending setup derivation.
- `src/components/ConfirmDialog.tsx` — generic acknowledgement confirmation.

### Shared domain/store and integrations

- `src/lib/types.ts` — shared domain interfaces and unions.
- `src/lib/store.tsx` — main React portal store and Supabase-backed account/request operations.
- `src/lib/supabase.ts` — browser Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/lib/roster.ts` — roster loading and crew-related data access.
- `src/lib/theme.ts` — theme preference storage and application.

### Event planner and canvas

- `src/pages/EventPipelinePage.tsx`
- `src/pages/EventRegistryPage.tsx`
- `src/pages/EventDetailPage.tsx`
- `src/pages/DesignCanvasHubPage.tsx`
- `src/pages/CanvasWorkspacePage.tsx`
- `src/lib/planner.tsx`
- `src/components/canvas/KonvaInfiniteCanvas.tsx`
- `src/components/EventPipelinePanel.tsx`
- `src/components/EventCalendar.tsx`
- `src/components/RegisterEventDrawer.tsx`
- `src/components/InitiatePortfolioDrawer.tsx`

### Warehouse, inventory, logistics, and field operations

- `src/pages/WarehouseHomePage.tsx`
- `src/pages/WarehouseEventDetailPage.tsx`
- `src/pages/WarehouseLeadPage.tsx`
- `src/pages/WarehouseMemberPage.tsx`
- `src/pages/GroundCrewPage.tsx`
- `src/pages/ManningPage.tsx`
- `src/pages/ProductionManagerPage.tsx`
- `src/pages/InventoryOfficerPage.tsx`
- `src/pages/InventoryStockPage.tsx`
- `src/pages/WarehouseLogsPage.tsx`
- `src/pages/CrewRosterPage.tsx`
- `src/pages/TaskDeploymentsPage.tsx`
- `src/pages/DispatchManifestPage.tsx`
- `src/pages/ReplenishmentPage.tsx`
- `src/pages/DamageValidationPage.tsx`
- `src/lib/manning.ts`
- `src/lib/warehouse.tsx`
- `src/lib/warehouse-catalog.ts`
- `src/lib/warehouse-crew.ts`
- `src/lib/warehouse-dispatch.ts`
- `src/lib/warehouse-production.ts`
- `src/lib/warehouse-replenishment.ts`
- `src/lib/warehouse-vendors.ts`
- `src/lib/inventory-ops.tsx`
- `src/lib/ground-crew-declarations.ts`
- `src/lib/event-detail.ts`
- `src/lib/deployments.ts`

---

## Recommended backend rebuild sequence

1. Establish secure authentication and session handling; migrate portal accounts and password reset flows.
2. Add normalized organization/account tables and server-side authorization.
3. Persist RBAC structural roles, WOM sub-roles, recursive Ground Crew nodes, permissions, enabled scopes, and assignments.
4. Add append-only security/audit events for auth, account, PIN, RBAC, and workflow changes.
5. Persist events, designs, canvas artifacts, inventory, procurement, damage exceptions, warehouse operations, and Manning workflows domain by domain.
6. Replace client-side fallback success behavior with explicit loading/error states and transactional server actions/API routes.
7. Add RLS/authorization tests, audit tests, and end-to-end tests for the five critical RBAC flows: tree expansion, arbitrary-depth creation, leaf editing, cascade deletion, and pending setup completion.

This document describes the current frontend truth, including prototype compromises, so backend work can deliberately preserve the intended product behavior without accidentally treating mock state as production persistence.

---

*Generated from the current LUMIÈRE frontend source tree and implementation notes. Validate all persistence claims against the eventual Supabase schema and migrations before production launch.*
<table data-preserve="true"><tr><td> </td></tr></table>

---

## Appendix: implementation notes from current RBAC verification

The recursive tree was exercised in the browser with a three-level chain (`Field Crew → Team Lead → Member`). Creating a child required the PIN confirmation; editing a leaf permission changed Save/Cancel from disabled to active and used the acknowledgement modal without a PIN field; deleting a container opened the PIN modal with an explicit descendant-count warning. The browser session used during verification was demo state and should not be treated as durable data.

The tree component was also corrected so non-leaf/container nodes expose a visible delete action; previously their delete panel was leaf-gated. This fix is in `AdminRolesPage.tsx` and should be preserved when the UI is refactored around backend data.

---

## Appendix: exact demo account matrix

| Demo email | Display role | Portal | Special scope |
|---|---|---|---|
| `admin@lumiere.com` | Admin | web | Full administration; confirmation PIN setup is per account |
| `executive@lumiere.com` | Executive | web | Executive sign-off candidate |
| `executive2@lumiere.com` | Executive | web | Distinct second Executive sign-off candidate |
| `warehouseops@lumiere.com` | Warehouse Manager | web | Full WOM access via `fullWarehouseAccess` |
| `manning@lumiere.com` | Warehouse Manager / Manning Officer | pwa | Manning scope |
| `warehouse@lumiere.com` | Warehouse Manager / Warehouse Manager | web | Warehouse-manager WOM scope |
| `production@lumiere.com` | Warehouse Manager / Production Manager | pwa | Production scope |
| `inventory@lumiere.com` | Warehouse Manager / Inventory Officer | pwa | Inventory scope |
| `purchasing@lumiere.com` | Warehouse Manager / Purchasing Officer | web | Procurement/replenishment scope |
| `planner@lumiere.com` | Event Planner | web | Planner/canvas scope |
| `crew@lumiere.com` | Ground Crew | pwa | Ground crew field workspace |
| `lead@lumiere.com` | Warehouse Lead | pwa | Warehouse lead workspace |
| `member@lumiere.com` | Warehouse Member | pwa | Warehouse member workspace |

All demo accounts currently use the shared prototype password `lumiere2026`; this must not be retained in production.

---

## Appendix: environment and build notes

- Framework/runtime: Vite + React 19 + TypeScript, not Next.js App Router.
- Package manager: pnpm.
- Supabase client is configured through `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- The dependency list also includes `@neondatabase/serverless`, but the current application code shown here uses Supabase as the active data integration; Neon is not the primary implemented database path.
- Main scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm preview`.
- The production backend rebuild should not assume that current client-side stores, localStorage keys, or seeded arrays are authoritative.

---

## Final handoff statement

The app is best understood as a polished multi-portal frontend prototype with a hybrid data layer. Its strongest completed verticals are admin navigation/dashboard, workforce account operations, recursive RBAC interaction design, role-aware routing, event-planning/canvas UI, and selected Manning/account/asset Supabase paths. The next implementation phase should preserve the interaction decisions documented above while replacing client-side authority, raw credentials, seeded audit data, and in-memory domain state with normalized, audited, server-enforced persistence.

<!-- End of project state document -->

---

## 7. Current active context & in-progress focus

### Previous focus: UI cleanup on the Creatives Dashboard (Event Planner account view) [COMPLETED]

*   **Routing [COMPLETED]:** Removed the deprecated "Curated Event Pipeline & Milestones" route (`'pipeline'`), deprecated [`EventPipelinePage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/EventPipelinePage.tsx), and removed its sidebar navigation entry from [`ConsoleSidebar.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/components/ConsoleSidebar.tsx). Set [`DesignCanvasHubPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/DesignCanvasHubPage.tsx) (Creatives Dashboard) as the landing/home route for Event Planners, and re-routed back navigation in [`EventDetailPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/EventDetailPage.tsx) to go back to the dashboard.
*   **Header buttons [COMPLETED]:** Buttons in [`DesignCanvasHubPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/DesignCanvasHubPage.tsx) are reordered from left to right: Create Design → Mood Board → Notifications bell → Theme toggle (Sun/Moon icon bound to unified hook `toggleDark`) → Profile. The legacy "Back to Pipeline" button has been completely removed.
*   **Calendar container [COMPLETED]:** Wrapped the calendar grid in a unified card container with fixed height (`32rem`) and consistent border/shadow treatment. Modified `calCells` array state logic in [`DesignCanvasHubPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/DesignCanvasHubPage.tsx) to pad dates to a fixed 42-day (6-row) grid so height does not shift between months.
*   **Needs Editing panel [COMPLETED]:** Added fixed height (`32rem`) to the sidebar container, marked header layout as `shrink-0` to keep it pinned, and set the list element to `flex-1 overflow-y-auto` to allow scrollable list viewing.
*   **Layout ratio [COMPLETED]:** Restructured the parent container wrapping the Calendar and Needs Editing elements in [`DesignCanvasHubPage.tsx`](file:///c:/Users/T480s/Downloads/Lumiere_Frontend/src/pages/DesignCanvasHubPage.tsx) to use a CSS grid with `grid-cols-1 lg:grid-cols-[7fr_3fr]` layout ratio which holds cleanly across responsive breakpoints.

### Latest Completed Focus: Manning Delegation Module & System-Wide UI Polish [COMPLETED]

- **Manning Delegation Module — COMPLETE ✅**:
  - **Structural**: Merged "Manning & SLA Engine" + "Manpower & Crew" into unified "Manning Delegation" module (`/manning`). Single route with internal tab-switching (`Daily Operations` / `Event-Based Operations`). Renamed "SLA" terminology to plain language throughout (`"48h Task Confirmations"`, `"Confirmation Overdue"`).
  - **Weekly Roster Matrix**: Built scrollable shift grid (`CrewOpsGrid.tsx`) with dual-axis sticky headers (`sticky top-0` dates, `sticky left-0` crew names). Local draft editing (`draftGrid`) with staged amber ring visual feedback, **"Save Changes (N)"** confirmation modal, and **"Discard"** safety prompt modal. Expanded mock crew roster to 20 members.
  - **Shared Crew Directory**: Built compact scrollable list format (`max-h-52`) with real-time text search and status filter pills (`All`, `Available`, `Assigned`, `On Leave`). Added **"Expand"** button (`Maximize2` icon) opening a full-screen/large scrollable `FullRosterModal`.
  - **Foundation A — Leave/Double-Booking Hard-Block**: Hard-blocks On Leave + double-booked crew across Manual/Preset assignment modes. Integrated Foundation A Emergency Override modal requiring mandatory justification, backed by Supabase `manning_overrides` table with local fallback.
  - **Foundation B — Minimum Team Lead Enforcement**: Implemented `isTeamLead()` two-tier resolution hierarchy: Tier 1 per-day designation (`isTeamLeadToday`), Tier 2 static role/declaration fallback (exact-match qualification roles). UI blocks finalization with 0 Team Leads selected (amber banner) or 0 available in pool (red escalation banner). Backend `createAssignment()` validates genuine `isTeamLead()` qualification.
  - **Daily Duty Assignment by Department & Zone (Batches 1-4)**:
    - Three-way duty category separation: `Field` (event deployments), `Warehouse` (zone maintenance), `Production` (bespoke fabrication).
    - `DailyDutyAssignment` record schema: single-day date scope, `dutyCategory`, `zone`, `isTeamLeadToday`.
    - 6 physical warehouse zones: `Logistics & Movement`, `Artificials Inventory`, `Centerpieces Inventory`, `Drapery & Fabrics`, `Lighting & Rigging`, `Staging & Hardware`.
    - **Symmetric Hard-Block**: Cross-context hard-blocking between Field Crew (event deployments) and Daily Duty (Warehouse / Production). Multi-day Field ranges block Daily Duty for every day in range, reusing Foundation A's override system with per-day surgical override.
    - **Shared Selector Components**: Extracted `<FifoSelector>`, `<PresetSelector>`, and `<ManualCrewPicker>` into `src/components/warehouse/manpower/shared/` and reused across `AssignCrewModal` and `AssignDailyDutyModal`.
    - **`DailyZoneDutyView.tsx`**: Per-day view with date picker, Production section, Warehouse zone cards, `[⭐ Lead Today]` badges, compact scrollable crew lists, and `"No Crew Assigned"` gap callouts with `+ Assign` shortcuts.
    - **Daily Operations View Switcher**: Added sub-tab toggle inside Daily Operations: `[ 📅 Weekly Roster Matrix ]` ↔ `[ 🏢 Daily Department & Zone Detail ]`.
  - **UI Polish (System-Wide)**:
    - Bolds event group headers in Replenishment & Deficits (`<h2 className="font-serif text-lg font-bold">`).
    - Clickable table rows/cards with proper `stopPropagation()` across Replenishment, Asset Catalog, and Manning Delegation (Assignments, SLA Tasks, Warning Ledger).

  - **Prompt 2 (FIFO & Modal Date Validation) — COMPLETE ✅**:
    - Added explicit **Assignment date** input field (`<input type="date">`) to `AssignCrewModal`.
    - Added past-event-date validation: selecting a date past `selectedEvent.targetDate` renders a red `Invalid Assignment Date` warning banner and hard-disables `Finalize Field Assignment`.
  - **Prompt 3 (Preset Squad Enhancements & Persistence) — COMPLETE ✅**:
    - **Supabase Persistence**: `manning_preset_squads` stored directly in Supabase (`fetchPresetSquads`, `savePresetSquad`, `deletePresetSquad`) with local in-memory fallback.
    - **Per-Team Field Task Registry**: Hidden global task dropdown in Preset Mode; task is bound per-team (`Team Task: Setup & Staging`) on preset cards.
    - **Candidate Swap Dropdown**: Clicking swap icon on a squad card renders an inline candidate replacement dropdown listing available non-conflicting FIFO candidates.
    - **Preset Squad Manager Modal**: Added **`Manage Squads`** button opening `PresetSquadManagerModal` for creating, editing, and deleting squad presets.
  - **Prompt 4 (SLA Indicator & PIN Gate Popup Modal) — COMPLETE ✅**:
    - **Strict Overdue SLA Indicator**: Countdown badge renders strictly when `isSlaOverdue(task, now)` is `true` (`overdue === true`).
    - **PIN Review Gate Popup Modal**: Converted `PinGate` full-panel takeover into a floating modal dialog overlay (`fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm`) over the dimmed/blurred review queue in the background.

  - **Prompt 5 (Dispatch & Logistics Enhancements) — COMPLETE ✅**:
    - **List Row Assets Summary**: Contained assets (`reconciliation` items) rendered directly inside list row cards.
    - **Asset Deduplication & Allocation**: `NewBatchModal` with Driver field, master asset list, and quantity deduplication (`Available Qty = Total Qty - Committed in Open Batches`). Items with `Available Qty <= 0` disabled with `Reserved in Open Batch` badge.
    - **Automated Return Batch Prompt**: Reaching `Delivered` status renders `Outbound Batch Delivered` banner and `+ Return Batch` shortcut button pre-populating return ingress batch.
    - **Real PDF Manifest Export**: `exportBatchPdf` helper using `jsPDF` (`^4.2.1`) generating formatted `Manifest_[Plate]_[BatchId].pdf` downloads.
    - **Editable Vehicle & Driver**: `driverName` field added to `DispatchBatch` schema, with dynamic vehicle type, plate number, and driver name editing in `BatchDetailView`.
    - **Cancel/Delete Batch Action (Feature Addition)**: Exposed red `Cancel / Delete Batch` button in `BatchDetailView` header with confirmation popup modal. Deleting a batch removes it from active fleet store & Supabase (`deleteBatch`), logs to the Dispatch Activity Feed (`getDispatchActivity`), and releases all committed quantities back to the available pool. Reactivity is instant on the active tab/device (`useSyncExternalStore`), with cross-device sync updating upon module open/refresh.

### Next Up / Pending Tasks
- **Foundation C-F**: (leave-after-assignment auto-release, First-Commit-Wins tie-breaker, no-show flag, Admin Team Lead quota) — parked, non-blocking future tasks.
- **Foundation G: Centralized Audit Log (parked, cross-module)**:
  - **Status**: Not started — identified during Prompt 5 Dispatch sign-off review.
  - **Problem**: Destructive/sensitive actions across modules currently use inconsistent audit patterns. `manning_overrides` has a proper structured table with mandatory justification (gold standard). Dispatch batch deletion only writes a free-text activity log string (no actor, no reason, no snapshot). Preset squad create/rename/delete audit trail status unconfirmed.
  - **Proposed Fix**: Generic reusable `audit_log` Supabase table usable across all modules (`id`, `actor_id` / `actor_name`, `module`, `action_type`, `target_id`, `target_snapshot` [JSON], `reason`, `created_at`).
  - **Scope**: Cross-cutting, not tied to one module. Needs its own data-model-first proposal before implementation.
  - **Related Gap**: Dispatch's current `deleteBatch()` hard-deletes with no soft-delete/archive option — no manifest/reconciliation history preserved. Decision pending on whether this matters for dispute resolution.
- **Prompt 6**: Replenishment status labels & workflow adjustments.
- **Prompt 7**: Vendor search & Asset detail fields.

---

## Backlog — Client Walkthrough Notes (Post-WOM Priority)

Status: Logged, not started. Sequenced after current WOM work (build-failure fix →
Foundation E → Prompt 5 clarifications → Prompt 6 → Prompt 7 → Foundation G).

### Confirmed decisions (ready to scope when we get here)
- Executive role becomes read-only / insights-only across the system — no sign-off
  or approval actions anywhere, including Damage Validation.
- Damage Validation sign-off authority (Repair, Write-off) moves from Executive to
  WOM (Warehouse Manager / Inventory Officer). Executive becomes notify-only for damage events.
- Repair sign-off updates the corresponding asset's status in the Asset Registry
  to 'In Maintenance', with a WOM-accessible 'Complete Maintenance / Return to Stock' flow.
- Damage Validation UI remains a single page/route (`DamageValidationPage.tsx`),
  rendering read-only (stripped action buttons, non-editable modal) for Executive credentials.
- Event Settlement blocking override routes through WOM sign-off instead of Executive.
- **Admin-Configurable "Allow Self-Validation" Permission**:
  - Configurable per WOM sub-role in RBAC (`allowSelfValidation`, default: ON for lean teams).
  - When ON: Single qualifying WOM actor can resolve Held-for-Audit with PIN + mandatory justification (≥20 chars) + acknowledgement checkbox.
  - When OFF: Strict dual-custody enforced. If understaffed (<2 qualifying accounts), resolution strictly blocked.
  - **Admin Emergency Unblock Choice (when OFF)**:
    - **Option A ("One-Time" / Instance - Default)**: Auto-reverts toggle to OFF once the specific claim is resolved.
    - **Option B ("Permanent")**: Keeps toggle ON permanently; requires mandatory warning modal with explicit acknowledgement checkbox.
    - **Audit Trail**: Records `originatedFromEmergency: true`, `emergencyReason`, and (for Option B) `madePermanentAt` / `permanentAcknowledged: true`.
- General UI direction from client: "Simplify, Be Specific" — applies broadly to
  upcoming redesign work, not just one module.

### Needs clarification before scoping (open questions, not yet resolved with client)
- **NDA consolidation**: client wants a single consolidated NDA document, described
  as "event-based" — exact meaning (one NDA per event? one master doc referencing
  events?) not yet confirmed.
- **UI fade-out pattern**: resolved/completed items in pending-lists should fade out
  before moving to the bottom of the list, rather than disappearing or staying in
  place. Likely applies to multiple screens (Pending Actions, Damage Validation
  queue, etc.) — needs a full inventory of affected lists before scoping.
- **Event Planner role**: needs read-only View access to the Manning side. Client
  mentioned "Manning Responsibility Time" and a "Timeline" view — neither has a
  clear definition yet; needs follow-up with client before this can be scoped.
- **PWA / mobile redesign**:
  - Some capability should be restricted to Team Lead only (which capability,
    not yet specified).
  - General simplification pass needed with digital-literacy in mind — assume
    lower technical familiarity among some field users.
  - Inventory PWA view needs a summary/overview mode instead of a full list —
    current catalog is ~5,000 SKUs, too many to browse directly on mobile.
  - Some feature(s) should be restricted to a specific named person, not a whole
    role — which feature(s) not yet specified.
  - Need "acknowledge limitations" confirmation buttons before certain actions —
    exact actions/copy not yet specified.
- **Scope reduction — "remove the Event side"**: unclear which surface this refers
  to (PWA? a specific module?) — needs clarification before scoping.
- **Kiosk and Brochure**: unclear if this is a new feature request (e.g. a
  self-service kiosk mode, digital brochure view) or something being removed —
  needs clarification.
- **Inventory & Purchasing declutter**: general UI simplification request for
  these two modules — no specific redesign scoped yet.

### Process note
When we return to this backlog, resolve the "needs clarification" items with
the client (via the human PM) before drafting implementation prompts — do not
guess at ambiguous items the way we've had to flag mid-review before.

---

## Document maintenance

Update this file whenever a feature moves from mock/in-memory to persisted, a permission model changes, a confirmation/security decision changes, or a new portal/screen is introduced. Keep the feature status and backing-store statement together so future handoffs do not confuse a polished UI with a completed backend.

---

## Quick status matrix

| Area | UI status | Current state source | Backend status |
|---|---|---|---|
| Admin dashboard | Done | React store + seed data | Partial Supabase |
| Workforce | Done/partial | React store + Supabase account rows | Partial Supabase |
| RBAC | Done interaction | React store only | Not persisted |
| Confirmation PIN | Done interaction | Auth context + localStorage | Not secure/persisted |
| Security audit | Done read-only UI | Static constants | Not persisted |
| Event planning | Broad UI | Planner context/seed data | Mostly not persisted |
| Canvas | Broad UI + dual page modes + per-page partitioning | React/localStorage (per-project scoped) | Mostly not persisted |
| Inventory | Broad UI | Store + selected Supabase writes | Partial |
| Replenishment/vendors | Broad UI | Seed/in-memory | Not persisted |
| Damage validation | Interactive workflow | Store/seed data | Not persisted |
| Manning | Interactive workflow | Module state + Supabase paths | Partial Supabase |
| Warehouse operations | Broad UI | Module stores/seed data | Mixed/needs audit |
| Password/access requests | Partial | React + `access_requests` | Partial Supabase |

---

## Suggested database concepts for Claude Code

The frontend behavior implies these future relational concepts, without prescribing a final schema:

- `companies` (one active company initially, if future tenancy is anticipated)
- `users` / `portal_accounts`
- `employee_records`
- `sessions`, `password_reset_tokens`, `temporary_credentials`
- `admin_confirmation_pins` or a secure credential factor table
- `structural_roles`
- `permission_domains` / `modules`
- `role_nodes` with `parent_id`, `kind` derived from children, and ordering
- `role_node_permissions`
- `role_node_assignments`
- `role_enablement`
- `access_requests`
- `security_audit_events`
- Event, design, document, inventory, procurement, vendor, damage, crew, Manning, dispatch, and production tables

For Ground Crew specifically, the backend should preserve the frontend invariant: only nodes with no children can be assigned and can remain pending permission setup; deleting a node must either cascade in one transaction or be rejected when assignments exist, depending on the final product policy.

---

## Caveat on source-of-truth terminology

The UI currently calls `PortalProvider` the “single source of truth” for pending RBAC setup, but that is only true within the running browser session. It is not a durable source of truth across tabs, devices, reloads, or administrators until the RBAC state is persisted and reloaded from the backend.

---

## Known Architectural Gaps (Deferred to Backend Integration Phase)

### Optimistic / Fire-and-Forget Supabase Mutation Divergence
- **Pattern:** `deleteBatch()` (and other operational Supabase mutations following this pattern) executes an immediate optimistic local delete/mutation, then dispatches an asynchronous, un-awaited Supabase database call in the background.
- **Failure Handling:** On network or database rejection, failures are caught and logged solely to `console.warn` (`[v0] Supabase delete batch error...`) without reverting optimistic local state, displaying a user-facing error notification, or enqueuing a persistent retry.
- **Risk:** Silent state divergence between the local browser session and the remote PostgreSQL database once active Supabase production credentials are connected.
- **Remediation Plan:** Introduce a structured sync-status indicator, rollback/reversion hooks on rejected promises, or an offline mutation/retry queue before promoting these endpoints to production. (Low urgency during prototype phase as the local workspace operates against fallback placeholder credentials).

---

## Handoff checklist

- [ ] Confirm Supabase schema and RLS policies.
- [ ] Replace raw password comparisons with secure auth.
- [ ] Persist confirmation PIN as a secure factor/hash.
- [ ] Persist RBAC tree and permissions.
- [ ] Persist role assignments and enabled/disabled state.
- [ ] Add server-side audit events for all admin actions.
- [ ] Decide cascade-delete behavior when staff are assigned to descendants.
- [ ] Replace mock security events with queryable audit logs.
- [ ] Add backend integration tests for dashboard pending setup derivation.
- [ ] Add E2E coverage for recursive RBAC flows.
- [ ] Remove or explicitly label local fallback behavior.
- [ ] Reconcile role naming (`Warehouse Manager` vs `Warehouse Operations Manager`).
- [ ] Confirm which warehouse modules are truly persisted.

---

## End

This is the durable project-state handoff for the current source tree.
