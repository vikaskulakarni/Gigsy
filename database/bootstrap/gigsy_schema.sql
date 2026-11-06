-- Gigsy development bootstrap schema
-- Generated from the maintainer's current MySQL schema using mysqldump --no-data.
-- Contains DDL only: no user, gig, proposal, message, or other application rows.
-- Import ONLY into a new, empty development database. Never import into a populated database.
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: gigsy
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `client`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client` (
  `client_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `company_name` varchar(150) DEFAULT NULL,
  `company_description` text,
  `address` varchar(255) DEFAULT NULL,
  `website` varchar(300) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`client_id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_client_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contract`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contract` (
  `contract_id` int NOT NULL AUTO_INCREMENT,
  `proposal_id` int NOT NULL,
  `gig_id` int NOT NULL,
  `freelancer_id` int NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `agreed_amount` decimal(12,2) NOT NULL,
  `status` enum('Active','Completed','Cancelled') DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`contract_id`),
  UNIQUE KEY `proposal_id` (`proposal_id`),
  KEY `fk_contract_gig` (`gig_id`),
  KEY `fk_contract_freelancer` (`freelancer_id`),
  CONSTRAINT `fk_contract_freelancer` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer` (`freelancer_id`),
  CONSTRAINT `fk_contract_gig` FOREIGN KEY (`gig_id`) REFERENCES `gig` (`gig_id`),
  CONSTRAINT `fk_contract_proposal` FOREIGN KEY (`proposal_id`) REFERENCES `proposal` (`proposal_id`),
  CONSTRAINT `chk_agreed_amount` CHECK ((`agreed_amount` > 0)),
  CONSTRAINT `chk_contract_dates` CHECK (((`end_date` is null) or (`start_date` is null) or (`end_date` >= `start_date`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `freelancer`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `freelancer` (
  `freelancer_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `headline` varchar(150) DEFAULT NULL,
  `bio` text,
  `experience_years` int DEFAULT '0',
  `hourly_rate` decimal(10,2) DEFAULT NULL,
  `availability_status` enum('Available','Busy','Away') DEFAULT 'Available',
  `portfolio_url` varchar(255) DEFAULT NULL,
  `profile_picture` varchar(255) DEFAULT NULL,
  `average_rating` decimal(3,2) DEFAULT '0.00',
  `total_reviews` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`freelancer_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_freelancer_rating` (`average_rating`),
  CONSTRAINT `fk_freelancer_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_average_rating` CHECK ((`average_rating` between 0 and 5)),
  CONSTRAINT `chk_experience` CHECK ((`experience_years` >= 0)),
  CONSTRAINT `chk_hourly_rate` CHECK (((`hourly_rate` is null) or (`hourly_rate` >= 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
--
-- Table structure for table `freelancer_skill`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `freelancer_skill` (
  `freelancer_id` int NOT NULL,
  `skill_id` int NOT NULL,
  `proficiency_level` enum('Beginner','Intermediate','Expert') NOT NULL DEFAULT 'Beginner',
  `years_experience` decimal(4,1) DEFAULT NULL,
  PRIMARY KEY (`freelancer_id`,`skill_id`),
  KEY `fk_fs_skill` (`skill_id`),
  CONSTRAINT `fk_fs_freelancer` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer` (`freelancer_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fs_skill` FOREIGN KEY (`skill_id`) REFERENCES `skill` (`skill_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_skill_experience` CHECK (((`years_experience` is null) or (`years_experience` >= 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
--
-- Table structure for table `gig`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gig` (
  `gig_id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `budget_min` decimal(12,2) DEFAULT NULL,
  `budget_max` decimal(12,2) DEFAULT NULL,
  `deadline` date DEFAULT NULL,
  `status` enum('Open','In Progress','Completed','Cancelled') DEFAULT 'Open',
  `posted_date` date NOT NULL DEFAULT (curdate()),
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `view_count` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`gig_id`),
  KEY `fk_gig_client` (`client_id`),
  KEY `idx_gig_status` (`status`),
  KEY `idx_gig_deadline` (`deadline`),
  FULLTEXT KEY `ft_gig_search` (`title`,`description`),
  CONSTRAINT `fk_gig_client` FOREIGN KEY (`client_id`) REFERENCES `client` (`client_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_budget` CHECK (((`budget_min` is null) or (`budget_min` >= 0))),
  CONSTRAINT `chk_budget_range` CHECK (((`budget_max` is null) or (`budget_min` is null) or (`budget_max` >= `budget_min`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `gig_skill`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gig_skill` (
  `gig_id` int NOT NULL,
  `skill_id` int NOT NULL,
  `importance` enum('Required','Preferred') DEFAULT 'Required',
  PRIMARY KEY (`gig_id`,`skill_id`),
  KEY `fk_gs_skill` (`skill_id`),
  CONSTRAINT `fk_gs_gig` FOREIGN KEY (`gig_id`) REFERENCES `gig` (`gig_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gs_skill` FOREIGN KEY (`skill_id`) REFERENCES `skill` (`skill_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `gigsy_contracts`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gigsy_contracts` (
  `contract_id` bigint NOT NULL AUTO_INCREMENT,
  `proposal_id` bigint NOT NULL,
  `gig_id` bigint NOT NULL,
  `freelancer_id` bigint NOT NULL,
  `client_id` bigint NOT NULL,
  `agreed_amount` decimal(12,2) NOT NULL,
  `delivery_days` int NOT NULL,
  `status` varchar(24) NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`contract_id`),
  UNIQUE KEY `uq_gigsy_contract_proposal` (`proposal_id`),
  UNIQUE KEY `uq_gigsy_contract_gig` (`gig_id`),
  KEY `idx_gigsy_contract_freelancer` (`freelancer_id`,`status`),
  KEY `idx_gigsy_contract_client` (`client_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `gigsy_milestones`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gigsy_milestones` (
  `milestone_id` bigint NOT NULL AUTO_INCREMENT,
  `contract_id` bigint NOT NULL,
  `title` varchar(160) NOT NULL,
  `description` text,
  `due_date` date DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` varchar(24) NOT NULL DEFAULT 'Pending',
  `sort_order` int NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`milestone_id`),
  KEY `idx_gigsy_milestones_contract` (`contract_id`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `gigsy_notifications`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gigsy_notifications` (
  `notification_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `type` varchar(40) NOT NULL,
  `title` varchar(180) NOT NULL,
  `body` text NOT NULL,
  `gig_id` bigint DEFAULT NULL,
  `contract_id` bigint DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `idx_gigsy_notifications_user` (`user_id`,`is_read`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `message`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message` (
  `message_id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL,
  `receiver_id` int NOT NULL,
  `gig_id` int DEFAULT NULL,
  `proposal_id` int DEFAULT NULL,
  `message_text` text NOT NULL,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_read` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`message_id`),
  KEY `fk_message_sender` (`sender_id`),
  KEY `fk_message_receiver` (`receiver_id`),
  KEY `fk_message_gig` (`gig_id`),
  KEY `fk_message_proposal` (`proposal_id`),
  CONSTRAINT `fk_message_gig` FOREIGN KEY (`gig_id`) REFERENCES `gig` (`gig_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_message_proposal` FOREIGN KEY (`proposal_id`) REFERENCES `proposal` (`proposal_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_message_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_message_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `notification_type` enum('Proposal','Proposal Accepted','Proposal Rejected','Message','Payment','Review','Gig Update') NOT NULL,
  `message` text NOT NULL,
  `related_id` int DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `fk_notification_user` (`user_id`),
  CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
--
-- Table structure for table `order_milestone`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_milestone` (
  `milestone_id` int NOT NULL AUTO_INCREMENT,
  `contract_id` int NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text,
  `amount` decimal(12,2) NOT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('Pending','In Progress','Completed','Cancelled') DEFAULT 'Pending',
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`milestone_id`),
  KEY `fk_milestone_contract` (`contract_id`),
  CONSTRAINT `fk_milestone_contract` FOREIGN KEY (`contract_id`) REFERENCES `contract` (`contract_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_milestone_amount` CHECK ((`amount` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `contract_id` int NOT NULL,
  `milestone_id` int DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_date` datetime DEFAULT NULL,
  `payment_method` enum('Card','Bank Transfer','UPI','Other') DEFAULT NULL,
  `payment_status` enum('Pending','Completed','Failed','Refunded') DEFAULT 'Pending',
  `transaction_reference` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `transaction_reference` (`transaction_reference`),
  KEY `fk_payment_contract` (`contract_id`),
  KEY `fk_payment_milestone` (`milestone_id`),
  CONSTRAINT `fk_payment_contract` FOREIGN KEY (`contract_id`) REFERENCES `contract` (`contract_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payment_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `order_milestone` (`milestone_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_payment_amount` CHECK ((`amount` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `proposal`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proposal` (
  `proposal_id` int NOT NULL AUTO_INCREMENT,
  `gig_id` int NOT NULL,
  `freelancer_id` int NOT NULL,
  `bid_amount` decimal(12,2) NOT NULL,
  `cover_letter` text,
  `proposed_date` date NOT NULL DEFAULT (curdate()),
  `estimated_days` int DEFAULT NULL,
  `status` enum('Pending','Accepted','Rejected','Withdrawn') DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `responded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`proposal_id`),
  UNIQUE KEY `uq_gig_freelancer_proposal` (`gig_id`,`freelancer_id`),
  KEY `fk_proposal_freelancer` (`freelancer_id`),
  KEY `idx_proposal_status` (`status`),
  CONSTRAINT `fk_proposal_freelancer` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer` (`freelancer_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_proposal_gig` FOREIGN KEY (`gig_id`) REFERENCES `gig` (`gig_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_bid_amount` CHECK ((`bid_amount` > 0)),
  CONSTRAINT `chk_estimated_days` CHECK (((`estimated_days` is null) or (`estimated_days` > 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `review`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `review` (
  `review_id` int NOT NULL AUTO_INCREMENT,
  `contract_id` int DEFAULT NULL,
  `gigsy_contract_id` bigint DEFAULT NULL,
  `client_id` int NOT NULL,
  `freelancer_id` int NOT NULL,
  `rating` tinyint NOT NULL,
  `review_text` text,
  `review_date` date NOT NULL DEFAULT (curdate()),
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `contract_id` (`contract_id`),
  UNIQUE KEY `uq_review_gigsy_contract` (`gigsy_contract_id`),
  KEY `fk_review_client` (`client_id`),
  KEY `fk_review_freelancer` (`freelancer_id`),
  CONSTRAINT `fk_review_client` FOREIGN KEY (`client_id`) REFERENCES `client` (`client_id`),
  CONSTRAINT `fk_review_contract` FOREIGN KEY (`contract_id`) REFERENCES `contract` (`contract_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_freelancer` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer` (`freelancer_id`),
  CONSTRAINT `fk_review_gigsy_contract` FOREIGN KEY (`gigsy_contract_id`) REFERENCES `gigsy_contracts` (`contract_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_rating` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `trg_update_freelancer_rating` AFTER INSERT ON `review` FOR EACH ROW BEGIN
    UPDATE freelancer
    SET
        average_rating = (
            SELECT AVG(rating)
            FROM review
            WHERE freelancer_id = NEW.freelancer_id
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM review
            WHERE freelancer_id = NEW.freelancer_id
        )
    WHERE freelancer_id = NEW.freelancer_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `skill`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skill` (
  `skill_id` int NOT NULL AUTO_INCREMENT,
  `skill_name` varchar(100) NOT NULL,
  `skill_description` text,
  `category` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`skill_id`),
  UNIQUE KEY `skill_name` (`skill_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `user_type` enum('Client','Freelancer') NOT NULL,
  `join_date` date NOT NULL DEFAULT (curdate()),
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'gigsy'
--

--
-- Dumping routines for database 'gigsy'
--
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `MatchFreelancersBySkills`(IN input_gig_id INT)
BEGIN
    SELECT
        f.freelancer_id,
        u.name AS freelancer_name,
        COUNT(*) AS matched_skills
    FROM gig_skill gs
    JOIN freelancer_skill fs
        ON gs.skill_id = fs.skill_id
    JOIN freelancer f
        ON fs.freelancer_id = f.freelancer_id
    JOIN users u
        ON f.user_id = u.user_id
    WHERE gs.gig_id = input_gig_id
      AND gs.importance = 'Required'
    GROUP BY f.freelancer_id, u.name
    ORDER BY matched_skills DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `freelancer_profile_view`
--
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `freelancer_profile_view` AS select `f`.`freelancer_id` AS `freelancer_id`,`u`.`name` AS `name`,`u`.`email` AS `email`,`f`.`headline` AS `headline`,`f`.`bio` AS `bio`,`f`.`experience_years` AS `experience_years`,`f`.`hourly_rate` AS `hourly_rate`,`f`.`availability_status` AS `availability_status`,`f`.`average_rating` AS `average_rating`,`f`.`total_reviews` AS `total_reviews` from (`freelancer` `f` join `users` `u` on((`f`.`user_id` = `u`.`user_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `freelancer_skills_view`
--
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `freelancer_skills_view` AS select `f`.`freelancer_id` AS `freelancer_id`,`u`.`name` AS `freelancer_name`,`f`.`headline` AS `headline`,`s`.`skill_name` AS `skill_name`,`fs`.`proficiency_level` AS `proficiency_level`,`fs`.`years_experience` AS `years_experience`,`f`.`average_rating` AS `average_rating` from (((`freelancer` `f` join `users` `u` on((`f`.`user_id` = `u`.`user_id`))) join `freelancer_skill` `fs` on((`f`.`freelancer_id` = `fs`.`freelancer_id`))) join `skill` `s` on((`fs`.`skill_id` = `s`.`skill_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `open_gigs_view`
--
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `open_gigs_view` AS select `g`.`gig_id` AS `gig_id`,`g`.`title` AS `title`,`g`.`description` AS `description`,`g`.`budget_min` AS `budget_min`,`g`.`budget_max` AS `budget_max`,`g`.`deadline` AS `deadline`,`u`.`name` AS `client_name`,`c`.`company_name` AS `company_name` from ((`gig` `g` join `client` `c` on((`g`.`client_id` = `c`.`client_id`))) join `users` `u` on((`c`.`user_id` = `u`.`user_id`))) where (`g`.`status` = 'Open') */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-05 23:22:47
