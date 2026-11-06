USE gigsy;

ALTER TABLE review
DROP FOREIGN KEY fk_review_contract;

ALTER TABLE review
MODIFY COLUMN contract_id BIGINT NOT NULL;

ALTER TABLE review
ADD CONSTRAINT fk_review_gigsy_contract
FOREIGN KEY (contract_id)
REFERENCES gigsy_contracts(contract_id);