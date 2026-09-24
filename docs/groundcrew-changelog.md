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

- **Backend Seeding Gate:** Demo accounts (including ventadmin@lumiere.com, crew@lumiere.com, etc.) in DbInitializer.cs are now gated by if (!isProduction || seedDemoAccounts). Seeding only runs in non-production environments or when the SEED_DEMO_ACCOUNTS=true configuration flag is explicitly set in Program.cs and passed to SeedAsync.
- **Frontend Credentials Footer Gate:** In GroundCrewLoginPage.tsx, the credentials footer displaying demo account credentials and sub-role accounts is wrapped in (import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true'). In production builds, the credentials footer is hidden by default unless VITE_SHOW_DEMO_CREDENTIALS=true is provided at build time.
- **Manual Owner Action Required:** Gating does not remove or delete demo accounts that already exist in any previously deployed database. The database owner must manually disable these existing demo user rows or update/rotate their passwords in deployed databases.
- **Deployment Note:** Set SEED_DEMO_ACCOUNTS=true on the backend and VITE_SHOW_DEMO_CREDENTIALS=true on the frontend build ONLY for a deliberate demo deployment environment.

---

## Phase 2 — Diagnostic Finding: Non-Ground-Crew Demo Accounts Login Symptom

- **Symptom:** Report that non-Ground-Crew demo accounts (e.g. dmin@lumiere.com, planner@lumiere.com) cannot log in after Phase 2 changes.
- **Backend HTTP Login Matrix:** Executed POST /api/auth/login for all 15 demo accounts against the live API on port 8080. All 15 returned 200 OK with valid JWT tokens containing correct ole_name and ground_crew_subrole claims. Demo seeding is 100% functional.
- **Frontend Portal Enforcement:** Ground Crew login page (GroundCrewLoginPage.tsx) calls login(email, password, 'pwa'), which rejects Web-portal accounts (ccount.portal === 'web') with eason: 'wrong-portal'. Web login page (LoginPage.tsx) calls login(email, password, 'web'), which authenticates Web-portal accounts cleanly.
- **Classification:** **(b) Wrong portal login page used.** Web-portal accounts (dmin@, xecutive@, warehouseops@, planner@, warehouse@, purchasing@) must use LoginPage.tsx (Web portal), while PWA roles (crew@, manning@, production@, inventory@, ventadmin@, and sub-role demo accounts) use GroundCrewLoginPage.tsx (PWA portal). No backend or routing regression exists.
