# Lumière Ground Crew PWA — Consolidated Reconciliation Full Reference File
### Phase 1 (Wireframing & Screen-Level Detail) + Phase 2 (Data Model / Schema)

**Status**: All items below have been verified against the real backend codebase (EF Core entities, services, DTOs) unless explicitly marked as an open item. Corrections supersede earlier draft language wherever a later clarification round revised it.

---

## 1. Account & Role Model

### 1.1 Sub-Roles (Fixed, Account-Level)
Legacy static titles (`Warehouse Lead`, `Warehouse Member`, `Field Crew Lead`, `Field Member`) are retired. The system uses 5 fixed account sub-roles:

- `WarehouseCrew`
- `FieldCrew`
- `InventoryCrew`
- `ProductionCrew`
- `EventAdmin`

| Display Name | Tree ID | Wire Value | Claim |
| --- | --- | --- | --- |
| Warehouse Crew | warehouse-crew | Warehouse | ground_crew_subrole |
| Field Crew | field-crew | Field | ground_crew_subrole |
| Inventory Crew | inventory-crew | Inventory | ground_crew_subrole |
| Production Crew | production-crew | Production | ground_crew_subrole |
| Event Admin | event-admin | EventAdmin | ground_crew_subrole |

The canonical claim is `ground_crew_subrole` carrying the wire value; no per-sub-role GroundCrew_* claims are emitted.

Authority/leadership is **not** a sub-role — it's a per-shift assignment attribute (`IsShiftLead`), scoped below.

### 1.1a Inventory + Production are New Ground Crew Sub-Roles, Not WOM Pages
`InventoryCrew` and `ProductionCrew` are not reusing or consolidating with `ProductionManagerPage.tsx` or `InventoryOfficerPage.tsx`. Those pages belong to the separate WOM management layer and do not represent the same operational model as Ground Crew's live event work.

**Exact frontend shape**:
- `src/lib/rbac.ts`'s `GROUND_CREW_TREE_SEED` must include dedicated leaf nodes for `inventory-crew` and `production-crew`.
- Their permission tables must be configured as real Ground Crew leaf roles in `AdminRolesPage.tsx`, not hidden behind a legacy WOM role or a coming-soon placeholder if they are intended to be live.
- The tree ID names and permission names must match the canonical Ground Crew sub-role naming exactly (`InventoryCrew`, `ProductionCrew`), so the Admin UI is a mirror of the backend claim model instead of a second source of truth.

**Exact backend shape**:
- `JwtService.cs` emits the canonical `ground_crew_subrole` claim (containing one of the 5 wire values: `Warehouse`, `Field`, `Inventory`, `Production`, `EventAdmin`) alongside the top-level `role_name: "Ground Crew"` claim.
- Single typed mapping `GROUND_CREW_SUBROLE_MAP` in `src/lib/rbac.ts` translates backend wire values to frontend tree IDs (`warehouse-crew`, `field-crew`, etc.) and display names.
- Shift-lead claims are deferred to Phase 3 (emit none in Phase 2). Database `ManningAssignment` lookup on transition routes remains the enforcement source.

**Shift-lead claim alignment**:
- `ManningAssignment.IsShiftLead` should be resolved in the same claim-building path for `WarehouseCrew` / `FieldCrew`, using explicit per-sub-role claims: `GroundCrew_WarehouseShiftLead` and `GroundCrew_FieldShiftLead`.
- A flat `GroundCrew_IsShiftLead` claim is intentionally rejected because it cannot distinguish Warehouse authority from Field authority, and the two domains remain independent even though both are shift-lead tiers.
- The claim is a UI convenience only; it is not the authorization source for stage transitions. Dispatch authorization is *intended* to work this way — a fresh `ManningAssignment` query against the active event/shift-date row on every request, so a stale JWT can never authorize a stage transition by itself — but this check is **not yet implemented** on the live route (confirmed via `DispatchService.UpdateAssetStateAtomicAsync`; see §4.2 and the Phase 3 acceptance criteria). Until it ships, describe this as the required design, not current behavior.
- This claim is a UI convenience only, not an authorization source: the server-side stage-transition check is *specified* as a fresh `ManningAssignment` lookup on the actual dispatch route, using the active event/shift-date row and the demote-then-promote audit model — but as of this writing that lookup does not exist in the live code (§4.2 confirms `DispatchService.UpdateAssetStateAtomicAsync` performs no such check). This is the net-new Phase 3 backend requirement, not a currently enforced protection.
- The result is a consistent identity payload for the UI: base role + current sub-role + current shift-lead state for the relevant sub-role domains, while the database remains the authoritative enforcement layer on the actual live transition route (`POST /api/dispatch/asset/{assetId}/status`). There is no live `POST /api/dispatch/event/{id}/status` endpoint in the ASP.NET controller today; if a new event-scoped route is added, it must follow the same server-side enforcement semantics.

### 1.1b Task Creation Toggle / Shared Task Pool — Decision
When `GroundCrewConfig` enables crew task creation, it does **not** create a parallel task queue. Instead, crew-authored tasks write into the same `GroundCrewTaskPoolItem` table as Manning-authored tasks, because the pool is the single system-of-record for Type A work, and a second queue would duplicate operational truth.

**Operational rule**:
- Every task row carries a `CreatedBy` or `Source` marker (`Manning` vs `Crew`) and a review state such as `PendingReview`.
- A crew-created item is still part of the same list, but it should be shown with a visual distinction: a **Crew-created** badge and a **Pending review** or **Awaiting confirmation** state.
- The creator can see the item immediately, but the item is not treated as a normal ready-to-claim task for other crew until Team Lead or Manning approval changes its status.
- Once approved, the task is reclassified to the normal ready/open state and behaves exactly like any other `GroundCrewTaskPoolItem`.

This preserves one task model while making the trust boundary explicit: same pool, different provenance, and a short approval gate before the task becomes broadly actionable to others.

### 1.1c Crew-Created Task Approval Authority / Notification / Staleness — Resolved
The approver for a crew-created task in `PendingReview` is **`EventAdmin`**. This is the correct ownership boundary because earlier role scoping explicitly limited `EventAdmin` to **event-scoped confirmation authority** and rejected broader override powers; a crew-created task approval is an event-level confirmation action, not a stage-level operational override. It is not a Shift Lead action, because shift-lead authority is scoped to Warehouse/Field dispatch authority and not to general task approval; it is not Manning-wide by default either, because that would broaden the manager review surface beyond the event's designated confirmation role.

**Notification pattern**:
- When a crew-created task enters `PendingReview`, the responsible `EventAdmin` receives an active event-scoped **Pending Actions** / escalated-item signal associated with that one event, not a new standalone cross-event `EventAdmin` inbox.
- The intended UI pattern is in-scope event framing: a count, badge, inline banner, or dedicated approval block on the relevant event's `Event Detail` task-pool section. This keeps the role aligned to its earlier narrow definition (`Home` + `Event Detail` only) and avoids reintroducing a cross-event management surface beyond the role's original scope.
- This is a proactive signal to the approver; the task should not require a manual queue scan to discover that review is pending.

**Staleness / no-response behavior**:
- The default policy is **no auto-expire and no auto-escalation** for a pending crew-created task.
- A task remains in `PendingReview` until an approver acts on it, and the fact that it is pending remains visible in the approval surface.
- If the product later needs stronger accountability, it may reuse the existing aging/reminder pattern as a future enhancement, but that is not part of the initial requirement and is not necessary for this feature to be viable.

This keeps the approval model simple, aligned to the existing authority scoping, and consistent with the rest of the system's review patterns without inventing a second escalation framework for a lightweight confirmation gate.

### 1.1d Thesis Chapter Framing — System Design — Ground Crew Mobile Module
The thesis chapter should frame the Ground Crew Mobile Module as a permissioned operations system designed for event-scoped accountability rather than as a generic mobile checklist. The chapter can be structured in four sections:

