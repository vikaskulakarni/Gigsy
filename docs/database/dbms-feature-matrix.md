# Gigsy DBMS implementation status and feature matrix

This document records the DBMS features implemented in Gigsy and the checks already performed by the project team. Application regression and end-to-end workflows have been tested by the team and are treated as completed; this page does not list them as pending work.

## Implementation and verification matrix

| Feature | Implementation / evidence | Status |
|---|---|---|
| Relational schema | 17 base tables covering accounts, profiles, gigs, proposals, skills, contracts, milestones, payments, reviews, messages and notifications | Implemented; live schema inspected |
| Primary, foreign and unique keys | Key constraints defined in the MySQL schema; proposal uniqueness prevents duplicate applications for a gig | Implemented |
| CHECK constraints | Constraints for rating, budget, monetary amounts, experience and delivery duration | Implemented |
| Indexing | B-tree, composite and FULLTEXT indexes in the schema | Implemented |
| Views | `freelancer_profile_view`, `freelancer_skills_view`, `open_gigs_view` | All three inspected and queried successfully |
| Stored procedure | `MatchFreelancersBySkills(input_gig_id)` ranks freelancers by overlap with required gig skills | Executed successfully; gig ID 2 returned freelancer ID 3 with two matched skills |
| Trigger | `trg_update_freelancer_rating` recalculates freelancer rating aggregates after a review insert | Transactional test passed; rollback restored the original values and retained no test review |
| Stored function | Optional candidate in `database/queries/advanced_features.sql` | Not installed; not counted as an implemented feature |
| Transactions | Proposal acceptance uses application-managed begin/commit/rollback logic | Implemented in application code |
| Vector similarity | FastAPI semantic service with ChromaDB and 384-dimensional embeddings from `all-MiniLM-L6-v2` | Implemented outside MySQL |
| Messaging and notifications | Message records plus current application notification workflow | Implemented in application/database workflow |

## Application transaction

The proposal acceptance handler uses a single database connection and transaction. The intended unit of work includes proposal status changes, insertion of the current-workflow contract, three milestones, gig status update and notifications. The handler commits on success and follows the rollback path when an error occurs. This is application-managed transactional logic, not a stored procedure.

## Vector database architecture

MySQL stores users, gigs, proposals and marketplace workflow state as the relational system of record. ChromaDB stores vector representations used by the semantic service to retrieve semantically similar gigs. The embedding model produces 384-dimensional vectors. Semantic retrieval supplements relational filtering; it does not replace MySQL.

## Stored procedure verification

The team executed:

```sql
CALL MatchFreelancersBySkills(2);
```

The procedure returned freelancer ID 3 (Rohan Gupta), with two matched required skills. It counts overlap between the selected gig's required skills and each freelancer's skills and orders candidates by the match count.

## Trigger verification

The team tested `trg_update_freelancer_rating` within a transaction. Before the test insert, the selected freelancer's aggregate was `average_rating = 0.00` and `total_reviews = 0`. After inserting a test review with rating 5, the aggregate became `5.00` and `1`. The transaction was rolled back, restoring `0.00` and `0`; the test review was not retained. This confirms trigger execution without leaving test data in the database.

## Schema generations and integrity caveat

The database contains both legacy workflow tables (`contract`, `order_milestone`, `payment`, `review`, `notification`) and the current application workflow tables (`gigsy_contracts`, `gigsy_milestones`, `gigsy_notifications`). They are separate schema generations and should be described separately. The supplied schema export does not declare foreign keys on the three `gigsy_*` tables; do not claim that those constraints exist.

## Optional stored function

The optional function in `database/queries/advanced_features.sql` is not installed and is not included in the verified feature count. That script contains a `DROP FUNCTION IF EXISTS` statement before creating the function. It must only be run against a disposable/test database after review; do not execute it against the project database as part of routine setup.

## Completion status

The project team reports that application testing and end-to-end workflows are complete and working. The DBMS checks recorded above include live schema inspection, successful execution of the three views and stored procedure, and a transactional trigger test with rollback. Screenshots and other submission evidence are maintained separately for insertion into the final report.
