# Gigsy Database Documentation

This directory contains the database design, relational mapping, Entity–Relationship diagram, SQL query examples and advanced database features developed for the Gigsy freelance marketplace.

The database documentation is based on the supplied MySQL 8.0.46 schema-only export. It describes the relational structure and provides SQL demonstrations for understanding and testing the database.

## 1. Database Overview

Gigsy uses MySQL as its primary relational database for managing structured marketplace information.

The database supports the following major entities and operations:

- User account and profile management
- Client and freelancer information
- Gig creation and skill requirements
- Freelancer skills and gig-skill associations
- Proposal submission and hiring workflows
- Contract and milestone management
- Payment and review records
- Messaging and notifications

The database contains both a legacy marketplace schema and a newer `gigsy_*` application workflow. These structures are documented separately because their relationships and constraints are not identical.

## 2. Directory Contents

| File | Description |
|---|---|
| `relational_mapping.md` | Documents relational tables, primary keys, foreign keys, relationships and schema limitations. |
| `er_diagram.mmd` | Editable Mermaid source representing the database entities and their relationships. |
| `query_bank.sql` | Contains SQL demonstrations covering data retrieval, joins, filtering, aggregation and subqueries. |
| `advanced_features.sql` | Contains an additional read-only SQL function for calculating skill-match percentages. |

## 3. Relational Database Design

The relational model organizes Gigsy's data into separate tables based on entities and their relationships.

Important design elements include:

- Primary keys for uniquely identifying records.
- Foreign keys for maintaining relationships between related tables.
- Junction tables for many-to-many relationships.
- Constraints for enforcing data integrity.
- Separate tables for clients, freelancers, gigs, proposals and contracts.

### Important relationships

- One client can publish multiple gigs.
- One gig can receive multiple proposals.
- One freelancer can submit multiple proposals.
- Freelancers can possess multiple skills.
- Gigs can require multiple skills.
- Contracts can contain multiple milestones.

The `freelancer_skill` and `gig_skill` tables represent many-to-many relationships between freelancers, gigs and skills.

Refer to `relational_mapping.md` for the detailed relation and key mapping.

## 4. Entity–Relationship Diagram

The `er_diagram.mmd` file contains the editable Mermaid ER diagram source.

The diagram helps visualize:

- Database entities and their attributes.
- Primary and foreign key relationships.
- One-to-one, one-to-many and many-to-many relationships.
- The overall relational structure of the marketplace.

It can be viewed or edited using a Mermaid-compatible Markdown preview.

## 5. SQL Query Bank

The `query_bank.sql` file contains SQL examples used to demonstrate and examine the database structure and its operations.

The query collection covers:

1. Basic SELECT statements.
2. WHERE conditions and filtering.
3. Sorting using ORDER BY.
4. INNER JOIN and OUTER JOIN operations.
5. Aggregate functions such as COUNT, SUM, AVG, MIN and MAX.
6. GROUP BY and HAVING clauses.
7. Nested subqueries.
8. Correlated subqueries.
9. Data manipulation examples.

The UPDATE and DELETE examples are commented out and use placeholders to avoid accidental modification of existing records.

The query bank is intended primarily for read-oriented demonstrations.

## 6. Advanced Database Features

The `advanced_features.sql` file introduces an additional read-only SQL function for calculating the percentage of required gig skills matched by a freelancer.

The function uses the relationship between:

- `gig_skill`
- `freelancer_skill`
- `skill`

It calculates the proportion of required skills that are also present in the freelancer's skill profile.

This provides a database-level demonstration of skill matching without modifying existing marketplace records.

**Note:** This function is an additional database feature. It does not replace the existing `MatchFreelancersBySkills` stored procedure.

## 7. Existing Database Objects

The supplied database includes the following database objects:

| Object | Purpose |
|---|---|
| `freelancer_profile_view` | Presents freelancer profile information. |
| `freelancer_skills_view` | Presents freelancer skill information. |
| `open_gigs_view` | Provides information about open gigs. |
| `MatchFreelancersBySkills` | Stored procedure for matching freelancers against gig requirements. |
| `trg_update_freelancer_rating` | Updates freelancer rating information after a review is inserted. |

These objects belong to the existing database design. The additional SQL examples should not recreate or overwrite them.

## 8. Database Safety and Execution Guidelines

The database files are provided for documentation, demonstration and controlled development testing.

Follow these precautions before executing any SQL script:

1. **Schema-only export:** The supplied schema dump is documentation evidence, not a migration script. It contains DROP statements and must never be imported into the working database.
2. **Query bank:** Review the SQL statements before execution. UPDATE and DELETE demonstrations remain commented out and use placeholders.
3. **Advanced features:** The additional SQL file introduces a function. Back up the database and test it in a disposable development database before applying it.
4. **Existing objects:** Do not recreate or overwrite existing tables, views, stored procedures or triggers.
5. **Database backup:** Always maintain a backup before testing schema modifications.
6. **Environment separation:** Perform experimental database changes in a separate development database rather than the original working database.

## 9. Schema Limitations and Future Improvements

The current database contains both legacy marketplace relations and newer `gigsy_*` application workflow tables.

Some newer workflow relationships are maintained at the application level rather than through declared foreign-key constraints.

Possible improvements include:

- Reviewing and strengthening referential integrity.
- Adding appropriate foreign-key constraints after validating existing data.
- Improving consistency between legacy and newer workflow structures.
- Expanding automated SQL and database integration tests.
- Testing stored procedures and triggers with additional scenarios.
- Improving database documentation as the application evolves.

Refer to `relational_mapping.md` for the documented schema caveats before planning database migrations.

## 10. Purpose of This Directory

The database directory serves as the central reference for Gigsy's relational design and SQL demonstrations.

It supports database understanding, academic evaluation, development, testing and future maintenance of the project.