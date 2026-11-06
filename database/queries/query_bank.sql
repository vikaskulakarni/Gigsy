-- Gigsy SQL query bank; MySQL 8.0.46. Run statements individually.
USE gigsy;

-- 1. Open gigs with client/company details.
SELECT g.gig_id,g.title,g.budget_min,g.budget_max,g.deadline,u.name AS client_name,c.company_name
FROM gig g JOIN client c ON c.client_id=g.client_id JOIN users u ON u.user_id=c.user_id
WHERE g.status='Open' ORDER BY g.posted_date DESC;

-- 2. Proposals for a gig with freelancer names.
SELECT p.proposal_id,p.gig_id,u.name AS freelancer_name,p.bid_amount,p.estimated_days,p.status
FROM proposal p JOIN freelancer f ON f.freelancer_id=p.freelancer_id
JOIN users u ON u.user_id=f.user_id WHERE p.gig_id=1 ORDER BY p.bid_amount;

-- 3. Proposal count per gig, including gigs with no proposals.
SELECT g.gig_id,g.title,COUNT(p.proposal_id) AS proposal_count
FROM gig g LEFT JOIN proposal p ON p.gig_id=g.gig_id
GROUP BY g.gig_id,g.title ORDER BY proposal_count DESC;

-- 4. Freelancer ratings.
SELECT f.freelancer_id,u.name,f.average_rating,f.total_reviews
FROM freelancer f JOIN users u ON u.user_id=f.user_id
WHERE f.total_reviews>0 ORDER BY f.average_rating DESC,f.total_reviews DESC;

-- 5. Skills held by each freelancer.
SELECT u.name,s.skill_name,fs.proficiency_level,fs.years_experience
FROM freelancer_skill fs JOIN freelancer f ON f.freelancer_id=fs.freelancer_id
JOIN users u ON u.user_id=f.user_id JOIN skill s ON s.skill_id=fs.skill_id
ORDER BY u.name,s.skill_name;

-- 6. Required/preferred skills for a gig.
SELECT g.gig_id,g.title,s.skill_name,gs.importance
FROM gig g JOIN gig_skill gs ON gs.gig_id=g.gig_id JOIN skill s ON s.skill_id=gs.skill_id
WHERE g.gig_id=1 ORDER BY gs.importance,s.skill_name;

-- 7. Aggregate: average bid and proposal count per gig.
SELECT g.gig_id,g.title,COUNT(p.proposal_id) AS proposal_count,ROUND(AVG(p.bid_amount),2) AS average_bid
FROM gig g LEFT JOIN proposal p ON p.gig_id=g.gig_id
GROUP BY g.gig_id,g.title HAVING COUNT(p.proposal_id)>0;

-- 8. Nested query: freelancers rated above the overall freelancer average.
SELECT u.name,f.average_rating FROM freelancer f JOIN users u ON u.user_id=f.user_id
WHERE f.average_rating>(SELECT AVG(average_rating) FROM freelancer);

-- 9. Correlated subquery: gigs having a proposal above that gig's average bid.
SELECT g.gig_id,g.title FROM gig g
WHERE EXISTS (SELECT 1 FROM proposal p WHERE p.gig_id=g.gig_id
AND p.bid_amount>(SELECT AVG(p2.bid_amount) FROM proposal p2 WHERE p2.gig_id=g.gig_id));

-- 10. Relational-division style: freelancers with every Required skill for gig 1.
SELECT f.freelancer_id,u.name FROM freelancer f JOIN users u ON u.user_id=f.user_id
WHERE NOT EXISTS (
 SELECT 1 FROM gig_skill req WHERE req.gig_id=1 AND req.importance='Required'
 AND NOT EXISTS (SELECT 1 FROM freelancer_skill fs
                 WHERE fs.freelancer_id=f.freelancer_id AND fs.skill_id=req.skill_id)
);

-- 11. Legacy contract and milestone summary.
SELECT c.contract_id,c.status,COUNT(DISTINCT om.milestone_id) AS milestone_count
FROM contract c LEFT JOIN order_milestone om ON om.contract_id=c.contract_id
GROUP BY c.contract_id,c.status;

-- 12. Current application contract/milestone progress.
SELECT gc.contract_id,g.title,gc.status,COUNT(m.milestone_id) AS milestone_count,
SUM(CASE WHEN m.status='Completed' THEN 1 ELSE 0 END) AS completed_count
FROM gigsy_contracts gc JOIN gig g ON g.gig_id=gc.gig_id
LEFT JOIN gigsy_milestones m ON m.contract_id=gc.contract_id
GROUP BY gc.contract_id,g.title,gc.status;

-- 13. Existing profile view.
SELECT * FROM freelancer_profile_view ORDER BY average_rating DESC;

-- 14. Existing open-gigs view.
SELECT * FROM open_gigs_view ORDER BY gig_id DESC;

-- 15. FULLTEXT search.
SELECT gig_id,title,MATCH(title,description) AGAINST ('data engineering' IN NATURAL LANGUAGE MODE) AS relevance
FROM gig WHERE MATCH(title,description) AGAINST ('data engineering' IN NATURAL LANGUAGE MODE)
ORDER BY relevance DESC;

-- 16. Current application notification inbox.
SELECT notification_id,type,title,body,is_read,created_at
FROM gigsy_notifications WHERE user_id=1 ORDER BY created_at DESC;

-- 17. UPDATE demonstration: intentionally commented; replace with a verified test ID.
-- START TRANSACTION;
-- UPDATE freelancer SET availability_status='Busy' WHERE freelancer_id=<verified_test_id>;
-- SELECT ROW_COUNT() AS affected_rows;
-- ROLLBACK;

-- 18. DELETE demonstration: intentionally commented; use only a disposable test row.
-- START TRANSACTION;
-- DELETE FROM message WHERE message_id=<verified_test_message_id>;
-- SELECT ROW_COUNT() AS affected_rows;
-- ROLLBACK;


-- 19. Client-wise gig count, including clients with no gigs.
SELECT c.client_id,u.name AS client_name,
       COUNT(g.gig_id) AS total_gigs
FROM client c
JOIN users u ON u.user_id=c.user_id
LEFT JOIN gig g ON g.client_id=c.client_id
GROUP BY c.client_id,u.name
ORDER BY total_gigs DESC;

-- 20. Gigs that have not received any proposals.
SELECT g.gig_id,g.title,g.status
FROM gig g
WHERE NOT EXISTS (
    SELECT 1
    FROM proposal p
    WHERE p.gig_id=g.gig_id
);

-- 21. Freelancers who have submitted more than one proposal.
SELECT f.freelancer_id,u.name,
       COUNT(p.proposal_id) AS total_proposals
FROM freelancer f
JOIN users u ON u.user_id=f.user_id
JOIN proposal p ON p.freelancer_id=f.freelancer_id
GROUP BY f.freelancer_id,u.name
HAVING COUNT(p.proposal_id)>1
ORDER BY total_proposals DESC;

-- 22. Number of freelancers available for each skill.
SELECT s.skill_id,s.skill_name,
       COUNT(DISTINCT fs.freelancer_id) AS freelancer_count
FROM skill s
LEFT JOIN freelancer_skill fs ON fs.skill_id=s.skill_id
GROUP BY s.skill_id,s.skill_name
ORDER BY freelancer_count DESC;

-- 23. Proposal distribution by status.
SELECT status,COUNT(*) AS proposal_count
FROM proposal
GROUP BY status
ORDER BY proposal_count DESC;

