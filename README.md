# Gigsy

**AI-powered freelance marketplace** built with Next.js 15, React 19, TypeScript, MySQL, FastAPI, Sentence Transformers and ChromaDB.

Gigsy supports two roles:
- **Clients:** publish gigs, review proposals, hire freelancers and manage contracts/milestones.
- **Freelancers:** discover gigs, search semantically, submit proposals, manage contracts and track milestones.

MySQL is the source of truth for marketplace and transactional data. ChromaDB stores vector representations used for semantic discovery.

## Repository structure

```text
Gigsy/
├── .github/                 # GitHub templates and Actions
├── src/                     # Next.js application
│   ├── app/                 # Pages and API routes
│   ├── components/          # Reusable UI
│   └── lib/                 # Auth, database and shared utilities
├── semantic_service/        # FastAPI + ChromaDB + embeddings
├── database/
│   ├── diagrams/            # ER diagram source
│   ├── documentation/       # Schema and relational mapping
│   ├── migrations/          # Additive database migrations
│   └── queries/              # Query bank and optional SQL examples
├── docs/
│   ├── architecture/        # Architecture and API docs
│   ├── database/            # DBMS and hiring workflow docs
│   ├── setup/               # Local setup and semantic search
│   └── testing/             # Test handoff and evidence
├── scripts/windows/         # Windows setup and launch scripts
├── .env.example
├── package.json
├── package-lock.json
├── next.config.ts
└── tsconfig.json
```

## Quick start (Windows)

Prerequisites: Node.js 22 LTS, Python 3.11 or 3.13 (64-bit), MySQL Server and the existing Gigsy database.

From the repository root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\windows\RUN_GIGSY.ps1
```

For explicit setup and troubleshooting, see [Windows setup](docs/setup/windows-setup.md).

The launcher creates local environment files only when setup is needed. Never commit `.env.local` or `semantic_service/.env`.

## Services

| Service | Address |
|---|---|
| Next.js | http://localhost:3000 |
| MySQL health via Next.js | http://localhost:3000/api/health |
| FastAPI / ChromaDB health | http://localhost:8001/health |

## Database safety

Review migrations before applying them. The hiring migration is additive; do not recreate or drop an existing database. Use a backup and a separate test database for experiments. The schema-only export is documentation, not a migration.

## Documentation

- [Architecture](docs/architecture/architecture.md)
- [Backend and API](docs/architecture/backend-and-api.md)
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

## Security

Do not commit passwords, tokens, environment files, database dumps containing sensitive data, local ChromaDB data or `node_modules`. Keep service tokens server-side.
