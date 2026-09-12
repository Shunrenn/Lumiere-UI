# AGENTS.md

SPA repo for Lumiere. Product docs for this tree live in `docs/`. The API and the rest of the suite live in [Shunrenn/Lumiere](https://github.com/Shunrenn/Lumiere).

## Guardrails

- Login and API calls use `VITE_API_URL` in new code. Do not add `localhost:8080` hardcodes.
- Catalog cutouts are the API `IBackgroundRemovalService`. The modal chroma-key is not the model. No vision vendor key in this SPA.
- Do not treat git-history writeups as requirements.
- No AI attribution tags on commits, PRs, or file headers (Cursor, Claude, Codex, Antigravity, Copilot). Optional hook: `core.hooksPath .githooks`. Do not run `git config` from an agent unless a human asked.

SAD-A2 materializes to `.cursor/rules/sad-spa-production-wire.mdc`. Canonical card is `docs/sad-lumiere.md` in the API repo.
