# Gigsy DBMS implementation status and feature matrix

This page separates features verified in the supplied MySQL schema export and repository source from items that still require execution by the project team.

## Verified from the schema export

| Feature | Evidence | Status |
|---|---|---|
| Relational schema | 16 base tables | Present |
| Primary/foreign/unique keys | CREATE TABLE definitions | Present |
| CHECK constraints | rating, budget, amount, experience and duration checks | Present |
| Indexing | B-tree, composite and FULLTEXT indexes | Present |
| Views | 3 named views | Present |
| Stored procedure | MatchFreelancersBySkills | Present |
| Trigger | trg_update_freelancer_rating | Present |
| Stored function | None in supplied dump | Added as optional script in advanced_features.sql; not yet installed |
| Transactions | Proposal acceptance code uses beginTransaction/commit/rollback | Present in application code |
| Vector similarity | ChromaDB semantic service | Implemented outside MySQL |

## Application transaction

The proposal acceptance handler uses a single connection and transaction. The intended unit of work includes proposal status changes, insertion of the current-workflow contract, three milestones, gig status update and notifications. Any thrown error follows the rollback path. This is application-managed transactional logic, not a stored procedure.

## Vector database distinction

MySQL stores users, gigs, proposals and workflow state. ChromaDB stores vector representations used by the semantic service to retrieve semantically similar gigs. The vector index supplements relational filtering; it does not replace MySQL as the system of record.

## Remaining validation before submission

- Apply the optional stored function on a disposable/test database and verify its result.
- Execute the SELECT query bank against the current database and record outputs.
- Run the Next.js typecheck and production build from the local project.
- Test client/freelancer workflows with test accounts.
- Capture real screenshots and attach them to the report later.

## Known schema caveat

The export shows legacy tables and a separate newer gigsy_* workflow. The current app uses gigsy_contracts/gigsy_milestones/gigsy_notifications for hiring. Do not claim foreign-key constraints exist on those three tables; none appear in the supplied export.
