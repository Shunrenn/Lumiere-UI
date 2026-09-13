# Documentation Index: Lumiere UI

**Project slug:** `lumiere`
**Maintained by:** Lumiere team
**Last updated:** 2026-09-12

SPA docs for this repository. Each file is usable alone. The API lives in Shunrenn/Lumiere. Catalog cutouts are an API model (PRD-F14). This SPA does not hold the vendor key.

## 1. Artifact inventory

| Artifact | File | Version | Status | Last Updated | Last Reconciled |
|----------|------|---------|--------|--------------|-----------------|
| DSD · Design System | [dsd-lumiere.md](dsd-lumiere.md) | 0.1 | Draft | 2026-09-12 | 2026-09-12 |

**Domains**

| Domain | File | Version | Status |
|--------|------|---------|--------|
| Canvas allocation | [domains/canvas-allocation.md](domains/canvas-allocation.md) | 0.1 | Draft |
| Ground crew | [domains/ground-crew.md](domains/ground-crew.md) | 0.1 | Draft |

**How-tos**

| File | Version | Status |
|------|---------|--------|
| [howto-local-dev.md](howto-local-dev.md) | 0.1 | Draft |
| [howto-deploy-vercel.md](howto-deploy-vercel.md) | 0.1 | Draft |

## 2. Health check

- **API Base URL Routing:** API integration configured using `import.meta.env.VITE_API_URL` via `src/lib/apiConfig.ts` across `auth.tsx`, `damageApi.ts`, and `deployments.ts` (with `http://localhost:8080` fallback in local dev).
- Create Event stays in React memory.
- Canvas reservation API wiring is now in-scope (current-sprint priority).
- Catalog cutout in the modal is a chroma-key, not the API model (known limitation/blocker for manuscripts/defense).

## 3. Current status

- **Canonical Production Hostname:** `lumieredemo-seven.vercel.app`
- **Confirmed Next Task:** Canvas Reservation API Wiring (`POST /api/reservations/bulk`).
- **Backend CORS & Security:** Backend (`Shunrenn/Lumiere`) CORS policy locks allowed origins dynamically and disables `login-debug` in Production.
