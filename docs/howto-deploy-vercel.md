# How to deploy the frontend on Vercel

You will host the Vite SPA on Vercel so browsers load it over HTTPS. This is the frontend half of the north star. It is not complete until the API URL is Railway HTTPS and CORS allows this origin.

## Prerequisites

- This repository builds with `pnpm build`
- Vercel CLI (`vercel login`, then `vercel link` in this repo) or the dashboard
- A Railway API origin you can paste as `VITE_API_URL` (no trailing slash)
- The API CORS list includes this Vercel hostname

## Steps

1. Create a Vercel project with this repository as the root (the folder that contains `package.json`). CLI: `vercel link`. The canonical production hostname is `lumieredemo-seven.vercel.app`. Note: this hostname must match exactly what is configured in the backend's CORS allow-list (`VercelProductionPolicy` in `Program.cs` of Shunrenn/Lumiere).
2. Build command `pnpm build`. Output `dist`.
3. Set env `VITE_API_URL` to `https://<your-railway-host>` (`vercel env add VITE_API_URL` or the dashboard). Rebuild after the env change. Vite inlines it at build time. Confirm with `vercel env ls`. Do not print values into docs.
4. Do not set JWT secrets or `BackgroundRemoval__ApiKey` on Vercel. The SPA never signs tokens.
5. The SPA reads `VITE_API_URL` via `src/lib/apiConfig.ts`. Run `vercel --prod` to deploy to production and log in from the Vercel origin.
6. Logs: `vercel logs`. Authenticated Vercel MCP may inspect deployments the same way.

## Verification

From the hosted page, DevTools Network shows `POST https://<railway>/api/auth/login` with status 200 and no mixed-content errors.

## Troubleshooting

> **Confirmed as of 2026-09-13** — production Vercel deployment reads `import.meta.env.VITE_API_URL` via `src/lib/apiConfig.ts`. Ensure `VITE_API_URL` environment variable is configured in Vercel.

- Still posting to `http://localhost:8080`: verify that `VITE_API_URL` is set in Vercel environment settings and that a redeploy (`vercel --prod`) was triggered after setting it.
- CORS error: add this exact Vercel origin to `VercelProductionPolicy` in `Program.cs` of Shunrenn/Lumiere.
- `api/deployments` 500: `DATABASE_URL` Neon path. Confirmed decision: this endpoint is being deprecated, and its failure should not block login or any other flow.
