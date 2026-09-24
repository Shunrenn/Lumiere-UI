# Lumiere Local Development Setup Guide

This guide explains how to set up and run the entire **Lumiere** local development stack (frontend SPA + backend REST API) from scratch.

---

## 1. Local Stack Architecture

```
Lumiere-UI (Vite + React)
http://localhost:5173
        │ (REST API calls via VITE_API_URL + Bearer Token)
        ▼
Lumiere.API (ASP.NET Core 10)
http://localhost:8080
        │ (Entity Framework Core 10)
        ▼
EF Core InMemory Database (Seeded with test data)
```

> [!NOTE]
> This setup runs **100% locally**. It does not require or touch production Vercel, Railway, or Supabase credentials.

---

## 2. Prerequisites

Ensure you have the following installed on your developer machine:
- **Node.js**: v18.0+ or v20.0+
- **pnpm**: Package manager (v8, v9, or v10)
- **.NET 10 SDK**: Version `10.0.103` (specified in `global.json`)
- **Git**: Version control CLI

---

## 3. Installation Steps

### A. Frontend Repository (`Lumiere-UI`)

```bash
# Navigate to the frontend directory
cd Lumiere-UI

# Install dependencies
pnpm install
```

### B. Backend Repository (`Lumiere`)

```bash
# Navigate to the backend directory
cd Lumiere

# Restore .NET solution packages
dotnet restore Lumiere.slnx
```

---

## 4. Local Configuration Files

### Frontend Configuration (`Lumiere-UI`)
- Default local configuration file: `.env`
  ```env
  VITE_API_URL=http://localhost:8080
  ```
- Developer override file: `.env.local` (created from `.env.local.example`)
  - To test against local backend: `VITE_API_URL=http://localhost:8080`
  - To test against deployed Railway API: `VITE_API_URL=https://<railway-domain>.up.railway.app`

### Backend Configuration (`Lumiere.API`)
- Default configuration template: `Lumiere.API/appsettings.Development.json.example`
- Optional local overrides file: `Lumiere.API/appsettings.Development.json`
  - `USE_IN_MEMORY_DB`: `"true"` (default fallback when no Postgres connection string is provided)
  - `Jwt:Secret`: `"LumiereSuperSecretDevelopmentKey2026!ForDevOnly"`

> [!CAUTION]
> **Files that MUST NEVER be committed to Git**:
> - `.env.local` or `.env.*.local`
> - `appsettings.Development.json` (if containing real DB strings or vendor API keys)
> - Any file containing production Supabase, Railway, or JWT production secrets.

---

## 5. Starting the Application Stack

### Step 1: Start the Backend REST API
Run from the `Lumiere` repository root:

```bash
dotnet run --project Lumiere.API/Lumiere.API.csproj
```

The backend server will start on port `8080`:
- **API Base URL**: `http://localhost:8080`
- **Swagger Documentation**: `http://localhost:8080/swagger`

---

### Step 2: Start the Frontend SPA
Run from the `Lumiere-UI` repository root:

```bash
pnpm dev
```

The Vite development server will start on port `5173`:
- **Frontend SPA URL**: `http://localhost:5173`

---

## 6. Seeded Test Account & Verification

Use the pre-seeded operational account to sign in:
- **Email**: `warehouseops@lumiere.com`
- **Password**: `lumiere2026`
- **Role**: Warehouse Operations Manager

On first login, you will be prompted to set a 6-digit security PIN (e.g. `123456`). After saving, you will land on the **Warehouse Operations Manager** dashboard.

---

## 7. How the Systems Interact

1. **Frontend → Backend Communication**:
   - `src/lib/apiConfig.ts` reads `VITE_API_URL` (defaulting to `http://localhost:8080` in dev).
   - Upon successful login via `POST /api/auth/login`, the backend issues a JWT auth token.
   - The SPA stores the token in `localStorage` under `_lumiere_auth_token`.
   - All subsequent HTTP requests attach `Authorization: Bearer <token>`.

2. **InMemory Database Mechanism**:
   - When no PostgreSQL connection string is supplied (or when `USE_IN_MEMORY_DB=true`), `Program.cs` activates EF Core's `UseInMemoryDatabase("LumiereDb")`.
   - `DbInitializer.cs` populates default roles, operational users, sample assets, events, and damage reports into memory upon API launch.

---

## 8. Troubleshooting Common Issues

| Symptom | Cause | Resolution |
|---|---|---|
| **CORS Error in Browser** | Backend origin missing | Ensure backend `Program.cs` includes `http://localhost:5173` in allowed origins (configured by default). |
| **API Requests Fail with 401** | Missing or expired JWT | Sign out and sign back in using `warehouseops@lumiere.com` / `lumiere2026` to generate a fresh token. |
| **Empty Data after Refresh** | InMemory DB reset | Stopping and restarting the backend resets the InMemory DB to seed state. This is expected behavior. |
| **Port 8080 Busy** | Another process using 8080 | Pass custom port `--urls "http://localhost:8080"` or free up port 8080 via Task Manager. |
