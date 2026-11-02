-- Dedicated chat table avoids assumptions about the existing message table.
-- Run once in MySQL Workbench after selecting the gigsy database.
USE gigsy;
CREATE TABLE IF NOT EXISTS gigsy_chat_message (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 sender_id INT NOT NULL,
 receiver_id INT NOT NULL,
 body TEXT NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 read_at TIMESTAMP NULL,
 INDEX idx_chat_sender (sender_id,receiver_id,created_at),
 INDEX idx_chat_receiver (receiver_id,sender_id,created_at),
 CONSTRAINT fk_gigsy_chat_sender FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
 CONSTRAINT fk_gigsy_chat_receiver FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE,
 CONSTRAINT chk_chat_body CHECK (CHAR_LENGTH(body) BETWEEN 1 AND 5000),
 CONSTRAINT chk_chat_distinct CHECK (sender_id <> receiver_id)
) ENGINE=InnoDB;
