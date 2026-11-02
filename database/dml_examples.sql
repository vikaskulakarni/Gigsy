-- Gigsy DML examples (MySQL 8.0.46)
-- These are templates for a disposable/test database.
-- Replace every placeholder only after verifying the target records.
-- Do not run demo writes against the team's working dataset.

USE gigsy;

-- INSERT template: add a catalogue skill (choose a genuinely unused name).
-- INSERT INTO skill (skill_name, skill_description, category)
-- VALUES ('<unique_test_skill_name>', 'Temporary test skill', 'Testing');

-- UPDATE template: update a known test freelancer only.
-- UPDATE freelancer
-- SET availability_status = 'Busy'
-- WHERE freelancer_id = <verified_test_freelancer_id>;

-- DELETE template: remove only a known test skill association.
-- DELETE FROM freelancer_skill
-- WHERE freelancer_id = <verified_test_freelancer_id>
--   AND skill_id = <verified_test_skill_id>;

-- Transaction demonstration using a read-only inspection between boundaries.
-- For actual INSERT/UPDATE/DELETE demonstrations, use a disposable DB and
-- ROLLBACK after capturing the result. Never assume an ID from an example.
-- START TRANSACTION;
-- <one verified test DML statement>;
-- SELECT ROW_COUNT() AS affected_rows;
-- ROLLBACK;
