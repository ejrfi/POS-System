ALTER TABLE sales
  MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED';

ALTER TABLE returns
  ADD COLUMN return_number VARCHAR(50) NOT NULL DEFAULT '',
  ADD COLUMN customer_id INT NULL,
  ADD COLUMN cashier_id INT NULL,
  ADD COLUMN points_reversed INT NOT NULL DEFAULT 0,
  ADD COLUMN points_restored INT NOT NULL DEFAULT 0,
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD INDEX idx_returns_sale_status (sale_id, status);

UPDATE returns SET return_number = CONCAT('RET-', id) WHERE return_number = '';

ALTER TABLE return_items
  ADD COLUMN subtotal DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  actor_id INT NULL,
  metadata LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_created (created_at)
);
