# Lumiere UI Instructions

This repository is Lumiere's Vite and React SPA. The API belongs to the separate Lumiere backend repository.

## Rules

- Use `VITE_API_URL` for API requests. Production must fail closed when it is missing.
- The browser is never an authorization authority. Server responses and JWT-backed API checks decide access.
- Keep synchronization checkpoint-based: 30-second polling and focus refetch. Do not add SignalR, WebSocket, or Supabase Realtime requirements.
- Do not write application data directly to Supabase from the browser. Migrate remaining manning and preset-squad calls through the API.
- Catalog cutouts are generated only by the API `IBackgroundRemovalService`. Client chroma-key processing is preview-only and must not be represented as a cutout.
- Do not persist PINs, JWT secrets, vendor keys, or credentials in browser storage, source control, or Vercel environment variables.

## Verification

- Build with `pnpm build`.
- A successful build does not prove functionality. Verify feature changes using browser evidence or authenticated HTTP evidence against the intended API origin.
