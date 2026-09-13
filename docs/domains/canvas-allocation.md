# Canvas allocation

**Project:** Lumiere
**Domain:** canvas-allocation
**Version:** 0.1
**Status:** Draft
**Last reconciled:** 2026-09-12
**PRD links:** PRD-F5

## Purpose

Let Event Planners design peg layouts and lock real assets so two events cannot take the same unit in the buffer window.

## As-built

- `DesignCanvasHubPage` is a recents/grid hub. `CanvasWorkspacePage` is a Konva infinite artboard with a logistics sidebar.
- Allocations are local `AllocatedAsset[]`. Some page JSON sits in `localStorage` keys like `lumiere-canvas-assets-${card.id}`.
- `ReservationController` exposes `POST /api/reservations/bulk` and `validate-canvas-state`. `ReservationService.ReserveAssetsBulkAsync` checks Active event, temporal overlap with Local 1/1 or National 3/5 day buffers, sets `AssetState = Committed`, broadcasts Supabase Realtime.
- Canvas does not call those endpoints yet, but Canvas → Reservation API wiring is now in-scope (confirmed as current-sprint priority, not deferred to a future phase). Stock-zero on the board is fixture data.

## Wire

| FE | BE | Live | Fit |
|----|----|------|-----|
| local `AllocatedAsset[]`, `localStorage` `lumiere-canvas-assets-${card.id}` | `BulkReservationRequest` (`eventId` Guid, `assetIds` Guid[], `lockStart`/`lockEnd` DateTimeOffset) | no | no |
| planner ids `pe-*` | event Guid | no | no |
| none in SPA | grant bypass `Supervisor` / `SystemAdmin` | n/a | unseeded bypass roles to be removed; replace with seeded roles (`Admin`, `Event Planner`). |

Event create stores `TransitBufferDays` Local 1, National 3. Reservation overlap pads Local 1/1, National 3/5.

## Production SHALL

1. Committing a design SHALL call bulk reserve (`POST /api/reservations/bulk`) against the API inside a transaction. This API wiring is in-scope now as a current-sprint priority, not deferred.
2. A conflicting reservation SHALL block the commit and surface the overlapping event.
3. Releasing a reservation SHALL return the asset to Available only if it is still Committed.
4. Canvas access (`RequireCanvasAccess` / `event_viewers`) is a confirmed fix: unseeded bypass role strings (`Supervisor`, `SystemAdmin`) SHALL be removed from the codebase and replaced with only the seeded roles (`Admin`, `Event Planner`).

## Scenarios

**Conflict**
- GIVEN asset A committed to E1 in the National buffer
- WHEN planner of E2 commits A
- THEN bulk reserve fails and A remains Committed to E1

**Commit**
- GIVEN Active E2 and available A
- WHEN bulk reserve succeeds
- THEN A is Committed and Realtime `asset-transitions` fires after DB commit
