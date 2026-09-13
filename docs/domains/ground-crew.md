# Ground crew

**Project:** Lumiere
**Domain:** ground-crew
**Version:** 0.1
**Status:** Draft
**Last reconciled:** 2026-09-12
**PRD links:** PRD-F11, PRD-F12

## Purpose

On-site staff confirm outbound and return, run tasks, and file damage on a phone.

## As-built

- `portal: 'pwa'` in `auth.tsx` / `App.tsx` selects mobile pages: `field-ops`, warehouse-lead/member, manning, production-manager, inventory-officer.
- `GroundCrewPage` uses hardcoded events and in-memory declarations. Camera is a mock shutter. GPS optional.
- Dispatch stall/resume talks to the UI dispatch store, not `DispatchController`.
- There is no `manifest.json`, no service worker, no IndexedDB, no `vite-plugin-pwa` in `package.json`.
- Copy that says "Make available offline" is UI-only.

## Wire

| FE | BE | Live | Fit |
|----|----|------|-----|
| hardcoded `EventItem` (`id`, `name`, `date`, `venue`, `status` Current/Upcoming/Completed) | `EventResponse` Guid + `Active` | no | no |
| `submitGroundCrewDeclaration` memory | `CreateDamageReportRequest` | no | no |
| stall/resume on UI dispatch store | `DispatchController` | no | no |

## Production SHALL

1. Field-ops SHALL load the same event GUIDs as Warehouse Home (API list).
2. Damage SHALL hit `/api/damage-reports`. Confirm outbound/return SHALL hit dispatch or a dedicated movement command on the API.
3. Online path (PRD-F11) SHALL ship before an installable PWA (PRD-F12). This sequencing is locked-in and not open for debate; there shall be no parallel work on the PWA replay queue until the online path is fully wired.
4. A production PWA SHALL include a Web App Manifest, a service worker, and a replay queue that is idempotent on the API.

## Scenarios

**Wrong portal**
- GIVEN a web Executive account
- WHEN opening a `portal: 'pwa'` route
- THEN `PortalAccessError` and no field-ops data

**Online damage**
- GIVEN crew JWT and event E from the API
- WHEN submit damaged item with photo
- THEN the damage list for E includes the new row after reload