1. **Role and sub-role rationale**: explain why the module uses five fixed Ground Crew sub-roles instead of a flat account model, and why `InventoryCrew` and `ProductionCrew` are built as distinct on-site operational roles rather than stitched onto the separate WOM managerial pages with the same names. This should include the need for both frontend RBAC configuration and backend claim resolution, because UI permissions alone would create a cosmetic role model while the server-side authorization still had no concept of those sub-roles.
2. **Two operational models: sequential authority vs. claimable work**: explain that the module is not based on a single task architecture. Warehouse and Field operate as a **sequential stage-based model**: work is structured as `Dispatch → Arrival on Venue → Egress → Arrival on Warehouse`, and authority is attached to `ManningAssignment.IsShiftLead` on the active shift-date row. Inventory, Production, and EventAdmin operate as a **claimable work-item model**: work is represented as discrete `GroundCrewTaskPoolItem` records to be claimed, reviewed, and resolved. These are different operational shapes, so a single unified task structure would incorrectly compress the authority-bearing stage transitions of Warehouse/Field into a claimable queue and blur the distinction between event-state authority and item-level work management.
3. **Chain-of-custody design**: explain the confirmed workflow `Dispatch → Arrival on Venue → Egress → Arrival on Warehouse` and describe how stage authority is attached to `ManningAssignment.IsShiftLead` on the active shift-date row, not to a generic account-level role. This explains why the module adds dynamic off-shift and staffing-gap states, why the overnight grace window is bounded, and why the same event can show different operational authority for Warehouse and Field user cohorts on the same day. This section should remain focused on the operational mechanics of the sequential model itself; the Manning-created vs. Crew-created provenance discussion belongs as a short task-pool-internal detail under the claimable-work model rather than here.
4. **Warning and escalation as accountability architecture**: show that the warning system is not a blocking permission layer but a traceable accountability mechanism. Open and escalated flags are policy-backed, logged, and queryable, while bypass actions are audited acknowledgments rather than permission grants. This supports accountability by keeping operational work fluid while preserving a clear record for manager review, HR follow-up, or later incident review.

This framing is important because the module is intentionally designed to separate UI convenience from authorization, operational throughput from governance, and event-local confirmation from cross-role management. It is a mobile operations system with explicit role boundaries and auditability, not a flat task app with ad hoc permissions.

### 1.1e Audit-First Gap Analysis — Architecture Drift and the Cost of Premature Build Assumptions
The original prototype and early planning language materially drifted from the actual implementation once the codebase was audited across both frontend and backend layers. This was not a minor documentation mismatch; it exposed genuine architecture differences. The clearest example was Warehouse. What appeared to be a simple extension of the general Ground Crew assignment model turned out to be a different operational pattern altogether: the legacy Warehouse pages were discrete-assignment screens that encoded a route-based lead/member architecture, whereas the confirmed model required the unified chain-of-custody flow `Dispatch → Arrival on Venue → Egress → Arrival on Warehouse`, with authority attached to `ManningAssignment.IsShiftLead` on the active shift-date row. In other words, the prototype had been modeling a different abstraction than the real event workflow, and the UI was only a surface symptom of that mismatch.

A second design drift appeared in the role model. Early assumptions interpreted the WOM-side `ProductionManagerPage.tsx` and `InventoryOfficerPage.tsx` as if they were the same operational roles as the on-site `ProductionCrew` and `InventoryCrew` sub-roles. The actual codebase showed that those pages belonged to a separate managerial layer and were not interchangeable with Ground Crew execution roles. The correct interpretation required reconstructing `InventoryCrew` and `ProductionCrew` as genuine Ground Crew sub-roles with their own permission tree, claim mapping, and event-scoped logic rather than as reused WOM pages. This distinction matters because the same naming in two different domains can mask entirely different authority structures, and using one as a shortcut for the other would collapse distinct operational models into a single false abstraction.

The audit also showed that several features that appeared to be “just wiring” from the frontend were in fact backend design problems. The Admin configuration UI looked complete from a product perspective, but it lacked any real stored configuration model or enforcement path; task-pool work looked like a simple queue, but the backend had no canonical task entity and required a dedicated `GroundCrewTaskPoolItem` design; incident reporting was being routed into generic `audit_logs`, which recorded system events rather than a structured operational incident lifecycle; and `DamageReport` needed additive stage-tracking fields because the existing schema could not preserve chain-of-custody stage or photo provenance with sufficient fidelity. These were not superficial missing fields; they were structural gaps in the system's data model.

This reveals the core methodological lesson: a build sequence cannot be trusted if it begins from frontend assumptions alone. The value of an audit-first, backend-inclusive process is that it forces each visible artifact — page, role name, admin control, task queue, or form — to be validated against the underlying data model, authorization path, and operational semantics. In a system like Ground Crew, where authority and event-state transitions are policy-bearing and not merely decorative, the difference between a plausible UI and a real operational mechanism is decisive. The audit therefore establishes a broader principle for the thesis methodology: product design must be validated against the current backend schema and authorization logic before a build order is considered stable, because a front-end prototype can easily reproduce the wrong architecture while looking functionally complete.

**Component inventory after audit**:
- **New reusable components still required**: `ChainOfCustodyStepper` (Warehouse/Field stage flow; `GroundCrewPage.tsx`, event detail), `TaskPoolCard` / task-pool panel (Inventory/Production queue; Home + Event Detail), `WarningBadge` (warning/staffing-gap summary; Home + GroundCrewPage + Event Detail), `NotificationBell` (pending action alerting; Home + Event Detail), `ShiftLeadBadge` / `ShiftLeadStatusBadge` helper (dynamic per-assignment lead state; Home + Calendar + GroundCrewPage), `PendingActionsBadge` / `PendingReviewBadge` (crew-task approval signals; Event Detail + EventAdmin summary). These components require backend support from the Phase 3 dispatch read path, Phase 4 config/warning surfaces, and Phase 5 task-pool / incident data model, and they must be driven by current `ManningAssignment` state rather than static role labels.
- **Those that can be refactored without rebuilding**: `PhaseMap` becomes `ChainOfCustodyStepper`, `Home` and `EventDetail` remain shell containers, `DamageForm` remains the shared damage-report form with stage-aware props, `IncidentForm` becomes `IncidentReportForm`, `CalendarView` and `DayDots` remain reusable schedule widgets, `Activity`, `Account`, `OfflineBanner`, and `PinButton` remain shared UI primitives. The real problem is not that the components are wrong, but that their data contracts were under-specified and in some cases their underlying architecture had drifted.
- **Explicitly retired**: `WarehouseLeadPage.tsx` / `WarehouseMemberPage.tsx` are excluded from reuse; they are legacy and replaced by the unified stage flow, not a source of components.

### Retirement + Cutover Plan for Legacy Warehouse Pages
`WarehouseLeadPage.tsx` and `WarehouseMemberPage.tsx` are confirmed for retirement once the replacement pure stage-based chain-of-custody flow in `GroundCrewPage.tsx` is confirmed working against real data once the Phase 3 backend read-access fix lands. This is a controlled cutover, not a hard delete of the working architecture. The key evidence is that the legacy pages are not backed by a dedicated persisted warehouse-task entity: the repo scan found no distinct backend table or entity for `WarehouseTask` / `WarehouseAssignment` / `LegacyWarehouseAssignment` tied to historical warehouse assignment records. The live page data lives in the local mock store in `src/lib/warehouse.tsx` (`WarehouseEvent`, `WarehouseTask`, `CrewMember`, `ActivityEntry`, `ProductionJob`, `initialTasks`), while the real production data the system relies on is the canonical backend model (`ManningAssignment`, `Event`, `Asset`, `Dispatch*`, `audit_logs`, `DamageReport`). Because the old pages are a UI shell over mock/demo state and not a historical record source, there is no real one-time migration to preserve from the pages themselves; the migration requirement is instead to validate the replacement against the canonical backend records before cutover.

The migration/verification order should be:

1. **Backend read-access fix first**: resolve the Ground Crew read path to real event/dispatch/manifest data (`GET /api/dispatch/event/{eventId}/...` or equivalent Ground Crew-scoped access), because without the real data model the new stepper cannot be validated against actual event conditions.
2. **Build the unified stage-based flow in `GroundCrewPage.tsx`**: implement the chain-of-custody path `Dispatch → Arrival on Venue → Egress → Arrival on Warehouse` and tie it to `ManningAssignment.IsShiftLead` + the active shift-date row, not to a legacy page/route distinction.
3. **Verify in parallel with the old pages still live**: run functional parity checks on the same event data set for both flows, comparing stage visibility, read-only vs. editable states, shift-lead gating, staffing-gap behavior, dispatch-stage transitions, and damage/incident filing. This should include the same user roles and same event roster in both versions to catch logic drift instead of only checking the happy path.
4. **Clean cutover only after parity approval**: once the replacement UI is validated against real data and the old pages are no longer needed for fallback, switch the main navigation and event entry points to the new `GroundCrewPage.tsx` flow and keep the old pages behind a temporary fallback flag or hidden route for a short validation window.
5. **Remove the legacy pages last**: only after the replacement is validated and the rollback path is known good should `WarehouseLeadPage.tsx` and `WarehouseMemberPage.tsx` be removed from the route tree and bundle. This ensures there is never a day when neither version works.

**Functional parity checks**:
- same user is assigned the same event, same day, same sub-role in both versions;
- same warehouse/field stage values render with the same labels and same step availability;
- shift-lead gating behaves identically for `IsShiftLead = true` vs. false;
- staffing-gap flow remains the same, including read-only stepper behavior when no valid lead exists;
- damage and incident reporting remain available regardless of stage-lead coverage;
- alert banners for off-shift vs. staffing gap appear with the same semantics in both shells;
- dispatch-stage transitions write to the same canonical backend records and preserve the same audit trail.

