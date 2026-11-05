# Clone and run Gigsy on Windows

This guide is the supported first-run path for a teammate using a clean Windows machine.

## Requirements

Install these tools before cloning:

- Windows 10/11 and PowerShell.
- Node.js 22 LTS (includes npm).
- Python 3.11 (preferred) or 3.13, 64-bit, with the Windows `py` launcher.
- MySQL Server 8.x.
- Internet access for npm/Python packages and the first Sentence Transformers model download.

The setup script creates a separate local database named `gigsy_dev`. It does not copy the maintainer's user, gig, proposal, message, or other application data.

## One-time maintainer task: publish the schema-only bootstrap

A clean clone cannot initialize MySQL from application code alone. The repository must contain the current DDL for the 17 base tables, 3 views, review trigger and stored procedure.

On the maintainer's existing working copy, ensure `.env.local` points to the latest verified Gigsy database, then run:

```powershell
.\scripts\windows\export-bootstrap-schema.ps1
```

The script reads the database connection from `.env.local` and writes:

```
database/bootstrap/gigsy_schema.sql
```

The export uses `mysqldump --no-data`, includes views/routines/triggers, removes machine-specific DEFINER clauses and DROP statements, and refuses to save output unless it finds the expected database objects and no INSERT statements. Review the generated SQL before committing it. It contains schema only, not application rows or credentials.

Commit this file to the repository before asking teammates to run fresh setup.

## Teammate first run

Clone the repository and enter its root:

```powershell
git clone https://github.com/vikaskulakarni/Gigsy.git
cd Gigsy
```

Run the guided launcher:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\scripts\windows\RUN_GIGSY.ps1
```

On the first run, the scripts:

1. Check Node.js 22 and Python.
2. Ask for a local MySQL administrator username/password.
3. Create an isolated `gigsy_dev` database and a dedicated `gigsy_app` account.
4. Import the repository's schema-only bootstrap into that new empty database.
5. Verify the expected tables, views, trigger and stored procedure.
6. Generate local session and service secrets.
7. Create `.env.local` and `semantic_service/.env` (both are ignored by Git).
8. Install Node dependencies with `npm ci`.
9. Create the Python virtual environment and install `semantic_service/requirements.txt`.
10. Start FastAPI/ChromaDB and Next.js in separate PowerShell windows and check their health endpoints.

The setup does not import anyone's accounts or application data. Register a Client and a Freelancer account on the local instance and create test gigs to try the workflows.

## Local URLs

| Service | URL |
|---|---|
| Gigsy web application | http://localhost:3000 |
| Next.js + MySQL health | http://localhost:3000/api/health |
| FastAPI + ChromaDB health | http://localhost:8001/health |

Keep both service windows open while using Gigsy. The first semantic indexing/search operation may download the `sentence-transformers/all-MiniLM-L6-v2` model; allow internet access and wait for it to finish.

## Index gigs for semantic discovery

After creating one or more gigs, run:

```powershell
$secret = Read-Host "Enter the INDEXING_SECRET from .env.local"
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/admin/index-gigs -Headers @{"x-indexing-secret"=$secret}
```

Then use the Match page to test natural-language gig discovery.

## Existing local setup

If `.env.local` already exists, the launcher preserves it and does not regenerate secrets or replace database credentials. It installs missing dependencies and starts the configured services. Do not delete or recreate an existing database as a troubleshooting shortcut.

## Troubleshooting

- **Missing bootstrap SQL:** the maintainer has not yet committed `database/bootstrap/gigsy_schema.sql`. Ask the maintainer to run the one-time export task above.
- **MySQL connection refused:** start the MySQL Server service and confirm port 3306 is available.
- **MySQL access denied:** re-run first-time setup with a valid local MySQL administrator account. Do not share that password.
- **Port 3000 or 8001 is busy:** stop the other process using that port, then rerun the launcher.
- **Semantic token error:** confirm `CHROMA_SERVICE_TOKEN` has the same value in `.env.local` and `semantic_service/.env`.
- **First semantic request is slow:** the embedding model is being downloaded and initialized.

Never commit `.env.local`, `semantic_service/.env`, database backups, application data or `semantic_service/chroma_data`.
