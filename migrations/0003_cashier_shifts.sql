CREATE TABLE IF NOT EXISTS cashier_shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  opening_cash DECIMAL(12,2) NOT NULL,
  expected_cash DECIMAL(12,2) NULL,
  actual_cash DECIMAL(12,2) NULL,
  cash_difference DECIMAL(12,2) NULL,
  note VARCHAR(255) NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
  active_key TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'ACTIVE' THEN 1 ELSE NULL END) STORED,
  INDEX idx_cashier_shifts_user_opened (user_id, opened_at),
  UNIQUE KEY uniq_cashier_shifts_active (user_id, active_key),
  CONSTRAINT fk_cashier_shifts_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

ALTER TABLE sales
  ADD COLUMN shift_id INT NULL,
  ADD INDEX idx_sales_shift_id (shift_id),
  ADD CONSTRAINT fk_sales_shift_id FOREIGN KEY (shift_id) REFERENCES cashier_shifts(id) ON DELETE SET NULL;
