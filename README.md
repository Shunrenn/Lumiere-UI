# Lumiere UI

Vite + React SPA for Lumiere. Paper-and-ink warehouse and event styling shells. API requests read `import.meta.env.VITE_API_URL` via `src/shared/api/apiConfig.ts` (defaulting to `http://localhost:8080` in local development mode).

The API lives in [Shunrenn/Lumiere](https://github.com/Shunrenn/Lumiere). This repo's docs cover the design system, canvas, and ground crew. You can read them without cloning the API.

## Run locally

1. `pnpm install`
2. `pnpm dev`
3. Open `http://localhost:5173`. Sign in with a seeded API email such as `warehouseops@lumiere.com` and password `lumiere2026` against a local API on 8080.

## Commands

- `pnpm install` — Install dependencies
- `pnpm run dev` — Start Vite local dev server
- `pnpm run build` — TypeScript typecheck and Vite production build
- `pnpm run lint` — TypeScript check (`tsc -b --noEmit`)
- `pnpm start` — Production server (`sirv dist --host 0.0.0.0 --port $PORT --single`)

## Agent Guide

Authoritative development, architecture, and operational instructions for coding agents live in [AGENTS.md](AGENTS.md).

## Docs

Index: [docs/index.md](docs/index.md). Design tokens: [docs/dsd-lumiere.md](docs/dsd-lumiere.md). Catalog cutouts are an API service, not the modal chroma-key.