**Data migration vs. clean cutover**:
- There is no mandatory one-time migration of operational data for the legacy warehouse pages because the pages themselves do not hold the canonical record source and no distinct backend warehouse-task entity was found for them.
- Any local-only UI state or page-specific temporary flags should be treated as disposable and intentionally not ported, because they are not canonical operational records.
- The safe rule is: preserve canonical event state in the backend, discard local UI-only state, and derive the new UI from the canonical records instead of a custom migration from the old pages.

This keeps the retirement scoped to the presentation layer and avoids creating a second system-of-record during the transition. The old pages are retired as a legacy shell only after the new stage model is proven to reflect the same real operational truth.

### 1.1f Thesis Defense Justifications — Decision-Level Rationale
The following short justifications are suitable for a thesis defense and should be read as the design rationale behind the key architecture decisions:

1. **Minimum of 1 Team Lead per sub-role — corrected scope**: The finalized live requirement is not a blanket rule of one Team Lead per sub-role across all five Ground Crew roles. For `WarehouseCrew` and `FieldCrew`, the operative rule is **at least one active `IsShiftLead` on the current shift-date** for the stage-gated operational path; without that lead, staffing-gap rules block stage transitions. For `InventoryCrew`, `ProductionCrew`, and `EventAdmin`, there is no live shift-lead gating and no current requirement to maintain a Team Lead quota under the `IsShiftLead` model. The earlier "Number of Team Leads allowed: 0 / 1 / 2" setting is a legacy admin quota artifact and should not be presented as active doctrine in the current architecture.
2. **Separate task pool vs. chain-of-custody models**: The system separates sequential stage authority from claimable work because they are not the same kind of operational process. Warehouse and Field are governed by state transitions and authority-bearing stages, whereas Inventory, Production, and EventAdmin are structured as discrete work items to be claimed and resolved; a single model would flatten materially different operational semantics and misrepresent where authority actually resides.
3. **15-minute default edit window after dispatch settlement (not implemented in current code)**: No live `EditWindowMinutes` field, config storage, or enforcement hook was found in the current frontend/backend audit. This remains a proposed policy rather than a verified live rule, and it should not be cited as a current implementation fact.
4. **48-hour Team Lead confirmation override rule (prototype SLA only)**: The current codebase does include a real 48-hour escalation SLA in its manning/ground-crew UI and helper logic (`src/lib/manning.ts`, `src/lib/ground-crew-declarations.ts`, `src/pages/GroundCrewPage.tsx`, `src/pages/ManningPage.tsx`), but it is not a server-backed Team Lead override authority and not equivalent to `ManningAssignment.IsShiftLead` stage-transition permission. The live behavior is descriptive SLA warning and escalation, not a formal backend override permission path.
5. **Retiring legacy Warehouse Lead/Member discrete-task pages**: The legacy Warehouse pages are replaced because they encode the wrong abstraction for the actual work flow. Warehouse and Field are both event-state systems rather than generic discrete task lists, so a unified chain-of-custody model better matches operational reality and improves both mental model consistency and auditability.
6. **Building Inventory/Production as new backend-supported sub-roles**: This avoids conflating event execution with back-office WOM management. The same names can appear in different domains, but the Ground Crew version must be backed by live event permissions and server-side claims; otherwise the role model remains cosmetic and fails to reflect the actual authority boundaries of the workflow.
7. **Per-assignment IsShiftLead flag on ManningAssignment instead of a permanent account-level Lead role**: A per-assignment flag reflects that event leadership is a rotating operational condition, not a fixed identity label. Crew members are not permanently assigned leadership by account; they are assigned leadership by shift, by event, and by the specific domain in which they are working, which is precisely how operational staffing actually rotates.

**Legacy Team Lead quota setting — resolved as superseded**: The earlier admin config for "Number of Team Leads allowed: 0 / 1 / 2" still exists in the current codebase in `AdminRolesPage.tsx` and the RBAC quota model (`minTeamLeads` / `maxTeamLeads`), but it is not the current source of truth for operational authority. The live authority model is `ManningAssignment.IsShiftLead` plus the staffing-gap rule for Warehouse/Field stage transitions. For the current 5-sub-role architecture, that means the live operational requirement is: a valid active `IsShiftLead` for the relevant shift-date on Warehouse/Field; no equivalent live stage-lead requirement for Inventory/Production/EventAdmin, because they do not participate in the stage-gated authority model. This older quota setting should therefore be treated as legacy/admin-compatibility configuration, not as an active design principle to cite in future prompts or thesis writing.

**Phase 2 deprecation rule — Team Lead quota UI removal**: The legacy Team Lead quota selector is intentionally removed from the live admin surface in Phase 2, not left visible-but-disabled. This is a deliberate deprecation step because the correct live authority model is per shift-date via `ManningAssignment.IsShiftLead`, and a stale quota widget would continue to communicate a now-invalid rule while Phase 3's actual gated Warehouse/Field UI is still under construction. The replacement is a passive explanatory note in the same area: "Lead authority is assigned per shift-date via the event roster and `IsShiftLead`; legacy quotas are deprecated and no longer enforced." This means Phase 2 removes both the active control and any enforcement behavior. It does not leave a read-only selector for the old value as a functional UI artifact; if historical continuity is needed, that information should remain in logs or spec documents, not in the active admin surface. A config-backed replacement, if product later wants one, is not part of this Phase 2 change and should wait until the real Shift Lead model is live in Phase 3 and any config-governed policy is intentionally introduced in Phase 4.

**API contract decisions — resolved live-vs-missing endpoints**:
- **Live today**: `/api/auth/login`, `/api/auth/set-pin`, `/api/auth/verify-pin`, `/api/auth/has-pin`, `/api/damage-reports` (full CRUD + sign-off), `/api/dispatch/asset/{id}/status`, `/api/events`, `/api/assets` (read), `/api/manning`, `/api/offline-sync`, `/api/reservations`, and `/api/deficit-queue` are the canonical live contracts. These are the actual backend contracts to extend or reference; Ground Crew-specific logic should fit into them rather than invent a second app-specific layer unless a real new entity is required.
- **Phase 3 missing contract**: add a Ground-Crew-accessible manifest/batch read endpoint, canonical design `GET /api/ground-crew/manifest?eventId={eventId}` (or equivalent event-scoped manifest route). Response shape: `{ eventId, eventName, currentStage, assets: [{ assetId, sku, displayName, currentState, reservationStatus, stage, lastUpdatedAt, location, batchId? }] }`. It reads existing `Event`, `Asset`, `Reservation`, and dispatch-stage data; it does not require a new persisted entity beyond the view model. Required role/claim: event-scoped Ground Crew membership for the event, plus the backend check that the caller is rostered on that event and is in the correct sub-role domain for the requested stage.
- **Phase 4 missing contract**: add `GET /api/ground-crew/config` and `PUT /api/ground-crew/config`. Response/request shape: `{ taskCreationEnabled, noteRequired, editWindowMinutes, warningThreshold, bypassPermissionRole, ... }`. This reads/writes the new `GroundCrewConfig` entity. Required role/claim: `EventAdmin` or equivalent config-admin claim (`GroundCrew_ConfigRead` / `GroundCrew_ConfigWrite`), with Admin-only gating.
- **Phase 5 missing contract**: add `GET /api/ground-crew/task-pool/event/{eventId}` and `POST /api/ground-crew/task-pool/{id}/declare` for the new `GroundCrewTaskPoolItem` entity. `GET` returns the event's task-pool list with provenance, status, and review metadata; `POST` updates a task's claim/ownership state for the active crew member. Required role/claim: any authenticated Ground Crew member assigned to the event may declare/claim a task, while `EventAdmin` and managers may review and approve `PendingReview` tasks. Canonical claim names, if used, are `GroundCrew_TaskPoolDeclare` and `GroundCrew_TaskPoolReview`.
- **Incident endpoint decision**: use a dedicated `IncidentReport` entity with endpoints such as `GET /api/ground-crew/incidents/event/{eventId}` and `POST /api/ground-crew/incidents`, plus a `PATCH /api/ground-crew/incidents/{id}/status` route. This reads/writes the first-class `IncidentReport` entity, not generic `audit_logs`. Required role/claim: any active Ground Crew member on the event can submit; `EventAdmin` / Manning can review and close. Response includes `id`, `eventId`, `occurredAt`, `submittedAt`, `reporterUserId`, `recipient`, `status`, `title`, `description`, `priority`, `attachmentUrls`, and the audit metadata.
- **Shift-lead mutation decision**: `IsShiftLead` is read via the existing `ManningAssignment` endpoints (`GET /api/manning/event/{eventId}` and `GET /api/manning/user/{userId}`) and should be written through a dedicated `PATCH /api/manning/{id}/shift-lead` toggle rather than by overloading `POST /api/manning/assign` or `DELETE /api/manning/{id}`. The lifecycle remains: create assignment row via `POST /api/manning/assign`, remove via `DELETE /api/manning/{id}`, and toggle the boolean via `PATCH /api/manning/{id}/shift-lead` with `{ isShiftLead: true|false, changedByUserId, reason? }`; the response is the updated `ManningAssignment` row. This keeps the boolean mutation attached to the exact assignment row and is the cleanest place to enforce the audit-log demote/promote workflow.

