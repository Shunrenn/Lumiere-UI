# AGENTS.md

SPA repo for Lumiere. Product docs for this tree live in `docs/`. The API and the rest of the suite live in [Shunrenn/Lumiere](https://github.com/Shunrenn/Lumiere).

## Guardrails

- Login and API calls use `VITE_API_URL` in new code. Do not add `localhost:8080` hardcodes.
- Catalog cutouts are the API `IBackgroundRemovalService`. The modal chroma-key is not the model. No vision vendor key in this SPA.
- State Synchronization: Synchronization is **checkpoint-based synchronization via periodic polling and focus-triggered refetch** (30s polling + window focus refetch), not WebSockets or real-time streaming. Do not describe Lumière sync as "real-time" — use "current verified state" or "checkpoint-based".
- Do not treat git-history writeups as requirements.
- No AI attribution tags on commits, PRs, or file headers (Cursor, Claude, Codex, Antigravity, Copilot). Optional hook: `core.hooksPath .githooks`. Do not run `git config` from an agent unless a human asked.


## Frontend architecture guardrails

- The browser is not an authorization authority. Server responses and JWT-backed API checks decide access.
- Do not add or extend browser-held credentials, PINs, vendor keys, or authorization decisions. Any migration away from existing browser token/session handling must preserve logout, expiry, refresh, and offline behavior through tested API contracts.
- Do not add direct browser CRUD calls to Supabase. Migrate remaining manning and preset-squad behavior behind versioned API contracts before removing the legacy client paths.
- Do not add SignalR, WebSocket, or Supabase Realtime behavior. Remove an existing real-time path only after polling and focus-refetch behavior has been verified for the affected workflow.
- Client-side chroma-key work may be labelled only as a preview. It must never be represented as a production catalog cutout.
- Do not add direct database access from Vercel functions. The SPA and its hosting functions communicate with the Railway API; EF owns the Postgres schema.
- Preserve intentional route-level lazy loading. When changing large UI areas, check build output for unwanted static/dynamic import mixing and oversized entry chunks.

SAD-A2 materializes to `.cursor/rules/sad-spa-production-wire.mdc`. Canonical card is `docs/sad-lumiere.md` in the API repo.

## Tools, CLIs, and MCP

This tree is the Vercel SPA. API deploy is Railway in Shunrenn/Lumiere.

- `pnpm` install, dev, build
- `gh` pull requests
- `vercel` for env, deploy, logs (`vercel env`, `vercel logs`, `vercel --prod`). Never set JWT or `BackgroundRemoval__ApiKey` here. Only `VITE_API_URL`.
- Vercel MCP `plugin-vercel-vercel` when authenticated (`mcp_auth` if `needsAuth`). Inspect projects and deployments. Do not print secrets.
- Supabase MCP is for the API/data plane. Do not treat browser Supabase as login identity.

Full list: API repo `docs/build-lumiere.md` §7.

## Standing Verification Rule

STANDING VERIFICATION RULE: Never report a task as done, complete, verified, or working based only on a clean build (pnpm build passing) or a successful deploy. These only prove the code compiles — not that the feature works. Before claiming any task complete: (1) run a real curl/HTTP test against the live production API and show raw request/response, or a real browser test with actual screenshots — not text descriptions of what should render; (2) show the actual git diff of every changed file; (3) if a claim can't be verified this way, say so explicitly instead of guessing or fabricating plausible-sounding output. This rule applies to every task, every session, without exception.

