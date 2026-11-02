-- Additional Gigsy stored function for MySQL 8.0.46.
-- Existing MatchFreelancersBySkills procedure and review rating trigger
-- already exist in the supplied schema dump and are not recreated here.
USE gigsy;

DROP FUNCTION IF EXISTS fn_required_skill_match_percent;
DELIMITER $$
CREATE FUNCTION fn_required_skill_match_percent(p_gig_id INT,p_freelancer_id INT)
RETURNS DECIMAL(5,2)
READS SQL DATA
BEGIN
    DECLARE v_required_count INT DEFAULT 0;
    DECLARE v_matched_count INT DEFAULT 0;

    SELECT COUNT(*) INTO v_required_count
    FROM gig_skill
    WHERE gig_id=p_gig_id AND importance='Required';

    IF v_required_count=0 THEN
        RETURN 0.00;
    END IF;

    SELECT COUNT(*) INTO v_matched_count
    FROM gig_skill gs
    JOIN freelancer_skill fs
      ON fs.skill_id=gs.skill_id AND fs.freelancer_id=p_freelancer_id
    WHERE gs.gig_id=p_gig_id AND gs.importance='Required';

    RETURN ROUND((v_matched_count*100.0)/v_required_count,2);
END$$
DELIMITER ;

-- Example: SELECT fn_required_skill_match_percent(1,1);
-- Existing advanced features:
-- * MatchFreelancersBySkills(IN input_gig_id INT)
-- * trg_update_freelancer_rating AFTER INSERT ON review
-- * Views: freelancer_profile_view, freelancer_skills_view, open_gigs_view
-- * Proposal acceptance transaction in src/app/api/proposals/route.ts:
--   proposal decision, contract, milestones, gig status and notifications commit/rollback together.
-- * ChromaDB similarity search runs in the separate FastAPI semantic service.
--
-- Test on a disposable development database first. This file does not change table data.
