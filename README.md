# Gigsy

**AI-powered freelance marketplace** built with Next.js 15, React 19, TypeScript, MySQL, FastAPI, Sentence Transformers and ChromaDB.

Gigsy connects clients who need work completed with freelancers who offer their skills. It supports gig publishing, semantic discovery, proposals, hiring, contracts, milestones and communication.

## Project highlights

- **Client workflow:** publish gigs, review proposals, hire freelancers and manage contracts and milestones.
- **Freelancer workflow:** discover gigs, search semantically, submit proposals, communicate with clients and track milestone progress.
- **Semantic discovery:** FastAPI, Sentence Transformers and ChromaDB provide vector-based gig discovery.
- **Marketplace data:** MySQL stores user, gig, proposal, contract and related transactional records.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript |
| Database | MySQL |
| Semantic search service | FastAPI, Sentence Transformers, ChromaDB |
| Development checks | TypeScript, npm |

## Repository structure

```text
Gigsy/
├── .github/                 # GitHub templates and Actions
├── src/                     # Next.js application
│   ├── app/                 # Pages and API routes
│   ├── components/          # Reusable UI
│   └── lib/                 # Auth, database and shared utilities
├── semantic_service/        # FastAPI + ChromaDB + embeddings
├── database/                # Schema docs, migrations, diagrams and queries
├── docs/                    # Architecture, setup, database and testing docs
├── scripts/windows/         # Windows setup and launch scripts
├── Gigsy_Evidence/          # Application and DBMS testing screenshots
├── Report/                  # DBMS mini-project report
├── .env.example
├── package.json
├── package-lock.json
├── next.config.ts
└── tsconfig.json
```

## Quick start (Windows)

**Prerequisites:** Windows 10/11, Node.js 22 LTS, Python 3.11 or 3.13 (64-bit), and MySQL Server 8.x. The first-run setup creates an isolated local `gigsy_dev` database from the repository's schema-only bootstrap.

From the repository root, run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\windows\RUN_GIGSY.ps1
```

For the complete clean-clone workflow and database bootstrap details, see [Clone and run](docs/setup/clone-and-run.md) and [Windows setup](docs/setup/windows-setup.md).

The launcher creates local environment files only when setup is needed. Never commit `.env.local` or `semantic_service/.env`.

## Services

| Service | Address |
|---|---|
| Next.js | http://localhost:3000 |
| MySQL health via Next.js | http://localhost:3000/api/health |
| FastAPI / ChromaDB health | http://localhost:8001/health |

## Testing and evidence

The recorded end-to-end checks exercised client and freelancer login, gig publishing and discovery, proposal submission and acceptance, contract creation, milestone submission and approval, and client–freelancer messaging.

Database checks verified records for the tested gig, proposal, contract, milestones and messages. The `MatchFreelancersBySkills` procedure was executed, and the project's database views and review trigger were checked for existence.

**Testing limitations:** positive skill matching was not independently validated; the review trigger's execution behaviour was not independently tested; message rows had NULL `gig_id` and `proposal_id`; and a milestone-start role error occurred intermittently. These items require further investigation and are not represented as passed tests.

Screenshots are organized in [Gigsy_Evidence](Gigsy_Evidence/). The testing archive is available as [Gigsy_Evidence.zip](Gigsy_Evidence.zip).

## Project report

The DBMS mini-project report is available in both formats:

- [Word report](Report/Gigsy_DBMS_Mini_Project_Report.docx)
- [PDF report](Report/Gigsy_DBMS_Mini_Project_Report.pdf)

## Documentation

- [Architecture](docs/architecture/architecture.md)
- [Backend and API](docs/architecture/backend-and-api.md)
- [Clone and run](docs/setup/clone-and-run.md)
- [Windows setup](docs/setup/windows-setup.md)
- [Semantic search](docs/setup/semantic-search.md)
- [Hiring workflow](docs/database/hiring-workflow.md)
- [DBMS feature matrix](docs/database/dbms-feature-matrix.md)
- [Teammate testing handoff](docs/testing/team-testing-handoff.md)
- [Database README](database/README.md)
- [Schema documentation](database/documentation/schema_documentation.md)
- [Relational mapping](database/documentation/relational_mapping.md)
- [ER diagram](database/diagrams/er_diagram.mmd)
- [SQL query bank](database/queries/query_bank.sql)
- [DML examples](database/queries/dml_examples.sql)
- [Advanced SQL examples](database/queries/advanced_features.sql)
- [Contributing](CONTRIBUTING.md)

## Development checks

```powershell
npm ci
npx tsc --noEmit
npm run build
```

GitHub Actions currently performs the TypeScript check. Local database, authentication, semantic-search and role workflows still require runtime testing.

## Database safety

Fresh teammate setup imports `database/bootstrap/gigsy_schema.sql` only into a newly created empty `gigsy_dev` database. The export is DDL-only and contains no application rows. Never import it into a populated database. Existing databases are not dropped or overwritten.

## Security

Do not commit passwords, tokens, environment files, database dumps containing sensitive data, local ChromaDB data or `node_modules`. Keep service tokens server-side.
