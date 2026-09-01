# Warehouse Account Data Pipeline Specification

**System:** Event Equipment Logistics System  
**Module:** Warehouse Account / Warehouse Operations Module  
**Document status:** Implementation and audit specification  
**Date:** 2026-08-20

## 1. Executive Summary

The Warehouse Data Pipeline is the authoritative flow for receiving, cataloguing, allocating, dispatching, returning, reconciling, replenishing, and auditing event equipment. It must preserve a complete chain of custody (CoC) from warehouse origin through field use and back to warehouse destination, while ensuring that inventory mutations, deficit signals, incident evidence, and activity records are attributable, idempotent, and reviewable.

The current frontend contains deterministic derivation layers and reactive in-memory stores for catalog assets, vendors, replenishment deficits, dispatch batches, and activity events. A production deployment must persist these same state transitions in a transactional database, retain immutable audit records, and use IndexedDB only as an offline queue rather than the source of truth.

### 1.1 Pipeline overview

```text
Canvas approvals / PO receipts / manual catalog updates / field returns
                              |
                              v
                  [Ingress validation + idempotency]
                              |
                              v
       InventoryAsset + EventAllocatedItem + DispatchBatch state
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
  Threshold listener     CoC state machine       Activity/Audit log
 checkAndQueueDeficits   outbound -> field ->    immutable append-only
        |                return settlement             |
        v                     |                     v
  DeficitItem / PO       DamageException       CoCAuditTrail
        |                     |                     |
        +----------+----------+---------------------+
                   v
       Warehouse Lead review / 48-hour task engine
                   |
                   v
      Replenishment, repair, loss, settlement, reporting
```

### 1.2 Design principles

- **State machines over free-form status edits:** every status transition has an allowed predecessor and actor.
- **One event driver per mutation:** a user action, Canvas approval, receipt, return audit, or scheduled SLA job must produce one idempotency key and one audit entry.
- **Append-only auditability:** operational records may be corrected through compensating events; prior audit entries are never overwritten.
- **Reactive derived state:** low-stock deficits and notification feeds are derived from authoritative inventory and dispatch state.
- **Offline-first evidence capture:** field staff may capture evidence offline; server reconciliation remains authoritative.
- **Privacy by least privilege:** incident details, photos, coordinates, and liability records are restricted to authorized roles.

## 2. Core Entities, Schemas, and Data Models

The following TypeScript interfaces are the logical contract. Database tables may use snake_case, but API payloads should preserve these semantic fields.

### 2.1 InventoryAsset

Represents a catalogued physical, rented, bespoke, or administrative item. `Event Asset` and `Stockroom` records drive stock thresholds. `Bespoke`, `Rental`, and `Administrative` records may have different lifecycle rules but still require custody and audit references.

```ts
export type InventoryCategory =
  | 'Event Asset'
  | 'Bespoke'
  | 'Stockroom'
  | 'Rental'
  | 'Administrative'

export type InventoryStatus =
  | 'Available'
  | 'Low Stock'
  | 'Critical Deficit'
  | 'Deployed'
  | 'Lost In Action'
  | 'Retired'

export interface InventoryAsset {
  id: string
  assetId: string
  name: string
  category: InventoryCategory
  status: InventoryStatus
  unit: string
  currentStock?: number
  threshold?: number
  imageUri?: string
  dimensions?: { height: string; width: string; depth: string; weight: string }
  purchaseCost?: number
  costPerUnit: number
  primaryVendorId?: string
  backupVendorId?: string
  custodianId?: string
  dateAdded: string
  version: number
  updatedAt: string
}
```

**Invariants:** `currentStock >= 0`; `threshold >= 0`; `assetId` is unique; mutations increment `version`; stock changes are recorded as ledger events, not silent overwrites.

### 2.2 DispatchBatch

Represents one outbound or inbound vehicle/container movement for an event.

```ts
export type BatchDirection = 'outbound' | 'return'
export type BatchStage = 'Planned' | 'Loaded' | 'In Transit' | 'Delivered' | 'Returned'

export interface DispatchBatch {
  id: string
  eventId: string
  direction: BatchDirection
  stage: BatchStage
  vehicleType: string
  plateNumber: string
  driverName?: string
  warehouseLeadId?: string
  plannedAt: string
  handedOverAt?: string
  deliveredAt?: string
  returnedAt?: string
  lockedAt?: string
  manifestVersion: number
  reconciliation: ReconciliationRow[]
}
```

Direction-specific terminal stages are `Delivered` for outbound and `Returned` for return. A stage advance must reject stale `version` values and duplicate requests.

