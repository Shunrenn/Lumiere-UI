# Documentation Index: Lumiere UI

**Project slug:** `lumiere`
**Maintained by:** Lumiere team
**Last updated:** 2026-09-12

SPA docs for this repository. Each file is usable alone. The API lives in Shunrenn/Lumiere.

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

Login from this SPA still posts to `http://localhost:8080`. Create Event stays in React memory. Canvas does not call `/api/reservations`.
