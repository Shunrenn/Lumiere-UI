# How to deploy the frontend on Vercel

You will host the Vite SPA on Vercel so browsers load it over HTTPS. This is the frontend half of the north star. It is not complete until the API URL is Railway HTTPS and CORS allows this origin.

## Prerequisites

- This repository builds with `pnpm build`
- Vercel CLI (`vercel login`, then `vercel link` in this repo) or the dashboard
- A Railway API origin you can paste as `VITE_API_URL` (no trailing slash)
- The API CORS list includes this Vercel hostname

## Steps

1. Create a Vercel project with this repository as the root (the folder that contains `package.json`). CLI: `vercel link`.
2. Build command `pnpm build`. Output `dist`.
3. Set env `VITE_API_URL` to `https://<your-railway-host>` (`vercel env add VITE_API_URL` or the dashboard). Rebuild after the env change. Vite inlines it at build time. Confirm with `vercel env ls`. Do not print values into docs.
4. Do not set JWT secrets or `BackgroundRemoval__ApiKey` on Vercel. The SPA never signs tokens.
5. After the SPA reads `VITE_API_URL` in code (it does not yet; `src/lib/auth.tsx` still hardcodes localhost), `vercel --prod` and log in from the Vercel origin.
6. Logs: `vercel logs`. Authenticated Vercel MCP may inspect deployments the same way.

## Verification

From the hosted page, DevTools Network shows `POST https://<railway>/api/auth/login` with status 200 and no mixed-content errors.

## Troubleshooting

- Still posting to `http://localhost:8080`: the SPA code has not been switched to `import.meta.env.VITE_API_URL`. The build env alone cannot fix that.
- CORS error: add this exact Vercel origin to `VercelProductionPolicy` in `Program.cs` of Shunrenn/Lumiere.
- `api/deployments` 500: `DATABASE_URL` Neon path. Target retires that function. Failures should not block login.