### 2.3 EventAllocatedItem

Maps a catalog asset or SKU to a particular event reference and manifest.

```ts
export type AllocatedItemStatus = 'Reserved' | 'Packed' | 'Short' | 'Dispatched' | 'Returned'

export interface EventAllocatedItem {
  id: string
  eventId: string
  eventRefId: string
  assetId: string
  name: string
  quantityPlanned: number
  quantityPacked: number
  quantityDispatched: number
  quantityReturned: number
  unit: string
  status: AllocatedItemStatus
  source: 'Canvas Approval' | 'Manual Allocation' | 'Pahabol'
  updatedAt: string
}
```

### 2.4 DeficitItem

A deficit is a replenishment requirement, not an inventory adjustment. It remains open until a purchase order, substitution, stock transfer, or approved exception resolves it.

```ts
export type DeficitTrigger = 'Canvas' | 'Batch Pahabol' | 'Manual Audit' | 'Auto-Threshold'
export type DeficitStatus = 'Flagged' | 'PO Drafted' | 'PO Sent' | 'Resolved'
export type DeficitPriority = 'Low' | 'Medium' | 'High' | 'Critical'

export interface DeficitItem {
  id: string
  eventId?: string
  assetId?: string
  itemName: string
  category: InventoryCategory | string
  unit: string
  triggerSource: DeficitTrigger
  currentStock: number
  threshold: number
  quantityNeeded: number
  costPerUnit: number
  priority: DeficitPriority
  status: DeficitStatus
  primaryVendorId: string
  backupVendorId?: string
  taggedForDispatch?: boolean
  createdAt: string
  resolvedAt?: string
}
```

### 2.5 DamageException

Captures an exception affecting equipment condition, quantity, liability, or custody.

```ts
export type DamageSeverity = 'Minor' | 'Major' | 'Critical'
export type DamageStatus = 'Open' | 'Under Review' | 'Accepted' | 'Disputed' | 'Resolved'

export interface DamageException {
  id: string
  eventId: string
  batchId: string
  assetId?: string
  reporterId: string
  severity: DamageSeverity
  status: DamageStatus
  description: string
  imageHash?: string
  imageUri?: string
  gps?: { latitude: number; longitude: number; accuracyMeters?: number }
  capturedAt: string
  reportedAt: string
  liabilityParty?: 'Warehouse' | 'Carrier' | 'Client' | 'Field Crew' | 'Unknown'
  linkedExceptionId?: string
  settlementDueAt?: string
}
```

Coordinates and image hashes are sensitive evidence. Store the hash and metadata in the operational database; place original photos in access-controlled object storage.

### 2.6 ActivityLog and CoCAuditTrail

`ActivityLog` is the user-facing operational feed. `CoCAuditTrail` is the immutable custody ledger and has stricter retention and access rules.

```ts
export interface ActivityLog {
  id: string
  actorId: string
  actorRole: 'Warehouse Lead' | 'Warehouse Member' | 'Field Crew' | 'System'
  action: string
  entityType: string
  entityId: string
  message: string
  createdAt: string
  correlationId: string
}

export interface CoCAuditTrail {
  id: string
  eventId: string
  batchId: string
  assetId?: string
  fromState: string
  toState: string
  actorId: string
  actorRole: string
  custodyNote?: string
  evidenceHashes?: string[]
  occurredAt: string
  recordedAt: string
  correlationId: string
  previousAuditHash?: string
  auditHash: string
}
```

`auditHash` should be calculated from the canonical record plus `previousAuditHash` to make tampering detectable. Audit records are append-only.

## 3. Data Lifecycle and Chain of Custody

### 3.1 Ingress sources

| Source | Driver | Primary records | Required validation |
|---|---|---|---|
| Canvas approval | Approved allocation/manifest | `EventAllocatedItem`, outbound `DispatchBatch` | event reference, asset ID, quantity, approval version |
| PO delivery | Receiving scan or lead confirmation | `InventoryAsset` ledger, vendor receipt | PO ID, quantities, condition, receiver |
| Manual catalog update | Warehouse Lead or authorized member | `InventoryAsset` | category, unit, threshold, vendor, source actor |
| Post-egress return | Inbound batch audit | return `DispatchBatch`, `DamageException`, stock ledger | batch lock, manifest version, evidence, settlement window |
| Field incident | Ground crew or field lead | `DamageException`, evidence object | actor, timestamp, event/batch link, photo hash when available |

Every ingress request must include `correlationId`, `actorId`, `source`, and an idempotency key. Replaying the same request must return the original result without creating a duplicate record.

