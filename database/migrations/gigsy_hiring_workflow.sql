-- Gigsy hiring workflow migration
-- Safe additive migration: does not modify or delete existing users, gigs or proposals.
USE gigsy;

CREATE TABLE IF NOT EXISTS gigsy_contracts (
  contract_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  proposal_id BIGINT NOT NULL,
  gig_id BIGINT NOT NULL,
  freelancer_id BIGINT NOT NULL,
  client_id BIGINT NOT NULL,
  agreed_amount DECIMAL(12,2) NOT NULL,
  delivery_days INT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_gigsy_contract_proposal (proposal_id),
  UNIQUE KEY uq_gigsy_contract_gig (gig_id),
  KEY idx_gigsy_contract_freelancer (freelancer_id,status),
  KEY idx_gigsy_contract_client (client_id,status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gigsy_milestones (
  milestone_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  contract_id BIGINT NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NULL,
  due_date DATE NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(24) NOT NULL DEFAULT 'Pending',
  sort_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_gigsy_milestones_contract (contract_id,sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gigsy_notifications (
  notification_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  gig_id BIGINT NULL,
  contract_id BIGINT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_gigsy_notifications_user (user_id,is_read,created_at)
) ENGINE=InnoDB;
