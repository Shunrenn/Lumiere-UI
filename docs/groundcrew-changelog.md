# Lumière Ground Crew PWA — Phase 1 Changelog

> Companion log to `copilot-phase-prompts.md` and `groundcrew-full-reference.md`.
> Tracks what changed (or was clarified) at each prompt/response round within
> Phase 1, so future phases can see not just the final diff but *why* each
> decision was made. Intended to be committed alongside the spec so any tool
> or teammate picking this up later has the full reasoning trail, not just
> the end state.

---

## Round 1 — Initial Phase 1 implementation

**Prompted:** Nav/shell restructure, confirmation-authority bug fix, login
relabel, no WOM/legacy naming leaks (per the Phase 1 prompt in
`copilot-phase-prompts.md`).

**Copilot reported:**
- Updated `App.tsx`, `nav.tsx`, `GroundCrewLoginPage.tsx`, `GroundCrewPage.tsx`.
- Legacy Warehouse routes removed from nav validation.
- `WarehouseLeadPage.tsx` / `WarehouseMemberPage.tsx` left untouched.
- Login copy changed from "Crew ID / Access Code" to "Email / Password."
- Confirmation UI copy adjusted toward event-scoped authority framing.
- Build verified: `pnpm build` → `✓ built in 12.98s`.

**Gap identified:** Report was prose-summary + result counts only — no diffs,
no raw search output, no confirmation that the confirmation-authority fix
touched logic vs. copy. Per the project's own working-style note (confident-
but-wrong claims earlier in the project), this was not accepted as sufficient
evidence.

---

## Round 2 — Scope clarification (before further evidence was requested)

**User clarified scope directly:**
1. Do NOT modify, remove, or touch `WarehouseLeadPage.tsx` /
   `WarehouseMemberPage.tsx` this phase — leave lazy-imports and route cases
   in `App.tsx` exactly as-is.
2. New nav links/buttons must not point to `warehouse-lead` /
   `warehouse-member` routes. Old routes may stay technically reachable in
   `App.tsx`; they just should not be part of the new nav flow.
3. `ProductionManagerPage.tsx` / `InventoryOfficerPage.tsx` being present as
   routes is fine — separate WOM portal, out of scope for this phase.

**Change:** No code changed in this round — this was a scope contract that
governed how the verification prompt (Round 3) was written and how Copilot's
evidence would be judged.

---

## Round 3 — Verification prompt built and run

**Verification prompt required, per item:**
1. Full current contents of `GroundCrewLoginPage.tsx` (not a grep count).
2. Diffs of the `App.tsx` route table and `nav.tsx` nav-link list, plus
   explicit confirmation that `warehouse-lead` / `warehouse-member` route
   *cases* remained in `App.tsx` while absent from `nav.tsx`.
3. Diff of the confirmation button's guard clause/conditional in
   `GroundCrewPage.tsx` — not surrounding copy.
4. Raw `file:line:content` output for the naming-leak greps, not just counts.

**Findings from Copilot's evidence:**

| Criterion | Result |
|---|---|
| Login page — no stale "Crew ID" language | ✅ Pass — full file confirmed clean labels (`Email` / `Password`); internal var name `crewId` is cosmetic only, doesn't reach UI |
| Nav/shell — stable for all 5 sub-roles | ⚠️ Gap — only `FieldCrew` (`field-ops`) had a real route; WarehouseCrew/InventoryCrew/ProductionCrew/EventAdmin had no dedicated nav entry at all |
| No legacy Warehouse route as source of truth | ✅ Pass — route cases retained in `App.tsx`, correctly removed from `nav.tsx` whitelist |
| Confirmation logic — real fix vs. copy-only | ⚠️ Unclear — diff showed only text/copy changes; legacy string `'Team Lead / Field Lead'` still present in the underlying `AccessLevel` type; needed follow-up to confirm whether this was a scope-blocked limitation or an incomplete fix |
| No WOM/legacy naming leaks | ✅ Pass on the two searches run, but search patterns didn't include "Team Lead"/"Field Lead" — flagged as incomplete coverage |

**Also surfaced:** demo credentials footer text on the login page
(`crew@lumiere.com · lumiere2026`) — not a Phase 1 acceptance-criteria issue,
noted as a separate "should this ship" question.

---

## Round 4 — Follow-up questions sent to close the two open gaps

**Follow-up prompt asked:**
1. Does any code path route InventoryCrew/ProductionCrew sub-roles into
   `inventory-officer` / `production-manager` (the off-limits WOM pages)?
2. Where does `accessLevel` come from, and does its type still include the
   literal `'Team Lead / Field Lead'`? Is it gated behind an off-limits file
   (`auth.tsx` / `types.ts` / `store.tsx`)?
3. Re-run the naming-leak grep with `Team Lead|Field Lead|Ground Crew / Member
   |Warehouse Lead|Warehouse Member` included, raw output only.

**Findings:**
- **No WOM leak confirmed.** `inventory-officer` / `production-manager`
  routing is driven entirely by separate auth booleans
  (`isProductionManager`, `isInventoryOfficer`) tied to Warehouse-Manager-
  style roles — structurally disconnected from Ground Crew. Spec §1.1a
  satisfied.
- **Confirmation-logic copy-only fix justified.** `accessLevel` is derived
  locally in `GroundCrewPage.tsx` from `effectiveRole`, which traces back to
  `currentUser.role` in `auth.tsx` — an off-limits file this phase. The
  copy-only fix was a genuine boundary constraint, not a shortcut. Rendered
  UI text no longer shows "Team Lead / Field Lead" (displays "Shift Lead"
  via ternary); the literal string surviving as an internal type value is a
  Phase 2 naming-hygiene item, not a Phase 1 defect.
- **Expanded naming-leak search:** all additional "Team Lead"/"Field Lead"
  hits confirmed to live only in already-protected files (`rbac.ts`,
  `AdminRolesPage.tsx`, `auth.tsx`, `store.tsx`, `types.ts`) or untouched
  legacy Warehouse-side files (`WarehouseLeadPage.tsx`,
  `WarehouseMemberPage.tsx`, `warehouse-crew.ts`, `manning.ts`,
  `ManningPage.tsx`, `pdf-exporter.ts`, `trend-aggregator.ts`,
  `warehouse.tsx`) — correctly out of scope for this phase.

**Structural finding (the real blocker):** `auth.tsx`'s `PWA_ROLES` set is
still a flat `{'Ground Crew', 'Warehouse Lead', 'Warehouse Member', 'Manning
Officer', 'Event Admin'}` — the 5-sub-role model doesn't exist anywhere in
the authenticated role set yet. Full per-sub-role nav routing is not
achievable in Phase 1 without pulling Phase 2's RBAC/claims work forward.

---

## Round 5 — Scope resolution decision

