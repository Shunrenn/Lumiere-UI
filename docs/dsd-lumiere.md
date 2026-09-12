# Design System (DSD)

**Project:** Lumiere
**Date:** 2026-09-12
**Version:** 0.1
**Owner:** Lumiere team
**Status:** Draft
**Last reconciled:** 2026-09-12

Observed from the SPA. Not a new brand invention. No impeccable init this pass. Usable without other docs.

## 1. Brand stance (as-built)

Paper and ink. Warm cream field `#f5f0e8`, walnut primary `#9b6b3f`, serif headings (Georgia), sans body (Arial). Cards class `paper-card`. Eyebrow labels in small caps. Destructive `#a84d3b`.

Name in UI copy: Lumière (accent) on some screens, Lumiere in code.

## 2. Color and type

Tokens live in `src/index.css` `:root` and Tailwind `@theme`. Dark mode is a class on `<html>` via `src/lib/theme.ts` (`lumiere-theme-mode`, legacy `lumiere-dark`).

Do not introduce a second palette in new screens.

## 3. Shells

| Shell | Who | Pattern |
|-------|-----|---------|
| Admin | Admin | Left rail (`admin-destinations.ts`): system dashboard, workforce, damage, rbac, security-audit |
| Executive | Executive | Rail (`executive-destinations.ts`): dashboard, registry, damage, logs |
| Planner | Event Planner | `ConsoleSidebar` destination Design Canvas only |
| Warehouse desktop | WOM full access | Module grid `WarehouseHomePage`, not a forever-sidebar home |
| Mobile portal | Ground Crew and some WOM sub-roles | Full-viewport pages, `portal === 'pwa'` |

`App.tsx` `Gate` is the only hard access check besides web vs pwa mismatch (`PortalAccessError`).

## 4. Canvas

Canva-like hub (`DesignCanvasHubPage`) then Konva infinite artboard (`CanvasWorkspacePage`): left tools, right logistics. Keep that split. Allocation UI must look like a commit, not a sticky note, once it hits the API.

## 5. Motion and density

Warehouse tables are dense. Planner is sparse and large. Do not make Ground Crew look like the executive dashboard. Touch targets on pwa routes need 44px class targets; several screens currently look like shrunk desktop. Treat that as debt, not a new style.

## 6. Out of scope this Draft

Component inventory of every modal. Screenshot goldens. Impeccable gate.
