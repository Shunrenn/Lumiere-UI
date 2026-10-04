---
name: lumiere-spa-api-slice
description: Safely migrate one Lumiere SPA workflow from browser-side data access to an authenticated Railway API contract.
disable-model-invocation: true
---

# Lumiere SPA API slice

Use this skill when migrating a single frontend workflow, such as manning or preset squads, to the API.

## Before editing

Read `AGENTS.md`, the feature's current UI/state files, API client conventions, and the matching backend endpoint contract. If no complete API contract exists, stop after documenting the missing contract; do not invent database access in the SPA.

## Implement

1. Keep the feature boundary small: one workflow and its DTOs at a time.
2. Add typed API-client methods using `VITE_API_URL` and the established authenticated request helper.
3. Preserve loading, empty, failure, retry, and permission-denied states.
4. Replace direct Supabase or database calls only after the API contract covers the required reads and writes.
5. Keep synchronization checkpoint-based with polling and focus refetch; do not use WebSockets, SignalR, or Realtime.
6. Remove the legacy data path only after the new path has verification evidence.

## Do not

- Put vendor keys, database credentials, or service-role tokens in browser code or Vercel variables.
- Create direct browser mutations to Postgres, Supabase, or a Vercel database handler.
- Claim client preview processing is the production background-removal result.

## Verify

Run `pnpm build`, then verify the target workflow with authenticated browser or HTTP evidence against the intended API origin. Record any backend contract gap rather than masking it with a browser workaround.
