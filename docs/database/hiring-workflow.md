# Hiring workflow

## Acceptance behavior

When a Client accepts a pending proposal for a gig they own, the application performs the hiring workflow in a MySQL transaction:

1. Validate the Client's ownership of the gig and the selected proposal.
2. Mark the selected proposal as accepted.
3. Reject other pending proposals for that gig.
4. Create the contract.
5. Create the initial three milestones.
6. Move the gig to `In Progress`.
7. Create notifications for the hired Freelancer and Client, and relevant competing applicants.
8. Commit the transaction.

If a database operation fails, the transaction is rolled back.

## Milestones

The initial plan contains three stages:

- Project kickoff
- Work review
- Final delivery

The amounts are contract allocations. This workflow does not itself process or capture payments.

Freelancers can start and submit milestones. Clients can approve submitted milestones. When all milestones are approved, the contract and gig are marked completed.

## Database migration

The additive migration is:

`database/gigsy_hiring_workflow.sql`

It adds:

- `gigsy_contracts`
- `gigsy_milestones`
- `gigsy_notifications`

The migration is intended to add the hiring workflow without deleting existing users, gigs, proposals, messages or semantic data. Back up the database and review the SQL before applying it.

From the repository root, run:

```powershell
.\apply-hiring-migration.ps1
```

The script reads database connection settings from the local `.env.local`. If `mysql.exe` is unavailable, use MySQL Workbench to review and execute the SQL against the existing `gigsy` database.

## Manual acceptance test

1. Sign in as the Client who owns an open gig.
2. Open the gig and accept a pending proposal.
3. Confirm the Client can open the created contract.
4. Sign in as the selected Freelancer and confirm the hire notification is visible.
5. Open the same contract as both participants.
6. Freelancer starts and submits milestones; Client approves submitted milestones.
7. After all milestones are approved, verify the contract and gig show `Completed`.

Use test records and verify both roles. Do not use real payment or personal data during manual testing.
