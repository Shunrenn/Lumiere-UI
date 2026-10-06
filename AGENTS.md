# Lumiere-UI Agent Guide

Authoritative development, architecture, and operational instructions for coding agents working on `Lumiere-UI`.

---

## Project Overview

`Lumiere-UI` is the single-page application (SPA) frontend for Lumière, an operational event styling and logistics platform. It communicates with a backend REST API in [Shunrenn/Lumiere](https://github.com/Shunrenn/Lumiere).

---

## Tech Stack

- **Framework:** React 19 (`react`, `react-dom`)
- **Language:** TypeScript 5.7+
- **Bundler:** Vite 6
- **Package Manager:** `pnpm`
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`), Vanilla CSS tokens
- **Graphics & PDF:** Konva 10 / `react-konva`, `html2canvas`, `jspdf`
- **Icons:** `lucide-react`
- **Static Production Server:** `sirv-cli`
- **Hosting Target:** Railway

---

## Commands

```powershell
# Install dependencies (strictly use pnpm)
pnpm install

# Start local development server (Vite on http://localhost:5173)
pnpm run dev

# Typecheck and build production bundle into dist/
pnpm run build

# Typecheck codebase (zero emit)
pnpm run lint

# Preview production build locally
pnpm run preview

# Production start command (used on Railway)
sirv dist --host 0.0.0.0 --port $PORT --single
```

---

## Source Layout

```text
src/
├── components/           # UI components organized by domain & shared primitives
│   ├── admin/            # Admin console shells, workforce tables, RBAC modals
│   ├── canvas/           # Konva 2D spatial canvas viewport and pegged assets
│   ├── dashboard/        # Overview widgets, pending user actions, trend charts
│   ├── executive/        # Executive analytics, event pipeline panels
│   ├── executive-lite/   # Lightweight executive views
│   ├── project-manager/  # PM event workspace, proposal pitch modals
│   ├── pwa/              # Mobile PWA header, bottom navigation, card layouts
│   ├── warehouse/        # Asset catalog, dispatch manifests, manpower, replenishment
│   └── [shared UI]       # ConsoleLayout, ConsoleSidebar, Modals, Badges, Skeleton
├── features/             # Sliced domain HTTP REST API clients
│   ├── access-requests/  # api.ts
│   ├── admin/            # api/ (adminPermissionsApi)
│   ├── audit/            # api/ (auditApi)
│   ├── budget/           # api/ (budgetApi)
│   ├── canvas/           # api/ (canvasApi)
│   ├── damage/           # api/ (damageApi)
│   ├── events/           # api/ (eventsApi, reservationsApi)
│   ├── inventory/        # api/ (assetsApi, deficitApi, paintApi)
│   ├── manning/          # api/ (manningApi)
│   ├── notifications/    # api/ (notificationsApi)
│   ├── planner/          # api.ts
│   ├── production/       # api/ (productionApi)
│   ├── roster/           # api.ts
│   ├── vendors/          # api/ (vendorApi)
│   └── warehouse/        # api/ (dispatchApi, partialEgressApi)
├── lib/                  # Core client utilities, domain logic, stores, auth, offline
│   ├── auth.tsx          # JWT authentication context, session storage, login
│   ├── realtime.ts       # SignalR Operations Hub connection and event dispatch
│   ├── store.tsx         # Central business context (PortalProvider)
│   ├── types.ts          # Domain TypeScript models & DTOs
│   ├── utils.ts          # Helper utilities re-exporting from shared/utils
│   └── warehouse-*.ts    # Warehouse domain logic modules
├── pages/                # Lazy-loaded route page components
├── shared/               # Common infrastructure, canonical types, and utilities
│   ├── api/apiConfig.ts  # Canonical API base URL, JWT token retrieval, 401 interception
│   ├── types/index.ts    # Canonical cross-domain shared types
│   └── utils/index.ts    # Common utility functions (cn, expandDateRange)
├── App.tsx               # Provider hierarchy, authentication gate, router mount
└── main.tsx              # Application entry point
```

Path alias `@/` is configured in `vite.config.ts` and `tsconfig.json` to resolve to `<root>/src`.

---

## Architecture Rules

1. **Authorization Authority:** The browser is never an authorization authority. Server responses and JWT claims govern all access.
2. **State Synchronization:** State synchronization combines **active SignalR Operations Hub invalidation** (`/hubs/operations` via `src/lib/realtime.ts`) with **checkpoint-based 30-second periodic polling and window focus refetch**. Do NOT introduce unvetted third-party real-time connections, ad-hoc WebSockets, or Supabase Realtime listeners.
3. **Database Access:** The frontend communicates strictly with the C# REST API. Do NOT add new direct browser database access, direct PostgreSQL connections, or Supabase CRUD calls.
4. **Code Splitting:** Route-level lazy loading (`React.lazy` / dynamic imports) is mandatory for large page trees (e.g., `CanvasWorkspacePage`, `ProductionDetailModal`, `jspdf`). Do NOT convert lazy imports back to eager imports.
5. **No AI Attribution Trailers:** Do NOT include AI attribution tags (`Co-authored-by:`, `Made with:`, `Cursor`, `Claude`, `Codex`, `Antigravity`, `Copilot`) in commit messages, pull requests, or file headers. Hook: `core.hooksPath .githooks`.

---

## API Rules

- **Base URL:** All API calls use `API_BASE_URL` from `src/shared/api/apiConfig.ts`, which reads `import.meta.env.VITE_API_URL`. Never hardcode `http://localhost:8080`. Production builds fail closed if `VITE_API_URL` is omitted.
- **Authentication Headers:** Authenticated calls must attach `Authorization: Bearer <token>` retrieved via `getAuthToken()` in `src/shared/api/apiConfig.ts`.
- **401 Unauthorized Interception:** Global 401 interception in `src/shared/api/apiConfig.ts` dispatches a `lumiere:unauthorized` window event to safely clear invalid sessions.
- **Feature APIs:** All domain HTTP API clients live under `src/features/<domain>/api/` or `src/features/<domain>/api.ts`. Do not place HTTP API clients in `src/lib/`. Do not mix UI state into API files.
- **Catalog Cutouts:** Catalog background removal is performed exclusively on the backend via `IBackgroundRemovalService`. Client-side chroma-key processing is strictly a preview.

---

## Authentication Rules

- **Token Storage:** Authenticated user sessions store the JWT in `_lumiere_auth_token` in `localStorage` (or `sessionStorage` when Remember Me is unchecked).
- **Session Hierarchy:** `AuthProvider` in `src/lib/auth.tsx` provides `useAuth()`. Never invoke `useAuth()` outside the `AuthProvider` boundary.
- **Role Verification:** Client role checks via `route-guard.ts` provide UX gating only; all sensitive mutations are re-authorized by the backend API.
- **Do Not Replace Auth:** Do NOT attempt to replace JWT authentication with Supabase Auth or third-party auth vendors.

---

## State and Providers

The provider hierarchy in `src/App.tsx` must remain structured as follows:

```text
AuthProvider
  └── PortalProvider
        └── PlannerProvider
              └── WarehouseProvider
                    └── NavProvider
                          └── AdminGrowthSummaryProvider
                                └── Gate
                                      └── Router
```

Do not dismount or relocate providers if doing so affects downstream context availability.

---

## Legacy Boundaries

All former direct Supabase access has been completely decommissioned and migrated to the C# REST API endpoints (`/api/manning/*`). Zero direct database queries or clients remain in the frontend application.

---

## Styling and UI

- Use Tailwind CSS v4 utility classes and existing CSS custom properties defined in `src/index.css`.
- Support both Light and Dark modes (`.dark`).
- Preserve responsive desktop (`ConsoleLayout`) and mobile PWA viewports (`.mobile-shell`, `PwaHeader`).
- Standardize on shared UI components in `src/components/` (`StatusBadge`, `CompactStatStrip`, `ConfirmDialog`, `EmptyState`, `LoadingSkeleton`, `ErrorFallback`).

---

## Build and Validation

Before claiming any task complete:

1. **Lint Check:** Run `pnpm run lint` (`tsc -b --noEmit`). Must exit with code 0.
2. **Build Check:** Run `pnpm run build` (`tsc -b && vite build`). Must compile with code 0.
3. **Known Non-fatal Warnings:**
   - `@microsoft/signalr` PURE annotation rollup comment warning.
   - Large chunk warnings (>500 kB) for canvas workspace and PDF export bundles.

---

## Deployment

- **Platform:** Railway
- **Config:** Managed via Railway project settings; deployment serves static output from `dist/`.
- **Runtime Command:** `sirv dist --host 0.0.0.0 --port $PORT --single`
- **Environment Variables Required:**
  - `VITE_API_URL` — Full URL to the live backend API (e.g. `https://lumiere-production-f6a1.up.railway.app`).
- Do NOT restore Vercel configurations (`vercel.json`, `api/deployments.ts`, or `@neondatabase/serverless`).

---

## Git Safety

- Never run destructive Git commands (`git reset --hard`, `git clean -fd`, `git checkout .`, `git restore .`).
- Inspect working tree changes before and after edits using:
  ```powershell
  git status -s
  git diff --stat
  ```
- Do not commit or push automatically unless explicitly instructed by the user.

---

## Do Not

- Do NOT perform unrequested UI redesigns or alter color palettes.
- Do NOT alter backend API contracts or DTO field naming.
- Do NOT re-introduce Vercel serverless functions or Vercel CLI instructions.
- Do NOT install dependencies with `npm` or `yarn` (use `pnpm` exclusively).
- Do NOT create circular dependencies between stores and API clients.

---

## Definition of Done

**STANDING VERIFICATION RULE:** Never report a task as done, complete, verified, or working based only on a clean build (`pnpm build` passing). Before claiming completion:
1. Provide real curl/HTTP test evidence against the backend API, or live browser verification evidence.
2. Provide the exact `git status -s` and `git diff --stat` showing all modified files.
3. Explicitly report any limitations or unverifiable claims instead of guessing.