### 1.1g Antigravity build checklist by phase (confirmed execution order)

**Phase 1 — Nav/shell restructure + confirmation bug fix + login relabel**
- Frontend: restructure Ground Crew navigation and shell; fix the confirmation-authority bug; relabel login copy to Email / Password; strip stale Crew ID / attendance framing.
- Backend: no schema changes required; confirm the existing auth contract still matches the relabeled UI.
- Acceptance criteria: Ground Crew login and navigation no longer use legacy Warehouse wording or stale attendance framing; confirmation surfaces are event-scoped and correct.

**Phase 2 — RBAC + backend sub-role claims**
- Frontend: update the role tree and Admin UI to the 5 fixed sub-roles, map backend wire values via `GROUND_CREW_SUBROLE_MAP` in `rbac.ts`, and remove stale Team Lead quota logic/controls from the live admin surface.
- Backend: `JwtService.cs` emits canonical `ground_crew_subrole` claim containing one of 5 wire values (`Warehouse`, `Field`, `Inventory`, `Production`, `EventAdmin`). Shift-lead claims (GroundCrew_WarehouseShiftLead / GroundCrew_FieldShiftLead) are deferred to Phase 3, when ManningAssignment.IsShiftLead exists.
- Acceptance criteria: frontend and backend use canonical wire vocabulary (`ground_crew_subrole`); no UI-only role names; shift-lead claim emission is deferred to Phase 3 alongside DB `ManningAssignment.IsShiftLead` enforcement.

**Phase 3 — Batch/dispatch read access + Warehouse/Field chain-of-custody rebuild + shift-lead gating**
- Frontend: rebuild the Warehouse/Field flow inside `GroundCrewPage.tsx` as a stage-based chain-of-custody; render controls only for authorized shift leads; differentiate off-shift and staffing-gap states.
- Backend: add or open the Ground Crew-scoped batch/manifest read path; enforce `ManningAssignment.IsShiftLead` server-side on stage transitions and validate the overnight grace window.
- Acceptance criteria:
  - `DispatchService.UpdateAssetStateAtomicAsync` currently has zero role-based authorization — confirmed via live code: it validates only the legal state-transition matrix and writes an audit log. Any authenticated user can currently move any asset through any state via `POST /api/dispatch/asset/{assetId}/status`, regardless of role, sub-role, or `IsShiftLead` status. This is net-new enforcement to build, not an existing check to strengthen or fix. The Phase 3 backend task must add: (1) a `ManningAssignment` lookup keyed to `(EventId, actorId, effective ShiftDate)`, (2) an `IsShiftLead == true` check on that row, (3) a sub-role match between the caller's `ground_crew_subrole` claim value and the transition's domain (`Warehouse` wire value for T1/T4, `Field` wire value for T2/T3), and (4) rejection of cross-domain attempts (e.g. a `Warehouse`-subrole lead invoking a Field-only transition) with `403 Forbidden`. Treat this as the highest-priority item in Phase 3 — it's the authorization gap the entire chain-of-custody model currently has no protection against. **Note**: `copilot-phase-prompts.md` (Downloads, line 144) still uses spec display names `WarehouseCrew`/`FieldCrew` in this check — that file is outside this repo and must be updated manually to the wire vocabulary `Warehouse`/`Field` before Phase 3 is prompted.
  - No 403 prevents Ground Crew from reading needed event data.
  - Stage transitions fail server-side unless the current user is the designated shift lead on the active shift-date row.
  - Legacy Warehouse pages are retired only after parallel verification against real data.

**Phase 4 — Live Admin config wiring**
- Frontend: replace hardcoded Ground Crew policy values with live values from `GroundCrewConfig` in the Admin UI.
- Backend: add `GroundCrewConfig` entity + `GET` / `PUT` controller and persist policy values in the database.
- Acceptance criteria: config changes persist and are reflected in the live app after reload; no policy is still effectively hardcoded in the active flow.

**Phase 5 — Task-model rebuild + damage and incident schema work**
- Frontend: build the Inventory/Production task-pool UI on the real `GroundCrewTaskPoolItem` model; add the crew-created task review flow and review badges; extend damage reports and incident forms to include the required metadata.
- Backend: add `GroundCrewTaskPoolItem` entity + controller; add the `DamageReport` stage and photo provenance fields; implement the `IncidentReport` entity decision with proper submission/occurrence timestamps and status lifecycle.
- Acceptance criteria: the task pool is a real backend-backed model rather than a mock queue; reports retain the metadata required for operational accountability; the incident flow uses a first-class operational record instead of a generic audit-only payload.

This is the confirmed Antigravity execution scope and should be treated as the canonical sequencing document for all future implementation work.

### 1.2 Home Screen Badge Logic
- `WarehouseCrew`: `WAREHOUSE • SHIFT LEAD` (gold/amber) if active shift lead today, else `WAREHOUSE • CREW` (slate).
- `FieldCrew`: `FIELD • SHIFT LEAD` (gold/amber) if active shift lead today, else `FIELD • CREW` (slate).
- `InventoryCrew`: always `INVENTORY • CREW`.
- `ProductionCrew`: always `PRODUCTION • CREW`.
- `EventAdmin`: always `EVENT ADMIN`.
- **Off-Shift state** (not rostered for today — see §2.3): `OFF-SHIFT • NOT ROSTERED TODAY (date)`, slate.

Home screen remains a **read-only orientation dashboard** across all sub-roles — summary cards with deep links out to Event Detail / Task Pool screens; no state mutation happens on Home.

### 1.3 Event Admin Vacancy Rule — Resolved
The `EventAdmin` sub-role is a hard-required role for an active event and can never be vacant. If a manager attempts to remove or reassign the only currently tagged `EventAdmin` for an event without first selecting a replacement, the action must be blocked.

**Validation in `AdminRolesPage.tsx`**:
- On save or remove, validate whether the action would leave the event with zero assigned `EventAdmin` users.
- If it would, show a blocking validation message and disable the action rather than allowing a temporary empty state.
- The message should clearly say: **"An active event must always have at least one Event Admin. Choose a replacement before removing the current one."**
- The replacement must already be a valid user eligible for the event or an explicit reassignment target; the UI should not allow the user to “remove and then assign later” as a one-step operation.

**Confirmation flow**:
- Preferred UX: a confirmation modal if the user is replacing the current `EventAdmin` with a different person.
- The modal should state that the current Event Admin will be replaced, that the event must retain one active admin at all times, and that the reassignment is a two-step change with an audit trail.
- The save should only be committed if a valid replacement is chosen in the same flow. If no replacement is selected, the save remains disabled and the field stays invalid.

This is a hard product rule, not a soft warning. It prevents the system from entering an invalid state in which there is no designated Event Admin for an active event.

---

## 2. Shift Assignment Model — `ManningAssignment`

### 2.1 Granularity: Per Shift Date, Not Per Event
`ManningAssignment` is **one row per user per assigned shift date per event** — not a single aggregate row per event assignment.

Confirmed entity fields:
- `Guid Id`
- `Guid EventId`
- `Guid UserId`
- `string RoleName` (sub-role)
- `DateTime ShiftDate`
- `TimeSpan? ShiftStartTime`
- `TimeSpan? ShiftEndTime`
- `bool IsShiftLead`

A 3-day event with a crew member working all 3 days produces 3 separate rows. `IsShiftLead` is scoped to the individual row — a user can be lead on Friday and standard crew on Sunday.

### 2.2 Provisioning & Uniqueness Rules
- **Bulk date-range assignment** with `IsShiftLead = true` propagates the flag to every generated row in the range.
- **Single-day overrides** remain independently editable per row.
- **Uniqueness**: exactly one active `IsShiftLead = true` row per `(SubRole, EventId, ShiftDate)`.
- **No auto-demotion.** Setting `IsShiftLead = true` where an active lead already exists for that combination is **rejected** (`400`, explicit validation error). Reassignment is an explicit two-step manager action: demote outgoing → promote incoming. Every promotion/demotion writes an `AuditLog` entry (manager, target user, event, shift date, timestamp).
- **Terminology standard**: describe `IsShiftLead` scope as **"per shift" / "per shift date"** — never "per event" — in all future specs.

### 2.3 Zero-Lead Staffing Gap — Resolved
If an event has **zero** `WarehouseCrew` rows with `IsShiftLead = true` for the active shift date, the system should treat it as a **Warehouse shift-lead gap** and block all Warehouse Stage 1/4 execution for that shift until a valid lead is assigned. If an event has **zero** `FieldCrew` rows with `IsShiftLead = true` for the active shift date, it is treated as a **Field shift-lead gap** and blocks all Field Stage 2/3 execution until a valid lead is assigned.

