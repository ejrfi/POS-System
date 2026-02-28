ALTER TABLE cashier_shifts
  ADD COLUMN shift_code VARCHAR(50) NULL,
  ADD COLUMN system_cash_total DECIMAL(12,2) NULL,
  ADD COLUMN total_transactions INT NOT NULL DEFAULT 0,
  ADD COLUMN total_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN total_refund DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN total_discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN total_point_used INT NOT NULL DEFAULT 0,
  ADD COLUMN total_point_earned INT NOT NULL DEFAULT 0,
  ADD COLUMN total_cash_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN total_non_cash_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN total_void INT NOT NULL DEFAULT 0,
  ADD COLUMN total_returns INT NOT NULL DEFAULT 0,
  ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'NONE',
  ADD COLUMN approved_by INT NULL,
  ADD COLUMN approved_at TIMESTAMP NULL,
  ADD COLUMN approval_note VARCHAR(255) NULL;

UPDATE cashier_shifts
  SET status = 'OPEN'
  WHERE status = 'ACTIVE';

ALTER TABLE cashier_shifts
  MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'OPEN';

UPDATE cashier_shifts
  SET system_cash_total = expected_cash
  WHERE system_cash_total IS NULL AND expected_cash IS NOT NULL;

UPDATE cashier_shifts
  SET shift_code = CONCAT('SHF-', DATE_FORMAT(opened_at, '%Y%m%d'), '-', user_id, '-', LPAD(id, 6, '0'))
  WHERE shift_code IS NULL;

ALTER TABLE cashier_shifts
  ADD UNIQUE KEY ux_cashier_shifts_shift_code (shift_code);

ALTER TABLE cashier_shifts
  ADD CONSTRAINT fk_cashier_shifts_approved_by
  FOREIGN KEY (approved_by) REFERENCES users(id)
  ON DELETE SET NULL;

ALTER TABLE returns
  ADD COLUMN shift_id INT NULL;

UPDATE returns r
  INNER JOIN sales s ON s.id = r.sale_id
  SET r.shift_id = s.shift_id
  WHERE r.shift_id IS NULL;

ALTER TABLE returns
  ADD KEY ix_returns_shift_id (shift_id),
  ADD CONSTRAINT fk_returns_shift_id
  FOREIGN KEY (shift_id) REFERENCES cashier_shifts(id)
  ON DELETE SET NULL;