**Decision made:** Option A — treat Phase 1 as building the shared *shell*
only (confirmed clean of legacy/WOM leakage); full per-sub-role routing is
explicitly deferred to Phase 2, once backend sub-role claims exist to route
against. (Option B — pulling a thin slice of `auth.tsx` sub-role plumbing
into Phase 1 — was considered and rejected to preserve the phase boundary
that keeps each Copilot session's blast radius small.)

**Instruction sent to Copilot:** state this limitation explicitly in the
final Phase 1 report as a known Phase 2 dependency, not a silent gap; do not
attempt sub-role-specific nav routing this phase.

---

## Round 6 — Final consolidated Phase 1 report (accepted)

**Delivered:**
- Shared shell + active route flow narrowed in `App.tsx` / `nav.tsx`.
- Legacy warehouse route cases retained in `App.tsx`, removed from
  `nav.tsx`'s active whitelist.
- `GroundCrewLoginPage.tsx` aligned to current Ground Crew shell.
- Confirmation-authority copy in `GroundCrewPage.tsx` clarified toward
  event-scoped framing (logic unchanged, justified above).
- Build verified clean (same `✓ built in 12.98s` result as Round 1 — no
  further code changes occurred during verification rounds 3–5, only reads/
  greps).

**Explicitly deferred to Phase 2:**
- Per-sub-role routing for WarehouseCrew, FieldCrew, InventoryCrew,
  ProductionCrew, EventAdmin.
- Auth-level RBAC/sub-role claims in `auth.tsx`.
- Any route branching dependent on a real sub-role claim model.

**Status: Phase 1 accepted as complete**, against all four original
acceptance criteria, with the nav/shell criterion satisfied under the
explicitly documented shell-only scope above.

---

## Carry-forward notes for Phase 2

1. **Nav-shell gap is now a concrete Phase 2 requirement, not just backend
   RBAC.** The Phase 2 prompt should explicitly require wiring the frontend
   nav to real per-sub-role route entries once claims exist — not just
   claim-emission (`JwtService.cs` / `EphemeralClaimsTransformation.cs`) and
   the `rbac.ts` / `AdminRolesPage.tsx` permission tree. Otherwise Phase 2
   could ship claims with nothing in the UI consuming them for routing,
   reproducing the same gap one phase later.
2. **Standing verification instruction recommended for all future phases:**
   *"Every claim of 'done' or 'no leaks found' must be backed by a pasted
   diff or raw search/grep output in the same response — summaries alone are
   not sufficient evidence."* Add this line directly into each phase prompt
   going forward rather than requesting it after the fact.
3. **Minor, non-blocking item to revisit:** login page footer exposes literal
   demo credentials (`crew@lumiere.com · lumiere2026`). Not a Phase 1
   acceptance-criteria violation; worth a deliberate decision (keep for
   thesis-demo convenience vs. remove) before any real deployment.
4. **Phase 2 naming-hygiene item:** the literal string `'Team Lead / Field
   Lead'` still exists in the local `AccessLevel` type in
   `GroundCrewPage.tsx`. Not user-visible (UI renders "Shift Lead"), but
   should be reconciled once `auth.tsx` role/claim naming is finalized in
   Phase 2, so the internal type and the backend claim vocabulary match.

---

## Phase 2 Planning & Audit Findings

**Scope Note:** Planning and evidence audit round. No code changes executed.

### Decisions & Findings Summary:
1. **Claim Naming**: Confirmed single canonical claim `ground_crew_subrole` (snake_case value pattern). Duplicate boolean claims (`GroundCrew_Warehouse`, etc.) rejected.
2. **Shift-Lead Claims**: Deferred to Phase 3. Verified zero backend instances of `IsShiftLead` / `ShiftLead`.
3. **Vocabulary Mismatch**: Audited 3-layer string drift across backend (`GroundCrewSubRoles.cs`), frontend tree IDs (`rbac.ts`), and spec DTOs (`groundcrew-full-reference.md`). Formulated 3 reconciliation options for user review.
4. **Quota Enforcement Audit**: Verified that `manning.ts` and `ManningModule.tsx` continue to enforce `minTeamLeads`/`maxTeamLeads` if present on `SubRole` objects despite UI controls being deleted. Approved passive callout text: *"Lead authority is assigned per shift-date via the event roster; legacy Team Lead quotas are deprecated and are no longer configurable here."*

---

## Phase 2 Follow-Up — Completion & Corrections

**Scope Note:** Phase 2 implementation verification, vocabulary alignment (Option 1 wire values), typed union `GroundCrewSubRoleWire`, and quota callout addition.

### Corrections & Audits Executed:
1. **Vocabulary Alignment (Option 1)**: Retained backend wire values (`Warehouse`, `Field`, `Inventory`, `Production`, `EventAdmin`). `GROUND_CREW_SUBROLE_MAP` in `rbac.ts` maps wire values to frontend tree IDs (`warehouse-crew`, `field-crew`, etc.).
2. **Typed Union `GroundCrewSubRoleWire`**: `PortalAccount` and `AuthContextValue` in `auth.tsx` type `groundCrewSubRole` strictly as `'Warehouse' | 'Field' | 'Inventory' | 'Production' | 'EventAdmin'` (or `undefined`).
3. **Quota Callout**: Placed exact callout text in `AdminRolesPage.tsx` under Ground Crew section header. Left `manning.ts`, `ManningModule.tsx`, `ManningSlaModule.tsx` untouched per scope boundaries.

### Explicit Phase 3 Dependencies:
1. **Nav / Route Resolution from `groundCrewSubRole`**: Sub-role is decoded from `ground_crew_subrole` claim on auth mount; navigation routing stays on `field-ops` shell until Phase 3 dedicated screens exist.
2. **Shift-Lead Claims & `IsShiftLead` DB Schema**: Shift-lead claims (`GroundCrew_WarehouseShiftLead`, `GroundCrew_FieldShiftLead`) and `ManningAssignment.IsShiftLead` database field are Phase 3 scope.
3. **Per-Sub-Role Screens**: Dedicated screens for WarehouseCrew, FieldCrew, InventoryCrew, ProductionCrew, and EventAdmin.
4. **Dormant Quota Code Cleanup**: Refactoring runtime quota checks in `manning.ts` and legacy quota properties in `rbac.ts:44-45` when Phase 3 shift-lead roster model replaces legacy Team Lead quota fields.
5. **Field Lead / Team Lead Naming Decision**: Reconciling naming occurrences in `GroundCrewPage.tsx:132` and `:585` and `ground-crew-declarations.ts:14`.
6. **`STAFF_ROLES` Legacy Strings**: Removing legacy role strings pending removal.

---

## Phase 2 Follow-Up Round 2 — Fixes (B-section)

**Scope Note:** Evidence audit + targeted fixes to rbac.ts, auth.tsx, AdminRolesPage.tsx only. No new features. Build verified clean: `✓ built in 14.87s`.

### Fixes Executed:

1. **B1 — GROUND_CREW_SUBROLE_MAP typed key**: Changed `Record<string, GroundCrewSubRoleMapping>` to `Record<GroundCrewSubRoleWire, GroundCrewSubRoleMapping>`. TypeScript now enforces exhaustiveness on the map. Imported `GroundCrewSubRoleWire` from `types.ts` into `rbac.ts` (not circular — `types.ts` does not import `rbac.ts`). `GROUND_CREW_TREE_ID_TO_WIRE` derived with `Object.fromEntries(Object.values(GROUND_CREW_SUBROLE_MAP).map(...))` — no second hand-written list. Return type upgraded to `Record<string, GroundCrewSubRoleWire>`.

2. **B2 — `parseGroundCrewSubRole` shared helper**: Extracted a module-level `function parseGroundCrewSubRole(raw: unknown): GroundCrewSubRoleWire | undefined` using `Object.hasOwn`. Handles absent, non-string, or invalid values by returning `undefined`. Both the login path (`mapBackendUserToPortalAccount`) and the stored-auth hydration path (`useEffect`) call it. `PWA_ROLES` and all other portal login paths untouched.

3. **B3 — AdminRolesPage.tsx per-leaf notices removed**: Two "Shift-lead coverage" `<div>` blocks (one in `SubRoleRow`, one in `TreeNodeRow`) were not requested in the original Phase 2 prompt. Both removed. Section-header callout (`Lead authority is assigned per shift-date…`) remains once only.

4. **B5 — groundCrewSubRole consumption**: `git grep -n "groundCrewSubRole" -- src` shows all hits are in `auth.tsx` only (type declarations, login path, hydration path, context value). Nothing outside `auth.tsx` reads it today. **Phase 3 dependency recorded here**: nav/route resolution from `groundCrewSubRole` is pending; only `field-ops` exists today. No routing changes made in this phase.

5. **B6 — groundcrew-full-reference.md §1.1g Phase 3 wire vocabulary**: Updated the `DispatchService` sub-role match description from spec display names `WarehouseCrew`/`FieldCrew` to wire values `Warehouse`/`Field`. Added note that `copilot-phase-prompts.md` (Downloads, line 144) still uses display names and must be updated manually before Phase 3 is prompted — that file is outside this repo.

### Evidence — Section A Findings (verbatim corrections):

- **App.tsx and nav.tsx**: Both were modified in Phase 1, not Phase 2. Phase 1 changes: `nav.tsx` removed `warehouse-lead` and `warehouse-member` from the valid-route whitelist. `App.tsx` removed those same strings from `pwaRoutes` and `validRoutes` sets. The previous evidence report incorrectly described these as Phase 2 edits involving "forwarding groundCrewSubRole to routing logic" and "including sub-role routes." Those descriptions were false — the actual diff shows only removal of `warehouse-lead`/`warehouse-member` from two string sets, which matches the Phase 1 scope contract. No Phase 2 edit touched `App.tsx` or `nav.tsx`.

- **types.ts double-edit**: There was no double-edit of `types.ts` with a `pnpm build` between edits. `types.ts` was edited once in Phase 2 to add `GroundCrewSubRoleWire` and add the four new sub-role name strings to `STAFF_ROLES`. No build failure occurred between edits because there was only one edit.

- **Untracked files** (`.env.example`, `.env.local.example`, `SETUP.md`): Created at `2026-09-23 00:21`, `00:21`, and `01:05` respectively — before Phase 1 started in this session. This agent did not create them. They predate the session by several hours, originate from the user's own workspace setup, and are not part of any Phase 1 or Phase 2 edit list.

---

## Diagnostic Finding — Ground Crew Sub-Roles Behavior (Phase 2 Diagnostic)

**Symptom Diagnosis:** Logging in with Ground Crew accounts, sub-roles do not change screen behavior.
**Classification:**
1. **Working as designed but no per-sub-role routing yet (Classification D)**: The backend API emits `ground_crew_subrole: "Field"` in the JWT claim payload for `crew@lumiere.com`, and `auth.tsx` correctly decodes it into `currentUser.groundCrewSubRole`. However, per-sub-role routing and dedicated screens (WarehouseCrew, FieldCrew, InventoryCrew, ProductionCrew, EventAdmin) are explicitly scoped to Phase 3. In Phase 2, `App.tsx` routes all Ground Crew logins (`isGroundCrew === true`) to the shared `field-ops` shell (`GroundCrewPage.tsx`).
2. **No sub-role assigned to accounts other than seeded `crew@lumiere.com` (Classification C)**: `DbInitializer.cs` explicitly seeds `GroundCrewSubRole = GroundCrewSubRoles.Field` for `crew@lumiere.com`. The other 9 seeded accounts in `DbInitializer.cs` have `GroundCrewSubRole = null`. No admin management endpoint or UI edit form exists in Phase 2 to write `GroundCrewSubRole` to other accounts.
**Decision:** No code or database changes required in Phase 2. Sub-role JWT claims are functional; per-sub-role UI routing and screen rendering will be implemented in Phase 3 as specified in `groundcrew-full-reference.md`.


---

## Phase 2 — Build Round: Snapshot Repair, Demo Accounts, Asset.Category Finding

### A. Model Snapshot Repair

- **Root cause:** `AppDbContextModelSnapshot.cs` at HEAD legitimately contains a `Category` property (with `.HasColumnName("category")`) on the `production_schedule_items` entity. An earlier cleanup round incorrectly deleted it.
- **Fix:** Ran `git checkout HEAD -- Lumiere.Infrastructure/Migrations/AppDbContextModelSnapshot.cs` to restore the file, then applied **only** the `GroundCrewSubRole` hunk in the `users` entity (after `full_name`, before `is_active`). The resulting diff is exactly +5 lines, single hunk.
- **Designer file:** `20260923222225_AddGroundCrewSubRoleToUsers.Designer.cs` was hand-written to match the corrected snapshot. Diff vs prior migration (`20260919030707_AddGpsCoordinatesToDamageReports.Designer.cs`) shows only: header/attribute lines (migration ID, class name) plus the GroundCrewSubRole hunk (+5 lines) plus a trailing newline — no other diffs. This was confirmed by `git diff --no-index` between the two files.
- **Pending model changes:** `dotnet ef migrations has-pending-model-changes` reports pending changes from `Asset.Category` only — not from `ground_crew_sub_role`. No migration was created for Asset.Category (see Section C below).

### B. Demo Accounts Seeded

Five Ground Crew sub-role accounts added to `DbInitializer.cs` alongside the existing `crew@lumiere.com` entry. All use the same mechanism: `BCrypt.Net.BCrypt.HashPassword("lumiere2026", workFactor: 12)`, `IsActive = true`, idempotent on email (create-if-absent; patch-sub-role-if-existing-and-empty).

> **Demo credentials — remove before any real deployment.**

| Email | Sub-role | Full name |
|---|---|---|
| `crew@lumiere.com` | Field | Ground Crew User *(existing)* |
| `warehousecrew@lumiere.com` | Warehouse | Warehouse Crew Demo |
| `fieldcrew@lumiere.com` | Field | Field Crew Demo |
| `inventorycrew@lumiere.com` | Inventory | Inventory Crew Demo |
| `productioncrew@lumiere.com` | Production | Production Crew Demo |
| `eventadmin@lumiere.com` | EventAdmin | Event Admin Demo |

**Live login check (in-memory database — does NOT prove Postgres seeding):**
The running API process (PID 23084, `Lumiere.API.exe`) was started before this task; it runs with the in-memory provider (non-Production environment). Login results against that process:

```
[Warehouse Crew]  HTTP 200 | ground_crew_subrole=Warehouse
[Field Crew]      HTTP 200 | ground_crew_subrole=Field
[Inventory Crew]  HTTP 200 | ground_crew_subrole=Inventory
[Production Crew] HTTP 200 | ground_crew_subrole=Production
[Event Admin]     HTTP 200 | ground_crew_subrole=EventAdmin
```

All five decoded JWT payloads contain the correct `ground_crew_subrole` claim. This verifies the seeding logic and JWT emission — it does not verify Postgres column existence or that a migration has been applied to any real database.

**Tests:** `dotnet test --no-build` → `Passed! - Failed: 0, Passed: 60, Skipped: 0, Total: 60, Duration: 4s`. The 6 new tests in `DbInitializerSubRoleSeedTests` are included in that total. The prior count of 54 was before `DbInitializerSubRoleSeedTests.cs` was added. New tests confirmed by `--list-tests`:

```
DbInitializerSubRoleSeedTests.SeedAsync_GroundCrewSubRoleAccounts_ExistWithExpectedSubRoleAndRoleName (x5 theory cases)
DbInitializerSubRoleSeedTests.SeedAsync_ExistingSubRoleAccount_DoesNotOverwriteNonEmptySubRole
```

### C. Asset.Category — Unresolved (decision deferred to repo owner)

**Evidence (read-only, no changes made):**

- `supabase/migrations/*.sql` — no match for "category" in any SQL migration file.
- EF migration `20260913083625_AddAllowSelfValidationToRoles.cs`:
  - Line 28: adds `category` to `deficit_queue` (nullable text) — **not** `assets`.
  - Line 267: creates `production_schedule_items` with a `category` column — **not** `assets`.
  - Down(): drops `category` from `deficit_queue`.
  - **No migration touches the `assets` table.**
- `git show a9ac684 --stat`: commit dated Sep 19 added `Category` to `Asset.cs`, `AssetDTOs.cs`, `AssetService.cs`, and `DbInitializer.cs` seed — **without a corresponding EF migration.**

**Conclusion:** `Asset.Category` exists in the committed entity class but has no migration. The `has-pending-model-changes` warning comes from this gap. **Decision required from repo owner:** create a migration for `Asset.Category`, or revert the property.

---

## Phase 2 — Frontend: Ground Crew Login Page

`GroundCrewLoginPage.tsx` updated to display all six Ground Crew demo accounts in the credentials footer (lines 146–154):

```jsx
<p>Ground crew · crew@lumiere.com · lumiere2026</p>
<p className="pt-2 font-semibold ...">Sub-roles</p>
<p>Sub-role · Warehouse Crew · warehousecrew@lumiere.com · lumiere2026</p>
<p>Sub-role · Field Crew · fieldcrew@lumiere.com · lumiere2026</p>
<p>Sub-role · Inventory Crew · inventorycrew@lumiere.com · lumiere2026</p>
<p>Sub-role · Production Crew · productioncrew@lumiere.com · lumiere2026</p>
<p>Sub-role · Event Admin · eventadmin@lumiere.com · lumiere2026</p>
```

The footer is **not** gated behind `import.meta.env.DEV` — it renders in production builds. This footer pre-existed Phase 1 (noted in Round 3 of this changelog); the new sub-role entries follow the same pattern.

---

## Phase 2 — Demo-Account Gating (Build Round)

- **Backend Seeding Gate:** Demo accounts (including ventadmin@lumiere.com, crew@lumiere.com, etc.) in DbInitializer.cs are now gated by if (!isProduction || seedDemoAccounts). Seeding only runs in non-production environments or when the SEED_DEMO_ACCOUNTS=true configuration flag is explicitly set in Program.cs and passed to SeedAsync.
- **Frontend Credentials Footer Gate:** In GroundCrewLoginPage.tsx, the credentials footer displaying demo account credentials and sub-role accounts is wrapped in (import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true'). In production builds, the credentials footer is hidden by default unless VITE_SHOW_DEMO_CREDENTIALS=true is provided at build time.
- **Manual Owner Action Required:** Gating does not remove or delete demo accounts that already exist in any previously deployed database. The database owner must manually disable these existing demo user rows or update/rotate their passwords in deployed databases.
- **Deployment Note:** Set SEED_DEMO_ACCOUNTS=true on the backend and VITE_SHOW_DEMO_CREDENTIALS=true on the frontend build ONLY for a deliberate demo deployment environment.

---

## Phase 2 — Diagnostic Finding: Non-Ground-Crew Demo Accounts Login Symptom

- **Symptom:** Report that non-Ground-Crew demo accounts cannot log in after Phase 2 changes.
- **Backend HTTP Login Matrix:** Executed POST /api/auth/login for all 15 demo accounts against the live API on port 8080. All 15 returned 200 OK with valid JWT tokens containing correct role_name and ground_crew_subrole claims. Demo seeding is 100% functional.
- **Frontend Portal Enforcement:** Ground Crew login page (GroundCrewLoginPage.tsx) calls login(email, password, 'pwa'), which rejects Web-portal accounts (account.portal === 'web') with reason: 'wrong-portal'. Web login page (LoginPage.tsx) calls login(email, password, 'web'), which authenticates Web-portal accounts cleanly.
- **Classification:** **(b) Wrong portal login page used.** Web-portal accounts (admin@, executive@, warehouseops@, planner@, warehouse@, purchasing@) must use LoginPage.tsx (Web portal), while PWA roles (crew@, manning@, production@, inventory@, eventadmin@, and sub-role demo accounts) use GroundCrewLoginPage.tsx (PWA portal). No backend or routing regression exists.

---

## Final Account Structure Decisions Record (Pre-Build Finalization)

**Scope Note:** Architectural decisions finalized prior to multi-phase execution.

1. **Self-Filed Declarations (Item 3 / Option 3A):** Route self-filed declarations to the Manning Officer (`manning` Incident Inbox / Daily Review). If unresolved past the existing 48-hour SLA, escalate to the WOM parent account on the desktop console. Gives Manning Officer explicit decision authority over self-filed items. Enforced as a named server-side policy (`SelfFiledDeclarationPolicy`) in Phase 5. Both client and server compare user IDs (`submittedByUserId === currentUserId`).
2. **WOM Account DB Audit Prerequisite:** Real DB counts of `Warehouse Manager` vs `Warehouse Operations Manager` will be verified in Phase 6 prior to database migration backfill. Read-only SQL query will be provided for DB copy verification.
3. **Ad-Hoc Task Modal Decision:** `WarehouseLeadPage.tsx` and `WarehouseMemberPage.tsx` will be archived in Phase 3 without porting the ad-hoc task assignment modal into `GroundCrewPage.tsx`. The modal is recorded as a deferred item.
4. **Legacy Role Mapping (Option 1C):** Legacy `Field & Production Crew` users mapped by job title (`"Production"`, `"Prop"`, `"Fabrication"` → `Production Crew`; all remaining → `Field Crew`). Every mapping logged to `AuditLog` in Phase 6 as `"mapped by title"` or `"defaulted to Field"`.
5. **Phase Order:**
   - **P1:** Types, RBAC maps & auth plumbing with legacy compatibility layer.
   - **P2:** Router, nav, and route guards for ALL roles (including Executive protection).
   - **P3:** Archive legacy pages & migrate remaining legacy role references (`store.tsx`, `AdminAnalytics`, `WorkforceBadges`, `OverviewPage`, `AdminSystemDashboardPage`, `trend-aggregator`, `warehouse-crew.ts`, `event-detail.ts`, `GroundCrewPage` line 45), then remove legacy types.
   - **P4:** GroundCrewPage sub-role resolution + IsShiftLead gate + anti-self-confirmation (User ID check).
   - **P5:** Backend additive schema (dev DB only), JWT claims (`wom_subrole`), and server-side authorization policies on every endpoint.
   - **P6:** Data backfill + cutover. The `Down()` script restores role, both sub-role columns (`wom_sub_role`, `ground_crew_sub_role`), and `is_shift_lead` values.

---

## Phase 1 Execution — Canonical Types, RBAC Maps & Auth Plumbing

**Delivered in Phase 1:**
- **`src/lib/types.ts`:**
  - Added canonical `GroundCrewSubRoleWire` (`'Warehouse' | 'Field' | 'Inventory' | 'Production' | 'EventAdmin'`) and `WomSubRoleWire` (`'ManningOfficer' | 'WarehouseManager' | 'ProductionManager' | 'InventoryOfficer' | 'PurchasingOfficer'`) in PascalCase wire format.
  - Added `LegacyStaffRole` type (`'Warehouse Lead' | 'Warehouse Member' | 'Field & Production Crew'`) to preserve compilation across legacy consumer files until Phase 3.
- **`src/lib/rbac.ts`:**
  - Defined canonical `GROUND_CREW_SUBROLE_MAP` and `WOM_SUBROLE_MAP` mapping PascalCase wire values to tree IDs and human-readable display names.
  - Exported `WOM_WIRE_TO_DISPLAY_NAME` helper.
- **`src/lib/auth.tsx`:**
  - Added parsing for both PascalCase wire values (`'ManningOfficer'`) and space-separated legacy names (`'Manning Officer'`) via `parseWomSubRole` and `parseGroundCrewSubRole`.
  - Enforced **Explicit Positive Marker** for WOM Parent status (`rawRole === 'Warehouse Operations Manager'` or explicit JWT claim `wom_parent === true` / `is_wom_parent === true`). Missing or unrecognized claim values grant no parent access (fail-closed).
  - Legacy `Warehouse Lead` / `Warehouse Member` roles mapped to `role = 'Ground Crew'`, `groundCrewSubRole = 'Warehouse'`.
  - Legacy `'Field & Production Crew'` mapped to safe interim role `role = 'Ground Crew'`, `groundCrewSubRole = 'Field'` (ensuring field crew usability prior to Phase 6 DB title backfill).
  - Preserved exact behavior for Admin, Executive, and Event Planner.
- **Build Verification:** `pnpm build` (`tsc -b && vite build`) passed cleanly with zero TypeScript errors (`✓ 2137 modules transformed`).


- **Symptom:** Report that non-Ground-Crew demo accounts (e.g. dmin@lumiere.com, planner@lumiere.com) cannot log in after Phase 2 changes.
- **Backend HTTP Login Matrix:** Executed POST /api/auth/login for all 15 demo accounts against the live API on port 8080. All 15 returned 200 OK with valid JWT tokens containing correct ole_name and ground_crew_subrole claims. Demo seeding is 100% functional.
- **Frontend Portal Enforcement:** Ground Crew login page (GroundCrewLoginPage.tsx) calls login(email, password, 'pwa'), which rejects Web-portal accounts (ccount.portal === 'web') with eason: 'wrong-portal'. Web login page (LoginPage.tsx) calls login(email, password, 'web'), which authenticates Web-portal accounts cleanly.
- **Classification:** **(b) Wrong portal login page used.** Web-portal accounts (dmin@, xecutive@, warehouseops@, planner@, warehouse@, purchasing@) must use LoginPage.tsx (Web portal), while PWA roles (crew@, manning@, production@, inventory@, ventadmin@, and sub-role demo accounts) use GroundCrewLoginPage.tsx (PWA portal). No backend or routing regression exists.

---

## Phase 2 Execution — Router, Nav, and Route Guards (All Roles)

**Scope:** Router, nav, and route guard enforcement for ALL roles (not just Executive). No sub-role-specific page rendering yet — that is Phase 4.

### Files Changed

| File | Change |
|---|---|
| `src/App.tsx` | Added module-level `ADMIN_ROUTES`, `EXECUTIVE_ROUTES`, `PLANNER_ROUTES`, `WOM_ROUTES`, `PWA_ROUTES` constant sets. Added `allowedRoutes()` guard in `Router` that redirects to role home if current route is out of bounds. Rewrote `Gate` initial-route chain to flat priority-order: Executive correctly lands on `dashboard`, Admin explicitly listed before isWarehouse fallback. Fixed duplicate `useNav()` call. |
| `src/components/ConsoleSidebar.tsx` | Added `executiveNavItems` (Event Overview→dashboard, Event Registry→registry, Design Canvas→canvas). Updated `navItems` selection chain: `isAdmin→adminNavItems`, `isExecutive→executiveNavItems`, `isPlanner→plannerNavItems`, `isWarehouse→warehouseNavItems`. Companion panel header now shows correct label per role. |

### Route Guard Matrix (post-Phase 2)

| Role | Allowed routes | Blocked examples |
|---|---|---|
| Admin | All web-console routes | `field-ops`, `manning` |
| Executive | `overview`, `dashboard`, `registry`, `event-detail`, `canvas` | `inventory`, `crew`, `damage`, `workforce`, `rbac` |
| Event Planner | `canvas`, `canvas-workspace`, `overview`, `event-detail`, `inventory`, `dashboard`, `registry` | `crew`, `damage`, `logs`, `workforce` |
| WOM (parent + web sub-roles) | `overview`, `inventory`, `damage`, `replenishment`, `warehouse-logs`, `crew`, `deployments`, `dispatch`, `dashboard`, `registry`, `event-detail` | `workforce`, `rbac`, `security-audit` |
| Manning Officer | `manning` only | all other routes |
| Ground Crew / legacy Wa### Build Verification
`pnpm build` (`tsc -b && vite build`):
- TypeScript: zero errors
- Vite: `2137 modules transformed` — `built in 42.12s`
- Exit code: 0

**Status: Phase 2 ACCEPTED as complete.**

### Phase 3 Dependencies & Backlog (carry-forward)
- Archive `WarehouseLeadPage.tsx` / `WarehouseMemberPage.tsx`.
- Migrate legacy role references in `store.tsx`, `AdminAnalytics`, `WorkforceBadges`, `OverviewPage`, `AdminSystemDashboardPage`, `trend-aggregator`, `warehouse-crew.ts`, `event-detail.ts`, `GroundCrewPage` line 45.
- Remove `LegacyStaffRole` type from `types.ts` once all consumers are migrated.
- **Backlog note:** Deferred — Admin read-only operational inspection (Option B) considered and declined for this phase; revisit if a documented need arises, with its own read-only enforcement design.

---

## Phase 2 Review Round — Role × Route Matrix (Generated by Vitest Suite)

Legend: ✅ ALLOW · ❌ DENY · — Portal Mismatch

All routes in `Route` type from `src/lib/types.ts`:

| Route | Admin | Executive | Event Planner | WOM Parent | WOM: Manning Officer | WOM: Warehouse Manager (web) | WOM: Prod Manager (mobile) | WOM: Inventory Officer (mobile) | WOM: Purchasing Officer (web) | GC: all sub-roles | Legacy: Warehouse Lead | Legacy: Warehouse Member | Unrecognized Role |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `overview` | ✅ | ❌ | ✅ | ✅ | ❌ | ✅† | ❌ | ❌ | ✅† | — | — | — | ❌ |
| `workforce` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | — | — | ❌ |
| `dashboard` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | — | — | ❌ |
| `registry` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | — | — | ❌ |
| `replenishment` | ❌ | ❌ | ❌ | ✅ | ❌ | ✅† | ❌ | ❌ | ✅† | — | — | — | ❌ |
| `logs` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | — | — | ❌ |
| `security-audit` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | — | — | ❌ |
| `rbac` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | — | — | ❌ |
| `damage` | ✅ | ✅ | ❌ | ✅ | ❌ | ✅† | ❌ | ❌ | ❌ | — | — | — | ❌ |
| `inventory` | ❌ | ✅ | ✅ | ✅ | ❌ | ✅† | ❌ | ❌ | ✅† | — | — | — | ❌ |
| `warehouse-logs` | ❌ | ❌ | ❌ | ✅ | ❌ | ✅† | ❌ | ❌ | ❌ | — | — | — | ❌ |
| `crew` | ❌ | ❌ | ❌ | ✅ | ❌ | ✅† | ❌ | ❌ | ❌ | — | — | — | ❌ |
| `deployments` | ❌ | ❌ | ❌ | ✅ | ❌ | ✅† | ❌ | ❌ | ❌ | — | — | — | ❌ |
| `dispatch` | ❌ | ❌ | ❌ | ✅ | ❌ | ✅† | ❌ | ❌ | ❌ | — | — | — | ❌ |
| `event-detail` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | — | — | ❌ |
| `canvas` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | — | — | ❌ |
| `canvas-workspace` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | — | — | ❌ |
| `field-ops` | — | — | — | — | — | — | — | — | — | ✅ | ✅ | ✅ | ❌ |
| `manning` | — | — | — | — | ✅ | — | — | — | — | — | — | — | ❌ |
| `production-manager` | — | — | — | — | — | — | ✅ | — | — | — | — | — | ❌ |
| `inventory-officer` | — | — | — | — | — | — | — | ✅ | — | — | — | — | ❌ |
| `warehouse-lead` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `warehouse-member` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**†** WOM web sub-roles (Warehouse Manager, Purchasing Officer, etc.) that map `isWarehouse=true` share the full `WOM_ROUTES` set. In-page module permissions (`womModuleAccessLevel`) restrict view/modify actions per module.

**Unrecognized role / missing role / unmapped sub-role:** `allowedRoutes()` returns empty set → `logout()` called → session cleared → redirected to login. No route is reachable. This is the fail-closed path.| `event-detail` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `canvas` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `canvas-workspace` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `field-ops` | — | — | — | — | — | — | — | — | — | ✅ | ✅ | ✅ | ✅ |
| `manning` | — | — | — | — | ✅ | — | — | — | — | — | — | — | — |
| `production-manager` | — | — | — | — | — | — | ✅ | — | — | — | — | — | — |
| `inventory-officer` | — | — | — | — | — | — | — | ✅ | — | — | — | — | — |
| `warehouse-lead` | ❌‡ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `warehouse-member` | ❌‡ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**†** WOM sub-roles (Warehouse Manager, Purchasing Officer, etc.) that map `isWarehouse=true` share the full `WOM_ROUTES` set. The `†` indicates the route is technically reachable at the guard level but the page-level `womModuleAccessLevel()` further restricts what they can view/modify within each page. Sub-role-level route restriction is the known Phase 2 gap.

**‡** `warehouse-lead` and `warehouse-member` route cases are retained in `Router`'s switch statement for backward compatibility but are NOT in `ADMIN_ROUTES` or any other role's allowed set. They are unreachable by any authenticated role. (Phase 3 will archive these route cases entirely.)

**Unrecognized role / missing role / unmapped sub-role:** `allowedRoutes()` returns empty set → `logout()` called → session cleared → redirected to login. No route is reachable. This is the fail-closed path.

---

### Verification Method (Automated Vitest Test Suite)

Extracted `allowedRoutes` as a pure function into `src/lib/allowedRoutes.ts` and created automated unit test suite in `src/lib/__tests__/allowedRoutes.test.ts`.

Test Command: `pnpm exec vitest run src/lib/__tests__/allowedRoutes.test.ts`
Result: `✓ src/lib/__tests__/allowedRoutes.test.ts (2 tests passed in 9ms)`. All 23 routes across all 13 role profiles verified automatically.

---

## Phase 3 Execution — Legacy Page Archival & Legacy Reference Migration

**Status: Phase 3 — ACCEPTED.**

### 1. Archived Legacy Pages
- `src/pages/WarehouseLeadPage.tsx` → `src/pages/archive/WarehouseLeadPage.tsx`
- `src/pages/WarehouseMemberPage.tsx` → `src/pages/archive/WarehouseMemberPage.tsx`
- Active route cases (`case 'warehouse-lead'`, `case 'warehouse-member'`) and lazy imports removed from `src/App.tsx`.
- Legacy routes removed from `PWA_ROUTES` and `allowedRoutes.ts`.
- Ad-hoc task assignment modal from `WarehouseLeadPage.tsx` was **not** ported to `GroundCrewPage.tsx` per decision #3.

### 2. Data Model Unification (Model A)
- **Definitive Model:** Canonical role for all Ground Crew members is `role: 'Ground Crew'`. Specific discipline/sub-role is stored in `groundCrewSubRole?: GroundCrewSubRoleWire` (`'Warehouse'`, `'Field'`, `'Inventory'`, `'Production'`, `'EventAdmin'`). This matches `auth.tsx` login mapping (`jwtPayload.ground_crew_subrole`) and backend JWT claims.
- **Store Seed Data:** Corrected `store.tsx` seed employee record (`er-3`, Bianca Cruz) from legacy `role: 'Field Crew'` to canonical `role: 'Ground Crew'`, `groundCrewSubRole: 'Field'`.
- **Eliminated Substring Checks:** Replaced all `role.includes('Crew')` substring checks across `store.tsx`, `OverviewPage.tsx`, `AdminSystemDashboardPage.tsx`, `warehouse-crew.ts`, `event-detail.ts`, `WarehouseEventDetailPage.tsx`, and `GroundCrewPage.tsx` line 45 with exact checks (`role === 'Ground Crew'`).

### 3. Type System Cleanup
- Removed `LegacyStaffRole` type from `src/lib/types.ts`.
- Removed legacy strings (`'Warehouse Lead'`, `'Warehouse Member'`, `'Field & Production Crew'`) from `STAFF_ROLES` in `src/lib/types.ts`.
- Zero substring role check stragglers remain in application logic.

### 4. GroundCrewPage Line 45 Behavior Verification
- Verified `accessLevel` evaluation for Field Crew (`role === 'Ground Crew'`, `groundCrewSubRole === 'Field'`) and Production Crew (`role === 'Ground Crew'`, `groundCrewSubRole === 'Production'`):
  - Before: `effectiveRole === 'Ground Crew' || effectiveRole.includes('Crew')` → evaluated to `true` → `'Shift Lead'`.
  - After: `effectiveRole === 'Ground Crew'` → evaluates to `true` → `'Shift Lead'`.
  - Real-user behavior is 100% unchanged.

### 5. Logged Phase 4 Blocker — Pre-Existing GroundCrewPage Authorization Defect
- **Defect Description**: In `GroundCrewPage.tsx` line 42, `accessLevel` is statically derived from `effectiveRole` (`effectiveRole === 'Ground Crew' ? 'Shift Lead' : ...`). Because every Ground Crew user has `role: 'Ground Crew'`, `accessLevel` resolves to `'Shift Lead'` for *all* Ground Crew users indiscriminately.
- **Impact**: `accessLevel` gates `DecisionMode` rendering and declaration role defaults. This grants every Ground Crew member shift-lead authority in `DecisionMode`.
- **Sole Source of Truth Requirement**: `IsShiftLead` boolean flag on the active `ManningAssignment` record for that event and shift date is the **sole source of truth** for shift-lead authority — NOT one of several acceptable signals.
- **Phase 4 Requirement**: Must refactor `accessLevel` in Phase 4 to derive shift-lead authority strictly from `IsShiftLead` on the user's active `ManningAssignment`, derive `EventAdmin` status strictly from `groundCrewSubRole === 'EventAdmin'`, and enforce anti-self-confirmation (user ID comparison on client + server) before building confirmation gates on top of it.

### 6. Verification
- Vitest: `✓ src/lib/__tests__/allowedRoutes.test.ts (2 tests passed)`
- TypeScript (`tsc -b`): `0 errors`

---

## Phase 4a Execution — GroundCrewPage Authorization Security Fix

**Status: Phase 4a — ACCEPTED.**

### 1. Security Privilege-Escalation Fix
- **Vulnerability Closed**: Closed a live privilege-escalation defect in `GroundCrewPage.tsx` where static `effectiveRole === 'Ground Crew'` evaluation granted unearned shift-lead decision authority (`accessLevel = 'Shift Lead'`) to all Ground Crew users indiscriminately.
- **Canonical `IsShiftLead` Sole Source of Truth**:
  - `accessLevel = 'Event Admin'` strictly when `groundCrewSubRole === 'EventAdmin'`. The `effectiveRole === 'Admin'` and `effectiveRole === 'Event Admin'` branches were removed as dead code: Admin is blocked from `field-ops` by the Phase 2 route guard (`ADMIN_ROUTES` does not include `field-ops`), and the literal `'Event Admin'` role string was eliminated in Phase 3.
  - `accessLevel = 'Shift Lead'` strictly when the user has an active `ManningAssignment` on today's shift date with `IsShiftLead === true` (matching user email). Collapsed to `IsShiftLead === true` as sole flag source of truth; removed loose name/identity fallbacks.
  - `accessLevel = 'Ground Crew / Member'` otherwise.
- **Pure Function & Unit Tests**: Extracted `deriveGroundCrewAccessLevel` into [`src/lib/manning.ts`](file:///c:/Users/Alexia%20Villaverde/Lumiere-UI/src/lib/manning.ts) and created unit test suite [`src/lib/__tests__/groundCrewAccess.test.ts`](file:///c:/Users/Alexia%20Villaverde/Lumiere-UI/src/lib/__tests__/groundCrewAccess.test.ts) asserting all 4 trace cases.

### 2. Verification
- Vitest: `✓ src/lib/__tests__/allowedRoutes.test.ts (2 tests)` & `✓ src/lib/__tests__/groundCrewAccess.test.ts (4 tests)` → `6 tests passed in 2 test files`.
- TypeScript (`tsc -b`): `0 errors`.

---

## Phase 4b-i Execution — GroundCrewPage Sub-Role View Resolution

**Status: Phase 4b-i — ACCEPTED.**

> **Scope Caveat:** Sub-role item filtering is implemented and tested against local mock data. Real event items do not yet carry `subRoles` tags — this requires backend schema work and a Planner/staging UI update before the filter has any effect on production data. Tracked as a follow-up, not part of Phase 4.

### 1. Pre-implementation trace — current state before any changes

**Unified view confirmed.** Before this phase, `groundCrewSubRole` was consumed in exactly two places in `GroundCrewPage.tsx`: destructured at line 32, and passed into `deriveGroundCrewAccessLevel()` at line 47. It was never used to branch Home content, task checklists, EventDetail items, Calendar, Activity, or Account. All five sub-roles saw identical content in every tab.

### 2. Spec alignment confirmed

All 5 sub-roles share the same checkpoint pipeline (Dispatch Loading → Venue Arrival → Pre-Event Setup → Post-Event Egress) and the same tab shell. The existing code already matched this structure — the missing piece was filtering *what items* each sub-role sees within those phases, not separate layouts.

### 3. Event Admin Decision Mode gate — confirmed working

`accessLevel === 'Event Admin'` (line 251, `DecisionMode`) now derives from `groundCrewSubRole === 'EventAdmin'` via Phase 4a's `deriveGroundCrewAccessLevel`. The gate is correct. EventAdmin sub-role → `accessLevel = 'Event Admin'` → sees declaration review UI. All other sub-roles → see the info card.

### 4. Files Changed

| File | Change |
|---|---|
| [`src/pages/GroundCrewPage.tsx`](file:///c:/Users/Alexia%20Villaverde/Lumiere-UI/src/pages/GroundCrewPage.tsx) | Added `GroundCrewSubRoleWire` import; added `subRoles: GroundCrewSubRoleWire[]` tag to `EventItem.items`; exported `SUBROLE_DISPLAY` map and `filterItemsBySubRole()` pure function; expanded `derivedEvents` items to 9 entries with per-sub-role tags; passed `groundCrewSubRole` into `EventDetail` and `Home`; `EventDetail` now derives `visibleItems = filterItemsBySubRole(event.items, groundCrewSubRole)` and renders `visibleItems` in all 4 checkpoint phases; fixed hardcoded `'Ground Crew Tier A'` in notification briefing to show real sub-role display name. |
| [`src/lib/manning.ts`](file:///c:/Users/Alexia%20Villaverde/Lumiere-UI/src/lib/manning.ts) | Removed `effectiveRole` from `GroundCrewAccessParams` interface and `deriveGroundCrewAccessLevel` parameters/destructuring (reverting temporary `_effectiveRole` workaround). |
| [`src/lib/__tests__/groundCrewSubRoleFilter.test.ts`](file:///c:/Users/Alexia%20Villaverde/Lumiere-UI/src/lib/__tests__/groundCrewSubRoleFilter.test.ts) | New — 8 test cases covering per-sub-role item visibility, EventAdmin all-items oversight, undefined sub-role fallback, empty-checklist guard, and `SUBROLE_DISPLAY` exhaustiveness. |

### 5. Sub-Role Item Visibility Matrix (from seed items)

| Item | Warehouse | Field | Inventory | Production | EventAdmin |
|---|:---:|:---:|:---:|:---:|:---:|
| Premium Crystal Candelabra | ✅ | ✅ | — | ✅ | ✅ |
| Gold Chiavari Chairs | ✅ | ✅ | — | — | ✅ |
| Velvet Drapery Panels | ✅ | — | — | ✅ | ✅ |
| Stage Platform Sections | — | ✅ | — | — | ✅ |
| LED Par Can Lights | — | ✅ | — | ✅ | ✅ |
| Table Linen Rolls | ✅ | — | ✅ | — | ✅ |
| Centerpiece Floral Frames | — | — | ✅ | — | ✅ |
| Truss Tower Sections | — | — | — | ✅ | ✅ |
| Pipe & Drape Kits | ✅ | — | — | ✅ | ✅ |

### 6. Verification

```
Vitest: 12 passed (2 test files)
  ✓ groundCrewAccess.test.ts (4 tests)
  ✓ groundCrewSubRoleFilter.test.ts (8 tests)
TypeScript (tsc -b): 0 errors
```

---

## Phase 4b-ii Execution — Anti-Self-Confirmation & Escalation

**Status: Phase 4b-ii — ACCEPTED.**

> **Security Framing & Caveat:** Anti-self-confirmation is enforced client-side only (disabled buttons, fail-closed on missing user ID). The server-side 403 `SELF_CONFIRMATION_DISALLOWED` check does NOT exist yet — it requires a change to `GroundCrewDeclarationsController.cs` in the separate `Shunrenn/Lumiere` API repository, which is out of reach of this session. Until that backend check ships, a user could bypass the UI restriction by calling the API directly and self-approve their own declaration. This is a security gap, not a cosmetic one, and should be prioritized before Lumière handles any real declarations data.
>
> **Follow-Up Logged:** The 48-hour SLA → WOM parent automated fallback is not implemented; only the Manning Officer escalation path exists.

### 1. Server-Side 403 Check Audit & Status (Item 1)

* **Status**: **NOT IMPLEMENTED IN THIS REPOSITORY / BLOCKED ON API REPOSITORY (Shunrenn/Lumiere)**.
* **Explanation**: This SPA repository (`Lumiere-UI`) contains only frontend React/TypeScript source code. The C# .NET API and controller endpoints (`GroundCrewDeclarationsController`, `Lumiere.API`) live in the separate API repository (`Shunrenn/Lumiere`). No backend `.cs` code exists in this SPA tree or was modified in this session.

### 2. Client Anti-Self-Confirmation (`isSelfFiledDeclaration`) (Items 2, 3, 4)

* **Sole Signal Standard**: `userId` is the **sole signal** evaluated by `isSelfFiledDeclaration`. The `adminEmail` parameter was completely removed to strictly match the Phase 4a `IsShiftLead` single-source-of-truth standard.
* **Fail-Closed Behavior**: If `declaration.submittedByUserId` or `currentUserId` is missing/undefined, `isSelfFiledDeclaration` returns `true` (**fails closed** — blocks self-confirmation so an unverified declaration cannot bypass security controls).
* **Seed Data**: Populated `submittedByUserId` on all demo seed declarations in `ground-crew-declarations.ts` (`'user-field-lead-001'` and `'user-team-lead-002'`).

### 3. Sole Event Admin Determination & Escalation (Items 2, 5)

* **Sole Event Admin Check**: `isSoleEventAdminForEvent(eventName, manningAssignments)` queries the active roster for `sub_role === 'EventAdmin'`. If count $\le 1$, the UI presents an **"Escalate to Manning Officer (Sole Event Admin)"** button.
* **Manning Officer Inbox**: `escalateDeclarationToManning(id)` sets declaration status to `'Escalated to Manning'`, making it immediately visible in the Manning Officer's Incident Inbox feed on `/manning` ([`src/pages/ManningPage.tsx`](file:///c:/Users/Alexia%20Villaverde/Lumiere-UI/src/pages/ManningPage.tsx)).
* **48-Hour SLA → WOM Parent Fallback Status**: **NOT IMPLEMENTED IN CODE**. The primary escalation to Manning Officer is active in `ManningPage.tsx`. The secondary automated fallback from Manning Officer to the WOM Parent Account desktop console if unresolved past 48 hours is documented as a design rule, but **not implemented in code**. Logged as a follow-up item.

### 4. Code Function Implementations (Item 2)

```ts
export function isSelfFiledDeclaration(
  declaration: GroundCrewDeclaration,
  currentUserId?: string,
): boolean {
  if (!declaration.submittedByUserId || !currentUserId) {
    // Fail-closed: missing user ID on declaration or context cannot be verified -> block self-confirmation
    return true
  }
  return declaration.submittedByUserId === currentUserId
}

export function isSoleEventAdminForEvent(
  eventName: string,
  manningAssignments: Array<{ event_name: string; sub_role?: string | null; status: string }>,
): boolean {
  const eventAdmins = manningAssignments.filter(
    (a) => a.event_name === eventName && a.status === 'Active' && a.sub_role === 'EventAdmin',
  )
  return eventAdmins.length <= 1
}

export function escalateDeclarationToManning(id: string) {
  declarations = declarations.map((declaration) =>
    declaration.id === id ? { ...declaration, status: 'Escalated to Manning' as const } : declaration
  )
  emit()
}
```

### 5. Verification Output (Item 6)

```
Vitest: 16 passed (3 test files)
  ✓ groundCrewAccess.test.ts (4 tests)
  ✓ groundCrewSubRoleFilter.test.ts (8 tests)
  ✓ groundCrewAntiSelfConfirmation.test.ts (4 tests)

TypeScript (tsc -b): 0 errors
```


---

## Phase 5 Execution — Backend Enforcement for Anti-Self-Confirmation

**Status: Phase 5 — ACCEPTED.**

> **Security Loop Closed:** Closes the Phase 4b-ii security gap. Anti-self-confirmation is now strictly enforced server-side on the backend API, not just via disabled buttons in the UI.

### 1. Unified Canonical Sign-Off Endpoint
* **Endpoint**: `POST /api/damage-reports/{id}/sign-off` on `DamageReportController.cs` in `Lumiere.API` (`C:\Users\Alexia Villaverde\Lumiere`).
* **Scope Resolution**: Traced frontend invocation chain (`src/lib/damageApi.ts` line 152 `recordSignOff` → `src/lib/store.tsx` line 2755 `resolveDamage` → both `DamageValidationPage.tsx` and `GroundCrewPage.tsx`). Confirmed `POST /api/damage-reports/{id}/sign-off` is the single canonical REST sign-off route backing Executive dual-custody, WOM validation, and Ground Crew HAVA declarations.

### 2. Submitter-ID Enforcement Fix
* **Implementation**: Added check in `SignOffDamageReport` comparing declaration `SubmittedBy` Guid (`DamageReport.SubmittedBy` / `DamageReportResponse.SubmittedBy`) against `_currentUserService.UserId`.
* **Behavior**: If `existingReport.SubmittedBy == _currentUserService.UserId.Value`, returns `403 Forbidden` with payload `{ Code = "SELF_CONFIRMATION_DISALLOWED", Error = "..." }` and aborts decision processing.
* **Dual-Custody Compatibility**: Verified as additive to (and not conflicting with) Executive dual-custody. Dual-custody enforces that Executive 1 and Executive 2 are distinct signers (`FirstSignOff.StaffEmail != SecondSignOff.StaffEmail`). The anti-self-confirmation check enforces that neither signer can be the original submitter (`SubmittedBy`), maintaining strict separation of duties without breaking dual-custody approvals on reports filed by Ground Crew.

### 3. Unit Test Verification
* **Test Suite**: Created `DamageReportControllerTests.cs` in `Lumiere.Tests` with fake service and fake current user implementations.
* **Test Name**: `DamageReportControllerTests.SignOff_WhenSubmitterEqualsCurrentUser_Returns403ForbiddenWithSelfConfirmationDisallowedCode`.
* **Execution**: Confirmed passing individually in detailed `dotnet test` output (`Passed Lumiere.Tests.DamageReportControllerTests.SignOff_WhenSubmitterEqualsCurrentUser_Returns403ForbiddenWithSelfConfirmationDisallowedCode [8 ms]`, 64/64 total tests passing in solution).




---

## Phase 5b Execution — WOM Sub-Role & Parent Claims Additive Schema

**Status: Phase 5b — ACCEPTED.**

> **Database Scope Caveat:** WOM claim emission (`wom_subrole`, `wom_parent`) is implemented and unit-tested (71/71 passing) against the in-memory EF provider, which is this project's documented dev fallback per `SETUP.md` when no local Postgres is running. The EF migration (`AddWomSubRoleAndIsWomParentToUsers`) is generated and compiles, but has NOT been applied to or verified against a real PostgreSQL database — no local Postgres instance was available in this session, and no `docker-compose` setup exists in either repo to provision one. This migration's real-world Up/Down behavior (column types, constraints) is unverified. This must be confirmed on an actual Postgres instance before Phase 6 (the data migration/cutover) proceeds, since Phase 6's entire safety plan depends on testing against a real database copy.

### 1. Entity & Constants Extension
* **Entity**: Added `WomSubRole` (`string?`, nullable) and `IsWomParent` (`bool`, default `false`) to `User.cs` in `Lumiere.Core.Entities`.
* **Constants & Validation**: Added `WomSubRoles.cs` in `Lumiere.Core.Constants` (`ManningOfficer`, `WarehouseManager`, `ProductionManager`, `InventoryOfficer`, `PurchasingOfficer`) with `WomSubRoles.IsAllowed()` validator matching `GroundCrewSubRoles`.
* **Database Configuration**: Added `wom_sub_role` (varchar 32) and `is_wom_parent` (boolean default false) properties in `AppDbContext.cs`.

### 2. JWT Claim Emission
* **Claims**: Updated `JwtService.GenerateToken` to conditionally emit `wom_subrole` (when `WomSubRoles.IsAllowed(user.WomSubRole)`) and `wom_parent` (as `"true"` when `user.IsWomParent == true`).
* **Frontend Compatibility**: Verified against `src/lib/auth.tsx` (`WOM_WIRE_TO_SUBROLE` map, added in Phase 1). Emitted PascalCase wire strings match `auth.tsx` expectations 1:1.

### 3. Unit Test Verification
* **Test Suite**: Created `WomSubRoleJwtTests.cs` in `Lumiere.Tests`.
* **Execution Output**: All 7 new unit test cases passed (`71/71` total tests passing in solution).

---

## Phase 5b Post-Fix — WOM Operations Manager `isWarehouse` Auth Context Mismatch Fix

**Status: ACCEPTED.**

### 1. Codebase Search Results
* Searched all `.ts`/`.tsx` files for `'Warehouse Manager'` usage.
* Confirmed that `auth.tsx` line 488 was the single source of the `currentUser.role` string mismatch:
  `isWarehouse: currentUser?.role === 'Warehouse Manager'` (which checked the sub-role string instead of the role string `'Warehouse Operations Manager'`).
* All other occurrences of `'Warehouse Manager'` in the frontend are WOM sub-role labels, UI display translations, or mock store default roles. No other role comparison bugs were found.

### 2. Implementation
* **File**: `src/lib/auth.tsx` line 488.
* **Fix**: Updated `isWarehouse` in `AuthContext` to evaluate `currentUser?.role === 'Warehouse Operations Manager'`.

### 3. Coverage Analysis for `allowedRoutes.test.ts`
* `allowedRoutes.test.ts` tests the pure function `allowedRoutes(user: UserRouteContext)` by passing pre-constructed `UserRouteContext` objects (e.g. `{ isWarehouse: true, hasFullWarehouseAccess: true }`).
* **Coverage Gap**: Because the test mocks `isWarehouse` as pre-evaluated `true`, it tests route set resolution correctly but does NOT exercise the `AuthContext` mapping logic in `auth.tsx` (`currentUser?.role === 'Warehouse Operations Manager'`).

### 4. Verification Output
* **TypeScript Check**: `pnpm exec tsc --noEmit` passed with 0 errors.
* **Vitest Suite**: `pnpm exec vitest run` passed (4 test files, 18 tests passed).
* **Live Browser Confirmation**: Logged in as `warehouseops@lumiere.com` via browser subagent. Confirmed successful landing on `WAREHOUSE OPERATIONS MANAGER` overview dashboard (`http://localhost:5173/` overview page), with zero bounce-back to `/login`.

---

### Phase 5b Hardening Addition — End-to-End JWT -> AuthContext -> allowedRoutes Integration Test Suite

**Status: ACCEPTED.**

* **File Added**: `src/lib/__tests__/jwtMappingIntegration.test.ts`.
* **Coverage Scope**: Exercises realistic decoded JWT payloads for all 13 system account configurations (Admin, Executive, Event Planner, WOM Parent with/without explicit `wom_parent` claim, all 5 WOM Sub-Roles, Ground Crew Warehouse/Field sub-roles, and legacy Warehouse Lead role).
* **Pipeline Validated**: Executes full flow `mapBackendUserToPortalAccount(jwtData)` -> `buildUserRouteContext(portalAccount)` -> `allowedRoutes(routeContext)` and asserts `allowedSet.size > 0` for every identity.
* **Sub-Role Precedence Fix (Defensive/Theoretical)**: Adding this test suite surfaced and resolved a precedence edge case where `rawRole === 'Warehouse Operations Manager'` previously took precedence over `claimedWomSubRole` when a `wom_subrole` claim was present. Analysis of `JwtService.cs` and `DbInitializer.cs` confirmed this was purely defensive and theoretical (never reachable with real backend data), because real sub-role accounts are issued JWTs with `role_name` matching their specific sub-role string (`"Manning Officer"`, etc.), never `"Warehouse Operations Manager"`.
* **Execution & Browser Output**: `tsc --noEmit` passed (0 errors); Vitest passed all 5 test files (31 tests total). Verified via real browser logins for both WOM Parent (`warehouseops@lumiere.com` -> `/`) and WOM Sub-Role (`manning@lumiere.com` -> PWA `/manning`).

---

## Phase 5c — WOM Web Sub-Roles Alignment, Ground Crew Sub-Role Workspaces & RBAC Tab Scope Enforcement

**Status: ACCEPTED.**

### 1. WOM Accounts Web Portal Alignment
* **Portal Mapping (`auth.tsx`)**: Mapped all 5 WOM sub-roles (`Warehouse Manager`, `Purchasing Officer`, `Manning Officer`, `Production Manager`, `Inventory Officer`) alongside `Warehouse Operations Manager` (Parent) to `'web'` portal mode.
* **Staff Login Hints (`LoginPage.tsx`)**: Updated the Staff Web Login hints block (`/login`) to explicitly list all Web Portal staff accounts: Admin, Executive, Event Planner, WOM Parent, WOM Warehouse Manager, WOM Purchasing Officer, WOM Manning Officer, WOM Production Manager, and WOM Inventory Officer.

### 2. Ground Crew Sub-Role Dedicated Workspaces & Routes
* **Routes Added (`types.ts` & `allowedRoutes.ts`)**: Defined distinct route strings and route sets for each Ground Crew sub-role discipline:
  - `crew-warehouse` for Warehouse Crew (`warehousecrew@lumiere.com`)
  - `crew-field` for Field Crew (`fieldcrew@lumiere.com`)
  - `crew-inventory` for Inventory Crew (`inventorycrew@lumiere.com`)
  - `crew-production` for Production Crew (`productioncrew@lumiere.com`)
  - `crew-event-admin` for Event Admin (`eventadmin@lumiere.com`)
  - `field-ops` for General Ground Crew (`crew@lumiere.com`)
* **Dynamic Workspace Shell (`App.tsx` & `GroundCrewPage.tsx`)**: Updated `App.tsx` router and initial route evaluation so each Ground Crew sub-role lands on its dedicated workspace. Header brand mark in `GroundCrewPage.tsx` dynamically displays the discipline name (`WAREHOUSE CREW`, `FIELD CREW`, `INVENTORY CREW`, `PRODUCTION CREW`, `EVENT ADMIN`) and filters checkpoint task items accordingly.
* **Field Login Hints (`GroundCrewLoginPage.tsx`)**: Refactored the PWA Field Login hints block to display PWA / Field accounts and sub-roles with a note directing Web Staff accounts to `/login`.

### 3. RBAC Tab Scope Enforcers & Navigation Badges
* **AuthContext Helpers (`auth.tsx`)**: Exposed `getModuleAccessLevel`, `canModifyModule`, and `canInteractModule` methods on `AuthContext`. WOM Parent accounts (`fullWarehouseAccess: true`) retain `Modify` level everywhere. WOM Sub-roles resolve access levels (`Modify`, `Interact`, `View`, `None`) via `womModuleAccessLevel` in `rbac.ts`.
* **Sidebar Badges (`ConsoleSidebar.tsx`)**: Updated sidebar companion drawer navigation to display real-time RBAC access badges (`MODIFY`, `INTERACT`, `VIEW`) next to each console navigation item for sub-role accounts.
* **Console Page Scope Banners & Action Guards**:
  - Integrated `SubRoleAccessBanner` at the top of console pages ([`ReplenishmentPage.tsx`](file:///c:/Users/Alexia%20Villaverde/Lumiere-UI/src/pages/ReplenishmentPage.tsx), [`InventoryStockPage.tsx`](file:///c:/Users/Alexia%20Villaverde/Lumiere-UI/src/pages/InventoryStockPage.tsx), [`CrewRosterPage.tsx`](file:///c:/Users/Alexia%20Villaverde/Lumiere-UI/src/pages/CrewRosterPage.tsx)) when operating under `VIEW` or `INTERACT` mode.
  - Administrative creation/editing actions (e.g. *Initiate Reorder*, *Add New Item*) check `canModifyModule()` and are automatically disabled with explanatory tooltips when logged in under a sub-role without `Modify` rights.

### 4. Verification Output
* **TypeScript Check**: `pnpm exec tsc --noEmit` passed with 0 errors.
* **Vitest Suite**: `pnpm exec vitest run` passed (5 test files, 31 tests passed). Updated integration tests in `jwtMappingIntegration.test.ts` to assert correct destination routes for all Ground Crew sub-roles.




