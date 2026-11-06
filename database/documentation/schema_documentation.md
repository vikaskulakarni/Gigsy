# Gigsy schema reference

Source: user-provided structure-only MySQL dump (MySQL 8.0.46), cross-checked against the project team's live database inspection. The schema contains **17 base tables, 3 views, 1 trigger and 1 stored procedure**.

## Base tables

| Table | Purpose | Primary/candidate key details |
|---|---|---|
| users | Shared account identity and role | PK user_id; UNIQUE email |
| client | Client profile | PK client_id; UNIQUE user_id FK |
| freelancer | Freelancer profile and rating summary | PK freelancer_id; UNIQUE user_id FK |
| gig | Client-posted work listing | PK gig_id; FK client_id |
| proposal | Freelancer application/bid | PK proposal_id; FK gig_id/freelancer_id; UNIQUE(gig_id, freelancer_id) |
| skill | Skill catalogue | PK skill_id; UNIQUE skill_name |
| freelancer_skill | Freelancer-to-skill association | Composite PK(freelancer_id, skill_id) |
| gig_skill | Gig-to-skill association | Composite PK(gig_id, skill_id) |
| contract | Legacy accepted-work record | PK contract_id; UNIQUE proposal_id; FKs to proposal/gig/freelancer |
| order_milestone | Legacy contract milestones | PK milestone_id; FK contract_id |
| payment | Legacy payments | PK payment_id; FKs contract_id and milestone_id |
| review | Legacy client review | PK review_id; UNIQUE contract_id; FKs to contract/client/freelancer |
| message | User-to-user messages | PK message_id; FKs sender/receiver and optional gig/proposal |
| notification | Legacy user notifications | PK notification_id; FK user_id |
| gigsy_contracts | Current application hiring record | PK contract_id; UNIQUE proposal_id and gig_id; no declared FKs |
| gigsy_milestones | Current application milestone records | PK milestone_id; indexed contract_id; no declared FK |
| gigsy_notifications | Current application notifications | PK notification_id; indexed user_id/is_read/created_at; no declared FK |

## Views

- `freelancer_profile_view` joins users and freelancer.
- `freelancer_skills_view` joins freelancer, users, freelancer_skill and skill.
- `open_gigs_view` joins gig, client and users and filters status = Open.

All three views were inspected and queried successfully against the project database.

## Stored program objects

- **Procedure `MatchFreelancersBySkills(input_gig_id)`:** counts each freelancer's overlap with the gig's required skills and sorts by matched skill count. It was executed with gig ID 2 and returned freelancer ID 3 (Rohan Gupta), with two matched required skills.
- **Trigger `trg_update_freelancer_rating`:** AFTER INSERT on `review`; recalculates the reviewed freelancer's `average_rating` and `total_reviews`. Its behavior was tested inside a transaction: the aggregate changed from 0.00/0 to 5.00/1 after inserting a test review, and returned to 0.00/0 after rollback. No test review was retained.
- **Stored function:** no stored function or scheduled event was present in the supplied dump or installed in the inspected database. A candidate function is documented in `advanced_features.sql` as optional and is not part of the verified implementation.

## Integrity rules visible in the export

CHECK constraints cover positive bid/contract/payment amounts, rating range 1–5, nonnegative experience and hourly rate, valid budget range, and positive estimated delivery days. The proposal composite unique key prevents duplicate applications to the same gig.

## Live database observations and limitations

The team inspected the live database and confirmed 17 base tables, 3 views, the procedure and trigger described above. The procedure, trigger and views were executed successfully. The trigger test was rolled back, leaving no test review row.

The database contains two generations of workflow tables. The legacy `contract`, `order_milestone`, `payment`, `review` and `notification` tables coexist with the current application tables `gigsy_contracts`, `gigsy_milestones` and `gigsy_notifications`. Document and interpret these groups separately. The three `gigsy_*` tables do not declare foreign keys in the supplied export; do not imply otherwise.

The schema dump is structure-only. AUTO_INCREMENT values are counters, not row counts. The live database was separately inspected for the implementation checks described above.
