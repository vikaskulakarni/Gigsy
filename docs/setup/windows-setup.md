# Windows developer setup

## Prerequisites

- Node.js 22 LTS and npm.
- Python 3.11 or 3.13 (64-bit) with the `py` launcher.
- MySQL Server and the existing Gigsy database.
- PowerShell and internet access for package/model downloads.

## Guided launcher

Run from the repository root:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\windows\RUN_GIGSY.ps1
```

The launcher checks local runtimes, creates local environment files when required, installs dependencies, starts the semantic and Next.js services in separate windows, and reports service URLs.

## Explicit setup

One-time setup:

```powershell
.\scripts\windows\setup-gigsy.ps1
```

Then start the services in separate PowerShell terminals from the repository root:

**Terminal 1 — semantic service**
```powershell
.\scripts\windows\start-semantic.ps1
```

**Terminal 2 — Next.js**
```powershell
.\scripts\windows\start-gigsy.ps1
```

Open http://localhost:3000.

## Health checks

- Application/MySQL: http://localhost:3000/api/health
- Semantic service: http://localhost:8001/health

## Database migration

Review [hiring workflow](../database/hiring-workflow.md) and the SQL migration before applying. If needed, run from the repository root:

```powershell
.\scripts\windows\apply-hiring-migration.ps1
```

## Important

- Keep `.env.local` and `semantic_service/.env` private.
- Do not delete or recreate the existing database.
- Keep both service windows open while using the app.
- First semantic-service startup downloads the embedding model.