**Operational behavior**:
- The event's chain-of-custody stepper stays read-only and all stage transition controls are hidden/disabled while the gap remains open.
- The gap is visible to **all rostered crew on that event/stage** via a non-modal banner in the active Ground Crew shell, with a warning color and explicit wording: **"Warehouse shift lead missing"** or **"Field shift lead missing"** for the active shift date.
- Manning/Admin keep the additional assignment affordance (`Assign shift lead now`) and roster controls; base crew see informational copy only: **"No active shift lead is assigned for this stage yet."**
- The system does **not** block damage or incident filing for crew members; those actions remain operationally available regardless of lead coverage.
- The rule applies only to warehouse/field shift-date authority. `InventoryCrew`, `ProductionCrew`, and `EventAdmin` are not in scope for this requirement because they have no shift-lead tier.

**Reassignment flow**:
- Re-flagging a different assigned crew member as shift lead is an explicit manager action in the Manning/Admin roster flow.
- The target user must already be assigned to the same `(EventId, ShiftDate)` and same sub-role.
- The outgoing lead is demoted first, then the incoming lead is promoted, and both actions are audit-logged.
- If no lead exists at all for that sub-role on that shift date, the new assignment is allowed immediately after validation and is not treated as an "absent TL" emergency workaround; it is just the ordinary fill of a same-day staffing gap.

### 2.4 Off-Shift vs. Staffing Gap — UI Differentiation
The two states must be visually distinct, even though both produce a read-only stepper.

- **Off-shift**: no `ManningAssignment` row for the logged-in user on the active date. This is the normal, expected state. Show a neutral slate status such as **`OFF-SHIFT • NOT ROSTERED TODAY (date)`** with no warning banner.
- **Staffing gap**: the user is rostered, but the event has no valid `IsShiftLead = true` row for the relevant stage/date. This is an operational exception. Show a visible warning banner in amber/red with copy like **"Warehouse shift lead missing"** or **"Field shift lead missing"**, plus a short explanatory line for crew members: **"No active shift lead is assigned for this stage yet."**

This distinction is intentional: the off-shift state is merely a normal non-assignment state, while the staffing-gap state is an actionable operational issue that needs Manning/Admin attention. The base crew view needs the explanation because a locked stepper without context is confusing; it should not be hidden behind a manager-only alert.

### 2.5 Off-Shift State (No Assignment Row for Today)
If a user opens the app on a date they have no `ManningAssignment` row for:
- `isRosteredToday = false`, `isShiftLead = false` (explicit fallback, no null-reference exceptions).
- Chain-of-Custody stepper: fully read-only across all 4 stages, all write controls hidden/disabled.
- Damage & Incident filing: **remains active** — off-shift presence on-site doesn't block reporting.

---

## 3. Event Detail — Authority Matrix

| Sub-Role | Shift Context | Stage 1: Dispatch | Stage 2: Venue Arrival | Stage 3: Egress | Stage 4: WH Return | Damage/Incident | Task Pool Focus |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| `WarehouseCrew` | ShiftLead active | **ACTIVE** | Read-Only | Read-Only | **ACTIVE** | **ACTIVE** | Event Staging Tasks |
| `WarehouseCrew` | ShiftLead inactive | Read-Only | Read-Only | Read-Only | Read-Only | **ACTIVE** | Event Staging Tasks |
| `FieldCrew` | ShiftLead active | Read-Only | **ACTIVE** | **ACTIVE** | Read-Only | **ACTIVE** | On-Site Setup Tasks |
| `FieldCrew` | ShiftLead inactive | Read-Only | Read-Only | Read-Only | Read-Only | **ACTIVE** | On-Site Setup Tasks |
| `InventoryCrew` | Standard | Read-Only | Read-Only | Read-Only | Read-Only | **ACTIVE** | Type A Inventory Pool |
| `ProductionCrew` | Standard | Read-Only | Read-Only | Read-Only | Read-Only | **ACTIVE** | Type A Production Pool |
| `EventAdmin` | Standard | Read-Only | Read-Only | Read-Only | Read-Only | **ACTIVE** | Event Confirmation |

Damage/Incident filing is **always active for every sub-role**, regardless of `IsShiftLead` status, shift-date assignment, or off-shift state. This is a structurally separate authorization path from stage-transition authority and does not interact with the shift/grace-window model at all.

---

## 4. Chain-of-Custody State Machine

### 4.1 States & Transitions
```
PreDispatchStaging → [T1] → Dispatch → [T2] → ArrivalOnVenue → [T3] → Egress → [T4] → ArrivalOnWarehouse → Completed
```

| Transition | Trigger Role (IsShiftLead=true) | Endpoint | Mandatory Photo Trigger |
|---|---|---|---|
| T1: Dispatch Release | `WarehouseCrew` | `POST /api/dispatch/asset/{assetId}/status` (live route, but no live shift-lead enforcement yet) | Stalled / pre-existing damage |
| T2: Venue Receive | `FieldCrew` | `POST /api/dispatch/asset/{assetId}/status` (live route, but no live shift-lead enforcement yet) | Transit damage / unload shortage |
| T3: Egress Release | `FieldCrew` | `POST /api/dispatch/asset/{assetId}/status` (live route, but no live shift-lead enforcement yet) | Teardown damage / pack shortage |
| T4: Return Intake | `WarehouseCrew` | `POST /api/dispatch/asset/{assetId}/status` (live route, but no live shift-lead enforcement yet) | Inbound return damage / missing items |

> Open item / not yet verified live: the shared asset-status route is real and live, but the current backend implementation does not contain the required `ManningAssignment` lookup, `IsShiftLead == true` check, or `WarehouseCrew` vs `FieldCrew` role gating before mutating `Asset.AssetState`. The method currently only validates a state matrix and writes an audit log. That means the route is active, but the authorization enforcement is not yet implemented in code and must be treated as a missing Phase 3 backend task. There is still no live `POST /api/dispatch/event/{id}/status` route, and any future event-level route must be designed as a new contract that enforces the same `IsShiftLead` + sub-role checks on the effective shift-date row.

### 4.2 Dual-Layer Authorization
- **Client (render-time gating)**: active controls render only when `SubRole` matches AND `ShiftDate == Today` (or within grace window, §5) AND `IsShiftLead == true`.
- **Server (mandatory, prevents client bypass)**: this is currently an unimplemented requirement. The live route `POST /api/dispatch/asset/{assetId}/status` does not currently query `ManningAssignment`, does not check `IsShiftLead == true`, and does not validate `WarehouseCrew` vs `FieldCrew` before changing the asset state. The correct Phase 3 implementation must: (1) resolve the caller's assignment row on the effective shift-date, (2) verify `IsShiftLead == true`, (3) verify `RoleName` matches the target transition's domain (`WarehouseCrew` for T1/T4, `FieldCrew` for T2/T3), and (4) reject cross-domain attempts with `403 Forbidden` or equivalent server validation. Until that check is present in code, this should be treated as an open backend item, not a confirmed-live protection.

### 4.3 Stage 1 Dispatch Flow Detail
- **Prerequisite**: `WarehouseCrew` + `IsShiftLead == true` on the active assignment row. Non-lead `WarehouseCrew`, all `FieldCrew`, and `EventAdmin` cannot initiate swipe-verify / count-declare / release sign-off.
- **Screen states**: (1) Batch List with swipe-verify/swipe-stall gestures → (2) Per-Item Count Declaration (stepper, condition selector, camera) → (3) Review & Double-Check (verified vs. stalled summary, deficit banners) → (4) Final Dispatch Modal (departure time, outbound seal, **Shift Lead Sign-Off PIN**, confirm → `POST /api/dispatch/asset/{assetId}/status`).
- **Offline resilience**: unsubmitted draft swipes, count adjustments, photo blobs persist in IndexedDB via `src/lib/offlineQueue.ts`; `src/lib/offlineReplay.ts` flushes queued payloads idempotently on reconnect.

### 4.4 Damage-Report Linkage (Two Compatible Pathways, One Table)
- **Pathway A — Independent Crew Filing**: any sub-role, any time, any `IsShiftLead` status. Creates a `DamageReport` with `Stage` = event's current stage.
- **Pathway B — Shift Lead Transition Precondition**: during a stage-transition review, the Shift Lead either **links an existing Pathway-A report** (no duplicate capture) or **creates a new one on the spot** if none exists.
- Both pathways write to the same `DamageReport` table; the `Stage` column (Phase 5 addition) preserves traceability with no duplication.

---

## 5. Overnight Shift Boundary — Grace Window

### 5.1 Problem
Strict `ShiftDate == Today` equality locks out a Shift Lead at midnight mid-shift (e.g., a Friday-evening shift losing Stage 3/4 authority at 12:01 AM Saturday).