### 3.2 Four-stage custody flow

#### Stage 1 — Outbound Dispatch / Origin

1. Warehouse Lead loads the approved manifest.
2. The system validates allocated quantities against available stock and open deficits.
3. The lead checks off each line, records substitutions or `Pahabol` items, and captures wide-angle container/vehicle evidence when required.
4. The batch is locked. After lock, ordinary members cannot alter the manifest; corrections require a compensating adjustment or lead override.
5. Custody transfers from warehouse to carrier/field crew. The system writes a `CoCAuditTrail` entry and changes the batch to `Loaded` or `In Transit`.

#### Stages 2 and 3 — Field and Egress

The field state is represented by transit and delivery events rather than uncontrolled inventory edits. Transit notes may include delay, seal condition, handoff actor, GPS, and timestamp. A field crew member may report an incident directly, but cannot rewrite the original outbound manifest. Delivery or egress acknowledgment creates a linked custody event and preserves the outbound batch version.

#### Stage 4 — Inbound Return Audit / Destination

1. Warehouse Lead scans or selects the return batch and verifies the locked outbound manifest.
2. Returned quantity and condition are reconciled line by line.
3. The system opens a **1–2 day settlement window** for unresolved shortages, damage attribution, and late evidence.
4. The lead logs `DamageException` records, linking each to the return batch and, where applicable, a field incident created in Stages 2–3.
5. Matched items return to available stock; damaged items move to quarantine/repair; short items become loss or liability candidates; unreturned items remain in settlement.
6. On settlement close, the system issues the final stock ledger entries and a CoC audit event. A late correction requires a lead-approved compensating event.

### 3.3 Anti-duplication logic

Damage and loss accounting must be idempotent across field reporting and inbound audit:

- Compute a deterministic `dedupeKey` from `eventId`, `batchId`, `assetId`, normalized exception type, and a time bucket or source ticket ID.
- When Stage 4 receives a reported exception, first search by `sourceIncidentId`, `linkedExceptionId`, or `dedupeKey`.
- If a Stage 2/3 ticket exists, link it to the return audit instead of creating another loss quantity.
- If quantities differ, create one reconciliation record for the delta and retain both source observations.
- Never decrement stock once per source. Stock is decremented only by the finalized return settlement transaction.

When more than three items are damaged in the same container or batch, a wide-angle container photo is mandatory before individual item photos are accepted:

```text
if damagedItemCount > 3:
  require wideAngleContainerPhoto(imageHash, capturedAt, coords)
  then allow individualDamagePhotos[]
else:
  individualDamagePhotos[] may be captured directly
```

The wide-angle evidence proves context and prevents isolated photos from being detached from the container-level custody record.

## 4. Reactive Listeners and Automated Engines

### 4.1 Auto-threshold replenishment sync

`checkAndQueueDeficits` derives automatic deficits from live catalog assets in the `Event Asset` and `Stockroom` categories.

For every eligible asset:

$$\text{Deficit Qty} = \max(0, \text{Threshold} - \text{Available Stock})$$

A deficit is emitted only when the result is greater than zero and an equivalent open deficit is not already present. The listener should be idempotent by `(assetId, thresholdVersion, openStatus)` and should preserve `triggerSource = 'Auto-Threshold'`.

Priority can be calculated from the stock ratio:

$$r = \frac{\text{Available Stock}}{\text{Threshold}}$$

```text
r < 0.15  -> Critical
r < 0.35  -> High
r < 0.60  -> Medium
otherwise -> Low
```

The production implementation should run this listener after every committed stock ledger change and as a scheduled reconciliation sweep. The current UI derivation also runs it when replenishment state is read, which protects the preview from stale threshold state.

### 4.2 48-hour SLA and daily task engine

The task engine handles work assigned to warehouse members and review obligations assigned to a Team Lead.

```text
Member marks task complete
          |
          v
Completion event + evidence + actor + timestamp
          |
          v
Team Lead Daily Review queue
          |
   +------+------+
   |             |
confirm       no confirmation
   |             |
   v             v
Close task   48-hour scheduler
                 |
                 v
       WOM auto-override + strike issuance
```

Required task fields include `taskId`, `assigneeId`, `eventId`, `completedAt`, `evidenceHashes`, `reviewStatus`, `reviewerId`, `reviewDueAt`, and `strikeIssuedAt`.

- Completion is not the same as approval.
- A Team Lead confirmation closes the review obligation.
- At 48 hours after completion, an unconfirmed task is escalated according to policy, recorded as a WOM auto-override, and may issue a strike.
- The scheduler must use a unique job key such as `daily-review:{taskId}:{reviewDueAt}` to prevent duplicate strikes.
- A late review can resolve the task but must not erase the prior SLA breach.

