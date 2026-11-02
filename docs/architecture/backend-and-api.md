# Backend and API guide

## Services

- Next.js application and API routes: `http://localhost:3000`
- MySQL: configured using root `.env.local`
- FastAPI semantic service: `http://127.0.0.1:8001`

## Environment

Copy `.env.example` to `.env.local` and configure the database credentials and strong local secrets. Configure `semantic_service/.env` separately, using the same `CHROMA_SERVICE_TOKEN` value.

Do not commit either environment file.

## Install and run

```powershell
npm ci
npm run dev
```

Start the semantic service separately using [semantic-search.md](./semantic-search.md).

## API surface

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | MySQL health |
| GET | `/api/auth/me` | Current session |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/dashboard` | Dashboard data |
| GET/POST | `/api/gigs` | Browse and create gigs |
| GET | `/api/gigs/:id` | Gig details |
| GET/POST/PATCH | `/api/proposals` | Proposal workflow |
| GET | `/api/contracts` | Current user's contracts |
| GET/PATCH | `/api/contracts/:id` | Contract and milestone operations |
| GET/PATCH | `/api/notifications` | Notifications |
| GET | `/api/messages` | Messaging |
| GET | `/api/match/gigs` | Semantic gig matching |
| POST | `/api/admin/index-gigs` | Protected gig indexing |

Actual access depends on authentication, role and ownership checks in each route.

## Local verification

1. Check `http://localhost:3000/api/health`.
2. Check `http://localhost:8001/health`.
3. Sign in as both a Client and a Freelancer and verify the role-specific pages.
4. Test the proposal and contract workflow using test data.
5. Verify semantic indexing and matching after the semantic service is ready.

For contract and milestone behavior, see [hiring-workflow.md](./hiring-workflow.md).