### 5.2 Resolution: Dynamic-Cutoff Grace Window
- An outgoing Shift Lead's authority extends past midnight, capped at **`min(06:00 AM, nextShift.ShiftStartTime)`**.
- This guarantees **zero overlap**: the outgoing lead's authority terminates the instant the incoming lead's shift starts, or at 6:00 AM, whichever is earlier.
- **Early handoff override**: if the incoming lead completes a transition early, that action immediately terminates the outgoing lead's grace window.
- **The 6:00 AM ceiling is a hard, intentional limit — not auto-extended.** Rationale: an unbounded "extend until relieved" rule would let a lead who finished at 11:00 PM retain sign-off authority until 10:00 AM the next day if a replacement was scheduled late — a worse outcome than a bounded, visible gap.

### 5.3 Coverage Gap (When Next Shift Starts After 6:00 AM)
The dynamic cutoff can produce a coverage **gap** (not overlap) when the incoming lead's scheduled start is later than 6:00 AM — nobody holds active authority in between.

- **Primary defense — scheduling convention (soft, documented, not code-enforced)**: when a prior shift runs overnight, the incoming lead's `ShiftStartTime` should be scheduled no later than **05:45 AM Asia/Manila**, so the dynamic cutoff resolves to the next shift's start (always ≤ 6:00 AM) and the gap never materializes under correct rostering.
- **If a gap occurs anyway** (scheduling error), resolution hierarchy:
  1. **Wait** — default/preferred for non-time-critical returns.
  2. **Manning reschedule** — a manager creates/updates a `ManningAssignment` row moving the incoming lead's `ShiftStartTime` earlier into the gap window. This is the sole active-intervention path (see §5.5 — `EphemeralPermission` was evaluated and rejected for this use case).
- **Not permitted**: automatic re-authorization of the prior day's lead for the gap window. Any extension requires a new/updated `ManningAssignment` row with a full audit trail.

### 5.4 Timezone Standard
- **Single Operations Timezone**: `Asia/Manila` (UTC+8), fixed, server-side.
- `ShiftDate`, `ShiftStartTime`/`ShiftEndTime`, and the grace-window boundary are all stored and evaluated in `Asia/Manila` local time on the backend.
- Client device clock/timezone has **no influence** on server-side authorization decisions.
- If Lumière ever expands to multi-timezone operations, venue-timezone-based evaluation would need to be separately scoped — not assumed under the current single-timezone standard.

### 5.5 `EphemeralPermission` — Evaluated and Ruled Out for Gap Coverage
- **Confirmed real, production entity** (`Lumiere.Core/Entities/EphemeralPermission.cs`), with fields `Id`, `UserId`, `TempRoleId` (FK to `Role`), `StartTimestamp`, `EndTimestamp`, `AuthReason`, `GrantedBy`, audit timestamps — plus a full runtime pipeline (`EphemeralClaimsTransformation`, `EphemeralPermissionMiddleware`, `EphemeralExpiryAuditWorker`).
- **Why it doesn't fit the gap use case**: it grants authority via role-claim injection (`TempRoleId`), which flows through `[RequireRole(...)]` policies — but the dispatch endpoint's Phase 3 authorization check evaluates `ManningAssignment.IsShiftLead`, a completely separate path. An `EphemeralPermission` grant alone would **not** pass the dispatch endpoint's check.
- **Resolution**: gap coverage uses the **Manning reschedule** path exclusively (§5.3, Option 2), since it goes through the same authorization path as every other shift lead, with no bespoke carve-out needed in the dispatch endpoint. `EphemeralPermission` remains reserved for its existing use cases (e.g., WOM self-validation, admin-bypass scenarios) — using it for dispatch-transition authority would require an explicit, separately-scoped Phase 3 decision, not an assumed drop-in.

### 5.6 Grace Window Scope — Explicit Boundaries
- Applies **only** to `IsShiftLead`-gated stage-transition authority: `WarehouseCrew` Stage 1/4, `FieldCrew` Stage 2/3.
- **Does not affect** damage/incident filing (always-on for all 5 sub-roles, §3).
- **Does not apply to** `InventoryCrew`, `ProductionCrew`, `EventAdmin` — none of these have `IsShiftLead`-gated actions, so the shift-date/grace-window concept doesn't interact with them at all.

---

## 6. Warning & Escalation System

### 6.1 Policy Layer — `GroundCrewConfig` (Phase 4)
| Field | Type | Purpose |
|---|---|---|
| `WarningThreshold` | `int` | Max accumulated warnings before escalation |
| `WarningWindowDays` | `int` | Rolling accumulation window |
| `BypassPermission` | `string` | Role authorized to bypass (typically `EventAdmin`) |
| `NoteRequiredOnWarning` | `bool` | Whether crew must supply a written note |
| `EditWindowMinutes` | `int` | Amendment window for a logged warning |

### 6.2 Event Log — `GroundCrewWarningLog`
One row per warning **or** bypass event. Key fields: `CrewUserId`, `IssuedByUserId`, `EventId?`, `AssignmentId?`, `WarningType` (`"Standard"` | `"Bypass"`), `Reason`, `CrewNote?`, `OccurredAt`, `IssuedAt`, `IsEscalated`, `OfficeFlagId?`, `Status` (`Active`/`Acknowledged`/`Amended`/`Dismissed`), `AmendedAt?`, `AmendedByUserId?`.

### 6.3 Count Accumulation — Computed, Not Stored
No running-total column. Count is computed at query time:
```
CrewUserId == target
AND IssuedAt >= (Now - WarningWindowDays)
AND Status != "Dismissed"
AND WarningType == "Standard"
```
Evaluated on: new warning creation (post-save), and on Event Detail / Home screen load (live badge, no manager action required).

### 6.4 Escalation Flag — `GroundCrewOfficeFlagRecord`
Separate entity, own lifecycle (`Open`/`Meeting Scheduled`/`Resolved`/`Dismissed`). Created when computed count ≥ `WarningThreshold`. Persists independently of the warning rows that triggered it — amending/dismissing a warning does not auto-close the flag.

**Functional effect (confirmed)**: an Open flag is a **notification/HR-routing mechanism only — it has no PWA-side enforcement effect.** It does not block task claims, damage filing, stage participation, roster login, or `IsShiftLead` eligibility. It surfaces to `EventAdmin`/managers in the Manning/roster view to prompt an off-app conversation.

**Uniqueness enforcement**: a **database-level partial unique index** on `GroundCrewOfficeFlagRecord(CrewUserId)` where `Status IN ('Open','Meeting Scheduled')` — not application-level check-then-write alone. On a constraint violation, the application treats it as confirmation an open flag already exists, links the new warning to that existing flag, and returns success (no duplicate flag, no unhandled exception, no silent no-op).

