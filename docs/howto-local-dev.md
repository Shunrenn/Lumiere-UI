# How to run the SPA locally

You will have Vite on port 5173. Login still posts to `http://localhost:8080/api/auth/login` until the code reads `VITE_API_URL`.

## Prerequisites

- pnpm
- A running Lumiere API on port 8080 (clone Shunrenn/Lumiere, `dotnet run --project Lumiere.API/Lumiere.API.csproj`)

## Steps

1. `pnpm install`
2. `pnpm dev`
3. Open `http://localhost:5173`. Sign in with a seeded API email such as `warehouseops@lumiere.com` and password `lumiere2026`.

## Verification

The SPA stores `_lumiere_auth_token` after a 200 from `POST http://localhost:8080/api/auth/login`.

## Troubleshooting

- SPA on HTTPS or a hosted URL cannot use localhost API (mixed content). Use the local Vite origin.
- Empty warehouse after refresh: Create Event is still in-memory. Expected until the API is wired.
