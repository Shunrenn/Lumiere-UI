# Lumiere UI Instructions

This repository is Lumiere's Vite and React SPA deployed to Railway. Full authoritative guidance is defined in [AGENTS.md](AGENTS.md).

## Rules

- Use `VITE_API_URL` for API requests via `src/shared/api/apiConfig.ts`. Production must fail closed when it is missing.
- Feature HTTP REST API clients live under `src/features/<domain>/api/`. Runtime and state logic remain in `src/lib/`.
- The browser is never an authorization authority. Server responses and JWT-backed API checks decide access.
- Maintain active SignalR Operations Hub invalidation and checkpoint-based 30-second polling + focus refetch. Do not add unvetted WebSockets or Supabase Realtime listeners.
- Zero direct database access: All operations must go exclusively through the C# REST API.
- Catalog cutouts are generated only by the API `IBackgroundRemovalService`. Client chroma-key processing is preview-only and must not be represented as a cutout.
- Do not persist PINs, JWT secrets, vendor keys, or credentials in browser storage, source control, or environment variables.

## Verification

- Validate with `pnpm run lint` and `pnpm run build`.
- A successful build does not prove functionality. Verify feature changes using browser evidence or authenticated HTTP evidence against the intended API origin.
