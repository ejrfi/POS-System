ALTER TABLE sales
  ADD COLUMN status VARCHAR(12) NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN cancelled_at TIMESTAMP NULL,
  ADD COLUMN cancelled_by INT NULL,
  ADD INDEX idx_sales_shift_status_date (shift_id, status, transaction_date);
