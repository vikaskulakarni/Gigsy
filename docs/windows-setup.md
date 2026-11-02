# Windows developer setup

## Prerequisites

- Node.js 22 LTS and npm.
- Python 3.11 or 3.13 (64-bit) with the `py` launcher.
- MySQL Server and the existing Gigsy database.
- PowerShell.
- Internet access for package installation and the first embedding-model download.

## Option A: guided launcher

From the repository root:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\RUN_GIGSY.ps1
```

The launcher checks local runtimes, performs setup when needed, starts the semantic and Next.js services in separate PowerShell windows, and checks the MySQL API health endpoint.

## Option B: explicit setup

Run the one-time setup:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup-gigsy.ps1
```

The script asks for your current local MySQL root password and creates local environment files and secrets. It installs frontend and Python dependencies.

Then open two PowerShell terminals from the repository root:

**Terminal 1**
```powershell
.\start-semantic.ps1
```

**Terminal 2**
```powershell
.\start-gigsy.ps1
```

Open http://localhost:3000.

## Health checks

- Application/MySQL: http://localhost:3000/api/health
- Semantic service: http://localhost:8001/health

## Database migration

If the hiring workflow migration has not been applied to the existing database, review [hiring-workflow.md](./hiring-workflow.md) and run ` .\apply-hiring-migration.ps1` from the repository root.

## Important

- Keep `.env.local` and `semantic_service/.env` private.
- Do not delete or recreate your existing database.
- Keep both service windows open while using the app.
- The first semantic-service startup downloads the embedding model.