## 5. RBAC and Privacy

### 5.1 Mutation matrix

| Capability | Warehouse Team Lead | Warehouse Member |
|---|---:|---:|
| View catalog and stock | Full | Assigned/operational scope |
| Add catalog asset | Yes | If delegated |
| Change thresholds/vendors | Yes | No, or request only |
| Create/edit vendor | Yes | No, or request only |
| Prepare outbound manifest | Yes | Yes, assigned batch |
| Lock outbound batch | Yes | No |
| Advance custody stage | Yes | Limited to assigned handoff |
| Record field/return notes | Yes | Yes, assigned work |
| Finalize return settlement | Yes | No |
| Create damage exception | Yes | Yes, direct write for ground crew |
| Accept/dispute liability | Yes | No |
| Approve deficit/PO | Yes | No |
| Review daily tasks | Yes | No |
| Issue/override strike | WOM policy only | No |
| Read sensitive incident details | Yes, PIN-gated | Own reports / minimum necessary |
| Read CoC audit trail | Full | Read-only scoped |

The system must enforce authorization on the server/API layer, not only by hiding UI controls. Every mutation must verify role, entity scope, current version, and valid state transition.

### 5.2 Incident report controls

- Warehouse Operations Module (WOM) access to sensitive Incident Reports requires a six-digit PIN gate in addition to the authenticated session.
- Ground crew may write incident reports directly from the field, including offline mode, but cannot delete or rewrite prior reports.
- PIN attempts must be rate limited, logged, and never stored in plaintext.
- Incident images, GPS, liability notes, and personal data require encrypted transport and access-controlled storage.
- API responses should redact precise GPS and private contact data unless the caller has the required role and purpose.

## 6. Offline PWA Synchronization Pipeline

### 6.1 Local queue

IndexedDB is a temporary offline buffer only. Use a store named `PWA_OFFLINE_QUEUE` with records shaped like:

```ts
export interface OfflineQueueEntry {
  id: string
  operation: 'CREATE_DAMAGE' | 'COMPLETE_TASK' | 'RETURN_AUDIT' | 'HANDOFF_NOTE'
  payload: unknown
  createdAt: string
  actorId: string
  deviceId: string
  retryCount: number
  idempotencyKey: string
  status: 'queued' | 'syncing' | 'failed'
}
```

Photo evidence payloads must include:

```json
{
  "imageHash": "sha256:…",
  "capturedAt": "2026-08-20T09:30:00.000Z",
  "coords": { "latitude": 14.5995, "longitude": 120.9842, "accuracyMeters": 12 },
  "subject": "container-wide-angle"
}
```

### 6.2 Reconnection flush

1. Detect connectivity and authenticate the session.
2. Read queued entries in creation order, grouped by entity/custody chain.
3. Upload photos first or obtain resumable object-storage upload URLs.
4. Submit the operation with its idempotency key and client `baseVersion`.
5. Mark the entry complete only after the server returns a durable audit ID.
6. Retry transient failures with exponential backoff; send permanent validation failures to a visible conflict queue.
7. Never silently discard failed evidence or mutate the local queue without a user-visible result.

### 6.3 Conflict resolution

- **Append-only events:** merge if idempotency key is new; return the original result if already applied.
- **Stock quantities:** server wins, then create a reconciliation task if client and server versions differ.
- **Custody stages:** reject backward transitions; accept only the next valid transition from the server version.
- **Damage reports:** merge distinct reports; deduplicate by source ticket/dedupe key; preserve both observations when evidence differs.
- **Catalog metadata:** use optimistic concurrency with `version`; present a field-level conflict for lead review.
- **Photos:** never overwrite by filename; content-address by `imageHash`.

## 7. API and Database Side-Effect Contract

A production API should expose mutation endpoints or server actions similar to the following:

| Operation | Endpoint/action | Transactional side effects |
|---|---|---|
| Register asset | `POST /warehouse/assets` | asset row, stock ledger entry, ActivityLog |
| Change stock | `POST /warehouse/assets/:id/ledger` | ledger row, asset projection, threshold listener |
| Lock batch | `POST /warehouse/batches/:id/lock` | immutable manifest version, CoC event, ActivityLog |
| Advance batch | `POST /warehouse/batches/:id/advance` | stage update, CoC event, ActivityLog |
| Return audit | `POST /warehouse/batches/:id/return-audit` | reconciliation rows, damage links, settlement state |
| Create deficit | `POST /warehouse/deficits` | deficit row, ActivityLog |
| Create PO | `POST /warehouse/purchase-orders` | PO header/lines, deficit status changes |
| Complete task | `POST /warehouse/tasks/:id/complete` | completion event, Daily Review queue |
| Review task | `POST /warehouse/tasks/:id/review` | review event, closure or SLA exception |

