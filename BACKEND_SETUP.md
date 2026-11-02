# Gigsy backend setup and verification

## Services
- Next.js: `http://localhost:3000`
- MySQL: database configured by `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Semantic service: `http://127.0.0.1:8001` (ChromaDB + local Sentence Transformers)

## Environment
Copy `.env.example` to `.env.local`. Preserve your existing working database credentials. Use a long random `SESSION_SECRET`, `INDEXING_SECRET`, and matching `CHROMA_SERVICE_TOKEN` in both the Next.js and semantic-service environment files. Never commit secrets.

## First-time database migration
Run the additive hiring workflow migration once against the existing Gigsy database:

```powershell
.\apply-hiring-migration.ps1
```

If your MySQL username or database name differs, use the values from `.env.local` and select the `gigsy` database before running the SQL in MySQL Workbench. The migration creates only the new Gigsy workflow tables; it does not drop or replace existing data.

## Start
```powershell
npm install
npm run dev
```

Start the Python semantic service separately using `CHROMA_LOCAL_SETUP.md`.

## Important routes
- `GET /api/health`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `GET /api/projects`
- `GET/POST/PATCH /api/proposals`
- `GET /api/contracts`
- `GET/PATCH /api/contracts/:id`
- `GET/PATCH /api/notifications`

## Hiring transaction
A Client may accept only a pending proposal on a gig owned by that Client. Acceptance, rejection of competing pending proposals, contract creation, initial milestones, gig status update and notifications are committed together. Any SQL error rolls back the entire operation.

## Local checks
1. Sign in as a Client, open one of your gigs and accept a pending proposal.
2. Confirm the Client is redirected to `/contracts/:id`.
3. Sign in as the selected Freelancer and open `/dashboard`; the hire banner links to the same contract.
4. Both parties can open the contract; only the Freelancer can start/submit milestones and only the Client can approve submitted milestones.
5. Approve all milestones and confirm the contract/gig status becomes `Completed`.
