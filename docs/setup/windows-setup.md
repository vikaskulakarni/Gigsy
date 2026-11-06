# Windows developer setup

For a completely fresh clone, follow the [Clone and run guide](./clone-and-run.md). It explains prerequisites, the one-time schema bootstrap, first-run database creation and health checks.

## Prerequisites

- Windows 10/11 and PowerShell.
- Node.js 22 LTS and npm.
- Python 3.11 (preferred) or 3.13 (64-bit) with the `py` launcher.
- MySQL Server 8.x.
- Internet access for package installation and the first embedding-model download.

## Guided launcher

From the repository root:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\scripts\windows\RUN_GIGSY.ps1
```

On a fresh clone, the launcher invokes the setup script. Setup creates an isolated `gigsy_dev` database and a dedicated `gigsy_app` user, imports the checked-in DDL-only bootstrap, generates local secrets, installs dependencies, launches both services and waits for health checks.

If you already have `.env.local`, the launcher preserves it and repairs missing dependencies without replacing your credentials.

## Explicit setup

```powershell
.\scripts\windows\setup-gigsy.ps1
```

Then use the guided launcher to start both services:

```powershell
.\scripts\windows\RUN_GIGSY.ps1
```

## Health checks

- Application and MySQL: http://localhost:3000/api/health
- FastAPI and ChromaDB: http://localhost:8001/health

Keep both service windows open while using the application. The first semantic indexing/search request may download the embedding model.

## Maintainer-only schema export

To refresh the DDL-only bootstrap from the current verified database, use:

```powershell
.\scripts\windows\export-bootstrap-schema.ps1
```

Review and commit the generated `database/bootstrap/gigsy_schema.sql`. This export contains no application data and must only be imported into a new, empty development database.

## Security

- Never commit `.env.local` or `semantic_service/.env`.
- Do not share MySQL administrator passwords or generated service secrets.
- Do not import the bootstrap into an existing populated database.
