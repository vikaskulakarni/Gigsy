# Gigsy schema reference

Source: user-provided structure-only MySQL dump, server version 8.0.46. The dump contains 16 base tables, 3 views, 1 trigger and 1 stored procedure.

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

- freelancer_profile_view joins users and freelancer.
- freelancer_skills_view joins freelancer, users, freelancer_skill and skill.
- open_gigs_view joins gig, client and users and filters status = Open.

## Stored program objects

- Procedure MatchFreelancersBySkills(input_gig_id): counts a freelancer's overlap with Required gig skills and sorts descending by matched skill count.
- Trigger trg_update_freelancer_rating: AFTER INSERT on review; recalculates average_rating and total_reviews for the reviewed freelancer.
- No stored function or scheduled event was present in the supplied dump. A candidate additional function is provided in advanced_features.sql.

## Integrity rules visible in the export

CHECK constraints cover positive bid/contract/payment amounts, rating range 1–5, nonnegative experience and hourly rate, valid budget range, and positive estimated delivery days. The proposal composite unique key prevents duplicate applications to the same gig.

## Important limitation

The dump is schema-only. AUTO_INCREMENT values show counters, not row counts. It cannot establish the number or correctness of live records. The schema export also does not prove that application code and database are currently synchronized after the export timestamp.
