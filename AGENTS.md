# AGENTS.md

SPA repo for Lumiere. Product docs for this tree live in `docs/`. The API and the rest of the suite live in [Shunrenn/Lumiere](https://github.com/Shunrenn/Lumiere).

## Guardrails

- Login and API calls use `VITE_API_URL` in new code. Do not add `localhost:8080` hardcodes.
- Catalog cutouts are the API `IBackgroundRemovalService`. The modal chroma-key is not the model. No vision vendor key in this SPA.
- Do not treat git-history writeups as requirements.
- No AI attribution tags on commits, PRs, or file headers (Cursor, Claude, Codex, Antigravity, Copilot). Optional hook: `core.hooksPath .githooks`. Do not run `git config` from an agent unless a human asked.

SAD-A2 materializes to `.cursor/rules/sad-spa-production-wire.mdc`. Canonical card is `docs/sad-lumiere.md` in the API repo.

## Tools, CLIs, and MCP

This tree is the Vercel SPA. API deploy is Railway in Shunrenn/Lumiere.

- `pnpm` install, dev, build
- `gh` pull requests
- `vercel` for env, deploy, logs (`vercel env`, `vercel logs`, `vercel --prod`). Never set JWT or `BackgroundRemoval__ApiKey` here. Only `VITE_API_URL`.
- Vercel MCP `plugin-vercel-vercel` when authenticated (`mcp_auth` if `needsAuth`). Inspect projects and deployments. Do not print secrets.
- Supabase MCP is for the API/data plane. Do not treat browser Supabase as login identity.

Full list: API repo `docs/build-lumiere.md` §7.
