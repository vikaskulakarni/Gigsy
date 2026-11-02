# Gigsy

Gigsy is a two-sided freelance marketplace: Clients publish gigs and hire talent; Freelancers discover work, submit proposals and manage accepted projects.

## Stack
- Next.js 15 / React 19
- MySQL (`mysql2`) for accounts, gigs, proposals and transactional workflows
- ChromaDB + Sentence Transformers for local semantic matching
- FastAPI semantic service

## Setup
1. Configure `.env.local` from `.env.example`; keep MySQL credentials and session/indexing secrets private.
2. Install frontend dependencies with `npm install`.
3. Install and start the semantic service using [CHROMA_LOCAL_SETUP.md](./CHROMA_LOCAL_SETUP.md).
4. Run the additive hiring workflow migration once:

```powershell
.\apply-hiring-migration.ps1
```

5. Start Next.js using `npm run dev` and open `http://localhost:3000`.

## Hiring workflow
When a Client accepts a pending proposal, Gigsy creates a contract, a three-step milestone plan and notifications in the same MySQL transaction. The gig moves to In Progress and is closed to new applications and competing pending proposals are rejected. The Freelancer sees a hire confirmation and can open the contract workspace. Freelancers start and submit milestones; Clients approve submitted milestones. When all milestones are approved, the contract and gig are marked completed.

The migration adds `gigsy_contracts`, `gigsy_milestones` and `gigsy_notifications`. It is additive and does not delete or rewrite existing users, gigs, proposals, messages or ChromaDB collections.

## Role-specific experience
- Clients see Post a gig, My posted gigs, Applicants, Find talent and Active contracts.
- Freelancers see Find jobs, My applications, Proposals sent, My contracts and AI matching.
- Gig detail pages show the applicant manager to the owning Client and the proposal form to signed-in Freelancers.
- The header checks the current session and displays the signed-in user's name and role.

## Verification
- `http://localhost:3000/api/health` — MySQL health
- `http://localhost:3000/api/auth/me` — current signed-in session
- `http://localhost:3000/api/contracts` — contracts for the signed-in account
- `http://localhost:8001/health` — ChromaDB semantic service

Keep `.env.local`, `semantic_service/.env`, Chroma data and credentials out of Git.
