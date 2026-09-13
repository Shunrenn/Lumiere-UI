# Lumiere UI

Vite + React SPA for Lumiere. Paper-and-ink warehouse and event shells. API requests read `import.meta.env.VITE_API_URL` via `src/lib/apiConfig.ts` (defaulting to `http://localhost:8080` in local development mode).

The API lives in [Shunrenn/Lumiere](https://github.com/Shunrenn/Lumiere). This repo's docs cover the design system, Vercel deploy, canvas, and ground crew. You can read them without cloning the API. Field pairs for Create Event and damage live in the API repo file `docs/contracts-fe-be.md`.

## Run locally

1. `pnpm install`
2. `pnpm dev`
3. Open `http://localhost:5173`. Sign in with a seeded API email such as `warehouseops@lumiere.com` and password `lumiere2026` against a local API on 8080.

Create Event stays in React memory (`e-${Date.now()}`). Warehouse catalog and dispatch stores are not the EF tables.

## Tools

API requests use `import.meta.env.VITE_API_URL` via `src/lib/apiConfig.ts`. Agents: [AGENTS.md](AGENTS.md). Vercel how-to: [docs/howto-deploy-vercel.md](docs/howto-deploy-vercel.md).

- `pnpm` install, dev, build
- `vercel` env, deploy, logs. Only `VITE_API_URL` on Vercel. Never JWT or `BackgroundRemoval__ApiKey`.
- `gh` pull requests
- Vercel MCP `plugin-vercel-vercel` when authenticated. Do not print secrets.

## Docs

Index: [docs/index.md](docs/index.md). Design tokens: [docs/dsd-lumiere.md](docs/dsd-lumiere.md). Catalog cutouts are an API service, not the modal chroma-key.