Each handler must validate input schemas, authorize the actor, use parameterized queries, execute related writes atomically, and return a correlation ID.

Recommended indexes include:

- `inventory_asset(asset_id)` unique
- `inventory_ledger(asset_id, occurred_at)`
- `event_allocated_item(event_id, asset_id)`
- `dispatch_batch(event_id, direction, stage)`
- `damage_exception(batch_id, asset_id, dedupe_key)` unique where applicable
- `deficit_item(status, trigger_source, asset_id)`
- `activity_log(entity_type, entity_id, created_at)`
- `coc_audit_trail(batch_id, occurred_at)`
- `offline_operation(idempotency_key)` unique
- `task(review_status, review_due_at)`

## 8. Audit and Data Quality Checklist

### State and mutation safety

- [ ] Every mutation has an authenticated actor and role check.
- [ ] Every mutation has a correlation ID and idempotency key.
- [ ] State transitions validate the current state and optimistic version.
- [ ] Stock changes use ledger entries and cannot become negative.
- [ ] Final settlement is the only operation that posts return loss to inventory.
- [ ] Audit records are append-only and hash-linked where required.

### Data integrity

- [ ] Asset IDs, event references, batch IDs, and vendor IDs are foreign-key validated.
- [ ] No orphaned `EventAllocatedItem`, `DamageException`, `DeficitItem`, or audit records exist.
- [ ] Duplicate damage tickets are linked rather than double-counted.
- [ ] More-than-three-item damage cases have a wide-angle photo before item evidence.
- [ ] Open deficits have a valid vendor and non-zero quantity.
- [ ] Return audits have a locked outbound manifest version.

### Reliability and async behavior

- [ ] All promises have explicit error handling.
- [ ] Unhandled Promise Rejections are captured by monitoring and surfaced to the user where actionable.
- [ ] Scheduled 48-hour jobs are unique and retry-safe.
- [ ] Offline queue failures remain inspectable and retryable.
- [ ] Photo uploads are resumable or safely retryable by content hash.
- [ ] Reactive listeners are idempotent and do not create duplicate deficits.

### Security and privacy

- [ ] Incident Reports require the six-digit WOM PIN gate.
- [ ] PINs are hashed or delegated to a secure verification service.
- [ ] Sensitive evidence is encrypted at rest and in transit.
- [ ] GPS and personal data are redacted by role and purpose.
- [ ] API authorization does not depend on client-side visibility.
- [ ] Logs do not contain passwords, PINs, tokens, or raw sensitive photo data.

### Performance and database health

- [ ] All high-cardinality lookup paths have database indexes.
- [ ] Batch manifests and audit feeds paginate by cursor.
- [ ] Notification/activity queries are bounded by time and limit.
- [ ] Threshold sweeps process in pages and do not scan unbounded tables.
- [ ] Object storage URLs are short-lived and access controlled.
- [ ] Database query plans are reviewed for dispatch, deficit, audit, and task queues.

## 9. Operational Acceptance Criteria

The Warehouse Account implementation is ready for production when:

1. A single equipment item can be traced from Canvas allocation through outbound handoff, field event, return audit, and final stock disposition.
2. Replaying any client request does not duplicate stock, losses, damage, deficits, tasks, or strikes.
3. An offline field report syncs after reconnect with its photo hash, timestamp, coordinates, actor, and audit ID intact.
4. A low-stock mutation creates exactly one open `Auto-Threshold` deficit with the formula above.
5. A return audit links existing field damage tickets and only posts the final quantity delta.
6. Team Lead and Member permissions are enforced by the server and covered by automated authorization tests.
7. The audit checklist passes with no orphan records, unhandled promise rejection, missing critical index, or unreviewed sensitive-data exposure.

## 10. Implementation Note for the Current Warehouse Preview

The current preview implements the domain shape with deterministic seed data plus reactive browser stores (`useSyncExternalStore`) for catalog assets, vendors, dispatch batches, deficits, and activity notifications. Those stores are appropriate for demonstrating state flow and UI behavior, but they are not durable across devices or deployments. The production migration should preserve the interfaces and event semantics in this document while moving authoritative writes, CoC history, evidence metadata, SLA jobs, and conflict resolution to a transactional backend.

---

**End of specification.**
