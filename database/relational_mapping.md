# Gigsy relational mapping and schema notes

Based on the supplied MySQL 8.0.46 structure export. This is documentation, not a migration.

## Relations and keys

| Relation | Primary key | Important foreign keys / candidate keys |
|---|---|---|
| users | user_id | email UNIQUE |
| client | client_id | user_id -> users.user_id (UNIQUE) |
| freelancer | freelancer_id | user_id -> users.user_id (UNIQUE) |
| gig | gig_id | client_id -> client.client_id |
| proposal | proposal_id | gig_id -> gig.gig_id; freelancer_id -> freelancer.freelancer_id; UNIQUE(gig_id, freelancer_id) |
| skill | skill_id | skill_name UNIQUE |
| freelancer_skill | (freelancer_id, skill_id) | both columns reference parent relations |
| gig_skill | (gig_id, skill_id) | both columns reference parent relations |
| contract | contract_id | proposal_id -> proposal.proposal_id (UNIQUE); gig_id and freelancer_id are FKs |
| order_milestone | milestone_id | contract_id -> contract.contract_id |
| payment | payment_id | contract_id -> contract.contract_id; milestone_id -> order_milestone.milestone_id |
| review | review_id | contract_id -> contract.contract_id (UNIQUE); client_id and freelancer_id are FKs |
| message | message_id | sender_id/receiver_id -> users; optional gig_id/proposal_id |
| notification | notification_id | user_id -> users.user_id |
| gigsy_contracts | contract_id | proposal_id and gig_id have UNIQUE indexes; no declared FKs in export |
| gigsy_milestones | milestone_id | contract_id indexed; no declared FK in export |
| gigsy_notifications | notification_id | composite user_id/is_read/created_at index; no declared FK in export |

## ER-to-relational mapping

1. User specialisation: Client and Freelancer are profile relations. Each has a unique user_id, giving a one-to-zero-or-one relationship from users to each profile. users.user_type stores the account role.
2. Client–Gig: one client posts many gigs; each gig belongs to one client via gig.client_id.
3. Gig–Proposal: one gig receives many proposals via proposal.gig_id.
4. Freelancer–Proposal: one freelancer submits many proposals via proposal.freelancer_id.
5. Freelancer–Skill: many-to-many resolved through freelancer_skill, with composite PK (freelancer_id, skill_id).
6. Gig–Skill: many-to-many resolved through gig_skill, with composite PK (gig_id, skill_id); importance stores Required/Preferred.
7. Proposal–legacy Contract: at most one legacy contract per proposal, enforced by UNIQUE contract.proposal_id.
8. Legacy Contract–Milestone/Payment/Review: contract has many order_milestone and payment rows; at most one review per contract due to UNIQUE review.contract_id.
9. User–Message/Notification: message sender/receiver and legacy notification user reference users.

## Two parallel hiring models — implementation caveat

The export contains both:
- Legacy: contract, order_milestone, payment, review, notification.
- Current application workflow: gigsy_contracts, gigsy_milestones, gigsy_notifications.

The newer gigsy_* relations have no declared foreign keys in the export. Their ID links are logical/application-enforced relationships, not declared FK constraints.

The current proposal API creates gigsy_contracts, three gigsy_milestones, updates gig.status, and creates gigsy_notifications in a transaction. It does not write to legacy contract or order_milestone. Payments and reviews in the legacy model are not automatically part of the newer workflow.

Do not drop, rename, merge, or backfill either model without a separately tested migration and an explicit project decision.

## Constraints and indexes

- users.email, skill.skill_name, client.user_id and freelancer.user_id are unique.
- proposal(gig_id, freelancer_id) prevents duplicate applications per freelancer/gig.
- contract.proposal_id and review.contract_id are unique.
- Composite PKs on freelancer_skill and gig_skill prevent duplicate associations.
- gig has status/deadline indexes and FULLTEXT over title and description.
- CHECK constraints validate ratings, bid/contract/payment amounts, budget ranges, experience and estimated delivery days.

## Views, routine and trigger found

- freelancer_profile_view: user identity plus freelancer profile/rating fields.
- freelancer_skills_view: freelancer and skill details.
- open_gigs_view: open gigs with client/company names.
- MatchFreelancersBySkills(input_gig_id): counts shared Required skills and orders freelancers by match count.
- trg_update_freelancer_rating: after a review insert, recomputes average_rating and total_reviews.

No stored function or scheduled event appeared in the supplied dump. This is based on the export, not a live post-export inspection.