### 6.5 Bypass Events — Corrected Definition
A bypass is **not** a permission grant or state-unlock (there's nothing to unlock — see §6.4). It is a **formal, audited acknowledgment** by an authorized manager (role = `BypassPermission`) that a flagged crew member is being knowingly cleared to continue normal duties despite an unresolved flag.

- Recorded as `GroundCrewWarningLog` with `WarningType = "Bypass"`.
- **Can only be created against an existing Open/Meeting-Scheduled flag** — there is no preemptive/"threshold proximity" bypass. `OfficeFlagId` is a true mandatory, non-nullable FK for bypass records.
- Bypass rows never contribute to the `Standard` accumulation count (query filters `WarningType == "Standard"`).
- `Reason` is mandatory, non-blank, on bypass records — the audit trail answers "who authorized this, and why."

### 6.6 Manning Daily Review Surface — Decision
For Manning's operational need to catch **unconfirmed Team Lead tasks quickly**, the primary surface should be **Option B: a dedicated Daily Review report screen**, with a compact summary badge/link retained on the Home / Calendar surface for quick entry.

**Comparison of the two approaches**:
- **Option A — Expandable per-date section inside Home/Calendar**
  - **Pros**: contextual, keeps review near the day view, low friction for casual browsing.
  - **Cons**: easy to bury under a dense calendar or mixed event summaries; less efficient for fast triage; harder to scan all overdue/unconfirmed TL items at a glance.
- **Option B — Standalone Daily Review screen**
  - **Pros**: purpose-built for triage; easier to sort/filter by status/date; faster for Manning to spot unconfirmed TL tasks and act immediately; better for escalation workflows and audit-read behavior.
  - **Cons**: requires one extra tap/navigation step, so it should not be the only visible cue.

**Decision**: use **Option B as the primary management surface**, and keep a small count pill or summary card on the Home/Calendar screen that deep-links to the Daily Review report. This preserves context without sacrificing the speed and clarity Manning needs when the objective is rapid catch-up and escalation.

### 6.7 Manning Daily Review Terminology — Resolved
The phrase **"unconfirmed Team Lead tasks"** is not shorthand for the `ManningAssignment.IsShiftLead` flag. That field is a per-shift-date authorization concept under §2.1–2.2: it determines who holds stage-transition authority for Dispatch / Egress / etc. on a specific event-date, and it is governed by promotion/demotion rules and no-auto-demotion logic. It is not a task queue and does not represent a pending task awaiting confirmation.

The phrase maps instead to **task-pool items that have not yet received Team Lead confirmation/sign-off**, i.e. the Phase 5 `GroundCrewTaskPoolItem` concept. This is a separate concept from shift-lead status and should not be conflated with `IsShiftLead`.

**Implication for sequencing**:
- The shift-lead roster/coverage concern is a separate Manning issue and can be surfaced independently from the Daily Review queue.
- The Daily Review screen cannot show real data for the task-confirmation use case until the Phase 5 `GroundCrewTaskPoolItem` model is built and live. Until then, the view is a placeholder or a future-state surface, not a currently populated operational workflow.

**Terminology rule**: in future wireframes and product copy, prefer **"task confirmation queue"** or **"pending TL confirmation"** when referring to the task-pool concern, and use **"shift lead / IsShiftLead"** when referring to stage-transition authority. The combined phrase "Team Lead tasks" should not be used as a generic label for both concepts.

### 6.8 Daily Review Build Sequencing — Resolved
The actual data-backed Daily Review implementation should be scoped to **Phase 5**, when the `GroundCrewTaskPoolItem` model and confirmation endpoints exist.

**Final decision**: do not build the real, production Daily Review screen in Phase 3 or 4. If design work needs to happen earlier, the UI may be scaffolded behind a clearly labeled **"Not yet available"** placeholder state, not a normal empty-state such as "No pending task confirmations yet." The distinction matters because a real empty state implies the backend is live and the queue is working, while a not-yet-available state honestly conveys dependency on the upcoming task-pool backend. This avoids misleading Manning and avoids shipping a mock-data screen that later must be restructured once the actual task-pool schema and sorting/filtering rules are clear.

**Operational effect**: the Home/Calendar badge or summary entry may exist earlier as a lightweight navigation affordance, but it should not imply active queue data until Phase 5 ships. The real build work remains in Phase 5; earlier work is non-functional scaffolding only.

### 6.9 Admin Break-Time Broadcast — Resolved
An Admin-declared break is a **global, non-blocking banner** shown across all open Ground Crew sessions while the break is active. It appears as a sticky top-of-shell banner, not a modal, and it remains visible until the Admin ends the break or the break window expires. It is dismissible **per session** for the current user, but it is not a permanent suppression state and should reappear on refresh or re-entry so the operational pause stays visible to everyone.

The break **does not block task actions, damage filing, or permissioned workflows**; it is informational only. It communicates that a temporary operational pause is in effect and that teams should resume normal work when the break ends.

If a crew member is in the middle of submitting a damage report when the break is published, the in-progress submission continues without interruption. The banner should not clear or cancel the form; it may appear as a compact informational note or be shown in a non-modal side slot while the form remains active. The break is a visible operational notice, not a workflow lock.

### 6.10 Break-Time vs. Shift-Lead Authority — Resolved
**Admin-declared breaks do not suspend `ManningAssignment.IsShiftLead` stage-transition authority.** The break banner is an operational notice, not a permission gate. A designated Shift Lead may still execute Dispatch Release, Venue Arrival, Egress Release, and Warehouse Return transitions while a break is active, unless the product later introduces a separate, explicit rule that breaks are intended to halt event operations. The current decision is that **breaks pause crew availability for work habits, not event-state authority**: the event keeps moving while individual crew members may step away, but the Shift Lead retains valid authority to complete an already-authorized or in-progress stage transition.

This is intentional and not an oversight from applying the non-blocking rule too broadly. Break-time and shift-lead authority are separate concepts: one is a management broadcast/scheduling notice, and the other is the per-shift authorization model under §2.1–2.2. Manning's break declaration does not alter `IsShiftLead` or bypass any dispatch authorization check.

---

## 7. Stockroom Reservation System

### 7.1 Confirmed Backend Reality — `Asset` is Fungible-Stock-Per-Row
- One `Asset` row = one SKU/item type. `BaseCount` = total interchangeable units of that type (e.g., `Gold Chiavari Chair`, `BaseCount = 120`). **Not** serialized/per-unit.
- **`AssetReservation` has no quantity field at all** and performs **whole-asset binary locking** — one reservation row flips the entire `Asset` row's `AssetState` to `"Committed"`, regardless of `BaseCount`. There is no native mechanism to reserve a partial quantity (e.g., "20 of 120 chairs, 100 remain available").
- `ValidateCanvasStateAsync` returns a binary per-`AssetId` verdict (`AvailableAssetIds` / `ConflictedAssetIds`) — never a partial-quantity count.

### 7.2 Design Decision — Option B (Locked In)
**Production task stockroom reservations are scoped to whole-asset / bespoke items only**, matching `ProductionCrew`'s actual operational profile (custom fabrication, staging structures, bespoke rigs — not bulk fungible draws).

- **Bespoke/whole-asset Production tasks**: use `AssetReservation` as-is, no schema change. `ValidateCanvasStateAsync` → available → commit (`IsProvisional = false`) via `ReserveAssetsBulkAsync`. Conflicted → `DeficitQueue` entry (`TriggerSource = "Production Task"`), no provisional reservation.
- **Fungible bulk stock** (chairs, linens, generic fixtures) is explicitly **out of scope** for Production-task-driven `AssetReservation` locking. It routes through WOM/dispatch-layer count verification and `DeficitQueue` directly, with a `"Stock Unconfirmed"` task badge — no reservation lock exists for it at all.
- **Option A** (extend `AssetReservation` with a `QuantityReserved` column, teach the service partial-quantity math) is explicitly **deferred**, not built speculatively — revisit only if post-launch usage data shows Production tasks regularly drawing fungible stock in volume.

### 7.3 GeoClass Buffer — Applied Once, Inside the Service
- `Event.GeoClass` (`"Local"` | `"National"`) drives buffer size: National = 3-day pre / 5-day post; Local = 1-day each side.
- **Caller passes raw, unbuffered dates** (`Event.IngressDate` / `Event.ReturnDate`). Both `ValidateCanvasStateAsync` and `ReserveAssetsBulkAsync` independently call `GetExtendedWindowAsync` internally to apply the buffer exactly once. Callers must never pre-apply the buffer themselves.

### 7.4 Deficit Flow (Whole-Asset Conflicts)
On conflict: `DeficitQueue` record created — `EventId`, `AssetId`, `QuantityNeeded`, `DeficitStatus = "Not Purchased"`, `TriggerSource = "Production Task"` (new enum value), `Priority` (below), `FlaggedBy`.

**Priority inference — corrected** (no `Tier` field exists on `Event`; original Tier-1/2/3 mapping was unverified and wrong):
| Event Field | Priority |
|---|---|
| `GeoClass == "National"` | `High` |
| `GeoClass == "Local"` | `Medium` |
| `IsLossMaker == true` (either GeoClass) | Override → `Critical` |

### 7.5 Deficit Resolution — Confirmed Actual Behavior
No in-place mutation from provisional → committed exists in `ReservationService`. On resolution:
1. Existing provisional `AssetReservation` row is **cancelled** (`ReleaseReservationAsync`, `Status = "Cancelled"`), asset returns to `"Available"`.
2. A **new** committed `AssetReservation` row is written (`IsProvisional = false`, `Status = "Committed"`).

Event history therefore correctly shows **two rows** per resolved deficit (cancelled provisional + new committed) — this is the accurate audit trail, not a bug. Note: this two-row pattern applies only to the whole-asset conflict case (§7.2); fungible-stock deficits never had a reservation row to begin with, so their resolution is just a `DeficitQueue` status advance, with a fresh reservation only created if/when someone chooses to lock the resolved stock as a whole-asset booking.

### 7.6 Concurrency Gap — Confirmed Real, Open Backend Item
`ReserveAssetsBulkAsync` wraps check-and-commit in a transaction, but defaults to PostgreSQL `Read Committed` isolation, not `Serializable`. Two concurrent reservation attempts on the same asset/window can both pass the conflict check and both commit — an unresolved overcommit race.

**Status: open, explicitly scoped as a required Phase 3 backend fix** (touching `ReservationService.cs`) — either `Serializable` isolation on the transaction or a PostgreSQL advisory lock keyed on `AssetId` during the check-and-commit window. Not resolved in this document; must be scoped as its own work item before the Production task reservation path ships.

---

## 8. Frontend/Backend Type Reconciliation

| Type | Location | Action |
|---|---|---|
| `EventItem` (local) | `GroundCrewPage.tsx` | Delete; migrate to `PortalEvent` |
| `DamageReport` (local) | `GroundCrewPage.tsx` | Delete; migrate to `DamageException` (+ additive `stage?`, `isBatchPhoto?`) |
| `STAFF_ROLES` | `src/lib/types.ts` | Replace obsolete strings with the 5 finalized sub-roles |
| `ChainOfCustodyStage` | *(new)* `src/lib/types.ts` | `'Dispatch' \| 'Arrival on Venue' \| 'Egress' \| 'Arrival on Warehouse'` |
| `ManningAssignment` | *(new)* `src/lib/types.ts` | Mirrors backend entity incl. `isShiftLead: boolean`, per-shift-date granularity |
| `GroundCrewTaskPoolItem` | *(new)* `src/lib/types.ts` | Type A task pool (Inventory/Production domains) |
| `GroundCrewConfig` | *(new)* `src/lib/types.ts` | Phase 4 admin config |
| `EnqueuedRequest` | `src/lib/offlineQueue.ts` | Stays local (offline queue mechanics) |
| `CameraCaptureResult` | `src/lib/hava.ts` | Stays local (camera buffer mechanics) |
| `SwipeGestureState`, `DispatchModalState` | `GroundCrewPage.tsx` | Stay local (UI gesture/modal state) |

**Note**: `ExperienceTier` (`Tier-1 VIP` etc.) exists only on the frontend `PortalEvent` type — it is **not** a persisted backend `Event` field. Any priority/tier logic must use verified backend fields (`GeoClass`, `IsLossMaker`) until/unless `ExperienceTier` is explicitly added as a backend column.

---

## 9. Incident Report Action Terminology — Resolved

The third action button on Incident Reports is resolved to **"Noted"** alongside **"Acknowledged"** and **"Call for Talk"**.

**Decision rationale:**
- **Tone**: neutral and professional in a workplace safety / HR context.
- **Clarity**: distinguishes receipt and logging from dismissal or closure.
- **Safety fit**: it records that the issue was seen and filed without implying blame, while remaining clearly different from an explicit acknowledgement or a management escalation.

**Rejected wording**: **"Ignore"** is intentionally excluded because it reads as dismissal and can undermine the safety-reporting intent and audit trail.

### 9.1 Incident Report Entity Decision — Resolved

**Decision**: build a dedicated `IncidentReport` entity and keep `audit_logs` as the append-only system audit trail, not the primary incident record.

**Case for the real entity**
- An incident is an operational record with a lifecycle, not just a log event. It needs a real status state (`Open` / `Noted` / `Acknowledged` / `CallForTalk` / `Resolved`) and recipient routing (`Admin`, `Manning`, or `Both`).
- `SubmittedAt` and `OccurredAt` are not equivalent. The submission timestamp answers "when it was filed"; the occurrence timestamp answers "when the event actually happened." Mixing them collapses timeline analysis and makes safety review harder.
- Admin/Manning need to sort, filter, and follow up on incident records as first-class items, not as raw JSON fragments inside a generic audit log.
- `audit_logs` is still valuable for immutable event tracing (`who created the record`, `who changed status`, `who assigned a recipient`), but it should not be treated as the incident source of truth.

**Case against the real entity**
- It adds schema and API work, migration complexity, and validation rules beyond the current simple form flow.
- A richer `audit_logs` payload could be shipped faster and might be sufficient if the system only needs a log plus manual review.
- There is some overlap between the incident record and audit logging, and a small team could over-engineer a formal record for a workflow that is mostly review-oriented.

**Final recommendation**
- Use a dedicated `IncidentReport` table for the operational record.
- Keep `audit_logs` for immutable state-change tracking and activity breadcrumbs.
- Do not treat `audit_logs` as the incident record itself. This preserves a clean source of truth while keeping the audit history intact.

**Data model (selected)**
- `Id` (UUID)
- `ReporterUserId` (FK)
- `Recipient` (`Admin` | `Manning` | `Both`)
- `Subject` / `Description`
- `InvolvedParty?`
- `OccurredAt` (timestamp, exact preferred; approximate allowed only with explicit precision)
- `SubmittedAt` (server-set, immutable)
- `Status` (`Open` | `Noted` | `Acknowledged` | `CallForTalk` | `Resolved`)
- `ResolvedAt?`, `AssignedToUserId?`, `Notes?`

**`OccurredAt` field design**
- Primary control: `datetime-local` picker with a clear label: **"When did this happen?"**
- Secondary convenience: quick chips for **Today**, **Yesterday**, **Earlier today**, and **Not sure / estimate** (only to prefill, not to hide uncertainty)
- Validation: `OccurredAt` is required for a report meant to describe an actual event; if the reporter is unsure, allow an approximate timestamp only with an explicit `OccurredAtPrecision` value (`Exact` | `Day` | `Approximate`) and a visible warning icon/tooltip.
- Rule of thumb: prefer exact time when available; if exact time is unknown, accept a date-only or estimated time but never silently coerce an unknown value into a false exact timestamp.

**Display on Admin/Manning side**
- Show both timestamps in the card and detail view:
  - **Submitted**: `2026-09-23 14:17` (system capture)
  - **Occurred**: `2026-09-23 12:10` *(estimated)*
- Use color/token distinction: `SubmittedAt` in neutral/secondary styling, `OccurredAt` in emphasis styling because it drives the incident chronology.
- Sort/filter operations should default to `OccurredAt` for incident timeline order; `SubmittedAt` remains the audit and receipt timestamp.
- In the detail drawer, label them explicitly as **Submitted** and **Occurred**, never as a single generic time stamp. When the value is approximate, show a small `Estimated` badge so reviewers know it is not a precise time statement.

### 9.2 Incident Migration & Status Lifecycle — Resolved

**Migration path**
- **Decision**: clean cutover, not mandatory backfill.
- Only new incident submissions after the `IncidentReport` table ships write to `IncidentReport`.
- Existing incident-shaped rows already stored in `audit_logs` remain as historical audit evidence and are left untouched.
- This is intentional rather than a missed migration: without a reliable incident-type tag or a canonical source-of-truth record, backfill would be heuristic and could silently misclassify unrelated audit events.
- In a pre-launch capstone/thesis context this is acceptable, as there is no proven historical incident corpus to migrate. If real historical incident data is later introduced, a one-time ETL can be scoped separately using a strict allowlist of known incident event signatures and a human-review pass.

**Status lifecycle**
- `Open` is the initial state.
- `Open -> Noted`, `Open -> Acknowledged`, and `Open -> CallForTalk` are the allowed first actions.
- `Noted` and `Acknowledged` are terminal action outcomes; they are considered the final disposition for low-risk or informational reports and should not imply a hidden second closure step.
- `CallForTalk` is not terminal — it indicates a required follow-up conversation and must transition to `Resolved` once that talk actually occurs.
- `Resolved` is a separate closure state reserved for explicit follow-up completion, not the default status for every incident action button.

**Valid transition set**
- `Open -> Noted`
- `Open -> Acknowledged`
- `Open -> CallForTalk`
- `CallForTalk -> Resolved`
- `Open -> Resolved` only for admin-driven closure outside the standard action button path
- No transitions from `Noted` or `Acknowledged` back to `Open`; they are terminal outcomes.

This keeps the UI honest: the action button is the record of disposition, while `Resolved` marks the special case where an incident required a follow-up or later close-out after an initial escalation path.

## 10. Open Items / Known Follow-Ups

These are explicitly unresolved and should not be treated as settled:

1. **Zero role-based authorization on the shared dispatch route (§4.2, Phase 3 checklist)** — `DispatchService.UpdateAssetStateAtomicAsync` (backing `POST /api/dispatch/asset/{assetId}/status`) currently validates only the legal state-transition matrix; it has no `ManningAssignment` lookup, no `IsShiftLead` check, and no sub-role/domain gating. Any authenticated user can currently move any asset through any state regardless of role. This is net-new enforcement required for Phase 3, not an existing check to strengthen — treat as the highest-priority open item in the document.
2. **Concurrency isolation fix for `AssetReservation`** (§7.6) — needs a dedicated Phase 3 backend task (`Serializable` isolation or advisory lock).
3. **Option A (fungible partial-quantity reservations)** (§7.2) — deferred pending real post-launch usage data; not to be pre-built speculatively.
4. **`EphemeralPermission` × dispatch-authorization integration** (§5.5) — if a future use case wants ephemeral grants to satisfy the `IsShiftLead` dispatch check directly, that requires an explicit, separately-scoped Phase 3 decision — not to be assumed as already possible.
5. **Multi-timezone venue support** (§5.4) — current design assumes single-timezone (`Asia/Manila`) operations; would need separate scoping if Lumière expands regionally.
6. **Stale field-table wording**: the original bypass-event field table described `IssuedByUserId` as the user who "granted" the bypass — cosmetic language fix needed to match the corrected §6.5 framing ("acknowledged," not "granted").

---

*This document consolidates the full Phase 1 (Wireframing) hand-off context and every Phase 2 (Data Model / Schema) clarification round completed to date. All backend-fact claims herein were verified against real source files (`.cs` entities, services, DTOs) rather than assumed from spec language.*
