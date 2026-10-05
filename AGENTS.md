# Lumiere-UI Agent Guide

## Project Overview

Frontend project: `Lumiere-UI`. 
React + TypeScript + Vite SPA.

## Tech Stack

- React 19
- TypeScript
- Vite
- pnpm
- Custom frontend routing

## Commands

- **Package Manager:** Use `pnpm`. Do not introduce npm lockfiles, yarn, or bun unless intentionally migrating the project.
- **Installation:** `pnpm install`
- **Development:** `pnpm run dev`
- **Build:** `pnpm run build`. Build must succeed before considering work complete.
- **Lint:** `pnpm run lint`

## Source Layout

- `src/features/`: Contains domain-specific feature modules (e.g. `admin`, `inventory`, `warehouse`).
- `src/shared/`: Shared, cross-domain code (e.g. types, utility functions, shared API config).
- `src/pages/`: Top-level route components.
- `src/components/`: Reusable UI components.
- `src/lib/`: Remaining providers and domain modules (legacy dumping ground, do not add generic APIs here).

## Architecture Rules

- **Shared Code:** Only truly cross-domain code should go in `src/shared/`. Do not move feature-specific code into shared merely for convenience.
- **Routing:** Preserve existing routes unless explicitly requested. Do not mass-rewrite router architecture unnecessarily.

## API Rules

- **Backend Boundary:** New frontend database behavior must go through the C# API. Do not add new direct PostgreSQL/Supabase table operations in browser code.
- **API Placement:** New feature APIs belong in `src/features/<feature>/api/`. Shared API infrastructure belongs in `src/shared/api/`. Do not recreate the old generic API dumping ground in `src/lib/`.

## Authentication Rules

- **Architecture:** Preserve the existing custom JWT architecture (`AuthProvider`, `useAuth`, backend `/api/auth/login`, localStorage/sessionStorage persistence, role-aware access).
- **Restrictions:** 
  - Do not use `useAuth()` outside `AuthProvider`.
  - Do not replace JWT auth with Supabase Auth.
  - Do not bypass role checks, hardcode auth tokens, or create alternate login systems.
  - Do not change auth architecture without explicit requirement.

## State and Providers

- Synchronization is checkpoint-based via periodic polling and focus-triggered refetch. Do not add SignalR, WebSocket, or Supabase Realtime behavior.

## Legacy Boundaries

- **LEGACY — DO NOT EXPAND:** Direct Supabase modules (`src/lib/manning.ts` and `src/lib/warehouse-crew.ts`) remain. They should eventually move behind C# API contracts. Clarify Supabase environment variables are legacy while direct dependencies remain.

## Styling and UI

- TailwindCSS is used for styling.
- Catalog cutouts are generated only by the API. Client chroma-key processing is preview-only.

## Build and Validation

- Build must succeed with `pnpm run build`.
- **Build Warnings:** SignalR PURE annotation warning and Vite large chunk warning are known non-fatal warnings. Do not tell future agents to hide warnings instead of fixing actual regressions.
- **Validation:** Never report a task as done based only on a clean build. Verify changes via authenticated HTTP evidence against the API origin or actual browser test screenshots.

## Deployment

- **Target:** Railway is the active deployment target.
- **Production Server:** `sirv dist --host 0.0.0.0 --port $PORT --single`
- **Restrictions:** Do not recreate `vercel.json`, `api/` serverless functions, or Vercel deployment docs unless explicitly instructed.
- **Environment Variables:** Only document actively used variables (`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Do not expose server secrets with `VITE_*`.

## Git Safety

- Never automatically run destructive commands (e.g. `git reset --hard`, `git clean -fd`, `git checkout .`) when a working tree contains user work.
- Always inspect `git status -s` and `git diff` before destructive changes.
- Do not commit `node_modules/`, `dist/`, logs, or temporary migration scripts unless explicitly required.

## Do Not

- Do not redesign the application or rewrite unrelated frontend features.
- Do not modify the C# backend.
- Do not tell future agents to expand direct browser database access.
- Do not treat git-history writeups as requirements.

## Definition of Done

- Code satisfies user requirements.
- Build succeeds (`pnpm run build`).
- Functional test verifies the change works against real endpoints/browser.
- No unexpected architectural regressions or mixed static/dynamic lazy boundaries.
