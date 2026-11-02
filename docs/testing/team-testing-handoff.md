# Gigsy teammate handoff: testing and evidence

This is the reserved teammate-owned workstream. Do not modify database schema or merge changes to the feature branch without coordinating with the implementation owner.

## 1. Application workflow checks

Use separate test Client and Freelancer accounts. Do not share passwords or capture them in screenshots.

- [ ] Register/login as Client.
- [ ] Register/login as Freelancer.
- [ ] Create a gig as Client.
- [ ] Browse/search gigs as Freelancer.
- [ ] Submit a proposal.
- [ ] Review/reject a proposal as Client.
- [ ] Accept a proposal on a dedicated test gig.
- [ ] Confirm a current-workflow contract is created.
- [ ] Confirm three milestones appear.
- [ ] Confirm both parties can view the contract.
- [ ] Test messaging and notification visibility.

Do not test acceptance against a real gig or proposal that the team needs to preserve.

## 2. Database evidence

Capture MySQL Workbench result screenshots for:
- [ ] SHOW TABLES;
- [ ] DESCRIBE users;
- [ ] DESCRIBE gig;
- [ ] DESCRIBE proposal;
- [ ] SELECT from freelancer_profile_view;
- [ ] SELECT from freelancer_skills_view;
- [ ] SELECT from open_gigs_view;
- [ ] CALL MatchFreelancersBySkills(<test_gig_id>);
- [ ] Query the review trigger definition from INFORMATION_SCHEMA.TRIGGERS.
- [ ] Execute the SQL query bank read-only queries and record any failures.

Only run the new stored function after it has been installed in a disposable/test database.

## 3. Screenshot standards

- Use test accounts and non-sensitive demo content.
- Do not show passwords, session cookies, access tokens, .env files, or private personal information.
- Include a short caption with the test name and outcome.
- Keep original screenshots; do not fabricate or edit test results.

## 4. Test report template

| Test ID | Scenario | Expected result | Actual result | Pass/Fail | Evidence filename |
|---|---|---|---|---|---|
| AUTH-01 | Client login | Client dashboard loads | | | |
| AUTH-02 | Freelancer login | Freelancer dashboard loads | | | |
| GIG-01 | Client creates gig | Gig appears in listings | | | |
| PROP-01 | Freelancer submits proposal | Proposal is saved | | | |
| HIRE-01 | Client accepts test proposal | Contract and milestones are created atomically | | | |
| MSG-01 | User sends message | Recipient can view message | | | |

## 5. Completion criteria

Return the completed checklist, screenshots folder and test-results table to the implementation owner. Report failures accurately; do not mark an unexecuted test as passed.
