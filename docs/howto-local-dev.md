# How to run the SPA locally

You will have Vite on port 5173. In local development, API requests default to `http://localhost:8080` via `src/lib/apiConfig.ts` unless `VITE_API_URL` is set.

## Prerequisites

- `pnpm`
- A running Lumiere API on port 8080 (clone Shunrenn/Lumiere, `dotnet run --project Lumiere.API/Lumiere.API.csproj`)
- Production env (`VITE_API_URL`) is set with Vercel CLI or the dashboard, not in this local file. Never a JWT secret in this SPA.

## Steps

1. `pnpm install`
2. `pnpm dev`
3. Open `http://localhost:5173`. Sign in with a seeded API email such as `warehouseops@lumiere.com` and password `lumiere2026`.

## Verification

The SPA stores `_lumiere_auth_token` after a 200 from `POST http://localhost:8080/api/auth/login`.

## Troubleshooting

- SPA on HTTPS or a hosted URL cannot use localhost API (mixed content). Use the local Vite origin.
- Empty warehouse after refresh: Create Event is still in-memory. Expected until the API is wired.
