# Gigsy final workflow repair

## Included changes
- Client-only applicant manager on gigs owned by the signed-in Client.
- Freelancer-only proposal form on open gigs.
- Proposal acceptance is transactional: accept selected proposal, reject competing pending proposals, create contract, create three milestones, close the gig to new proposals, and write notifications.
- Freelancer dashboard shows an unread hire confirmation with a direct link to the contract.
- New contract list and contract detail workspace for both participants.
- Freelancer can start and submit milestones; Client can approve submitted milestones.
- Final milestone approval marks the contract and gig completed.
- Header reads the current session and shows the user's name and role; logout uses a same-origin fetch and redirects instead of rendering the logout JSON.
- Client and Freelancer navigation are separated.
- Windows scripts call `npm.cmd` to avoid PowerShell's npm.ps1 command-resolution issue.
- Old Qdrant wording in the user-facing interface and setup guide has been replaced with ChromaDB.

## Required one-time database migration
Run `database/gigsy_hiring_workflow.sql` against the existing `gigsy` MySQL database before testing the new workflow:

```powershell
.\apply-hiring-migration.ps1
```

This creates `gigsy_contracts`, `gigsy_milestones`, and `gigsy_notifications`. It is additive and does not drop or overwrite existing account, gig, proposal, message, or ChromaDB data.

## Acceptance test
1. Sign in as the Client who owns an open gig.
2. Open the gig and accept a pending Freelancer proposal.
3. Confirm the Client is redirected to `/contracts/<id>`.
4. Sign in as the selected Freelancer; the dashboard should show the hire confirmation.
5. Open the same contract from `/contracts`.
6. Freelancer starts and submits milestones; Client approves each submitted milestone.
7. Once all three are approved, the contract and gig become `Completed`.

## Verification status and limits
- Static TypeScript parser check found no syntax diagnostics in the updated source.
- A full Next.js build could not be run in this environment because `npm install` timed out and dependencies are not available here.
- The actual MySQL migration and authenticated Client/Freelancer browser flow must be verified against the user's local MySQL instance. Do not treat the project as runtime-verified until those local checks pass.
- Payment processing is not implemented by this workflow; milestone amounts are contract allocations only, not captured payments.
