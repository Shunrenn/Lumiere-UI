---
name: lumiere-frontend-audit
description: Audit the Lumiere React SPA for production architecture, security, sync, API-boundary, and bundle-regression risks.
disable-model-invocation: true
---

# Lumiere frontend audit

Use this skill for a read-first audit of `Lumiere-UI`.

## Read first

1. `AGENTS.md`
2. `docs/index.md`
3. `docs/dsd-lumiere.md`
4. The feature files, API client, auth provider, and route entry points in scope.

## Inspect

- Confirm production API requests use `VITE_API_URL` and do not silently fall back to localhost.
- Find direct browser Supabase, database, Vercel-function, SignalR, WebSocket, and Realtime calls.
- Check that synchronization remains 30-second polling plus focus-triggered refetch.
- Check browser storage for PINs, credentials, authorization state, or unnecessary durable tokens.
- Distinguish client previews from server-authoritative catalog cutout processing.
- Inspect lazy routes and build output for static/dynamic import mixing and material bundle growth.
- Identify files by evidence: import graph, runtime route use, deployment configuration, or asset reference. Never label a file safe to delete merely because it appears old.

## Report

Classify findings as: production risk, migration needed, cleanup candidate, or informational. Include the file path, the evidence, the user impact, and the safest next step. Do not remove files, alter deployments, or change database state during an audit unless separately authorized.

## Verify

Run `pnpm build` after a code change. Treat a successful build as compile evidence only; use authenticated HTTP or browser evidence before claiming a workflow works.
