ALTER TABLE sales
  ADD COLUMN cancelled_shift_id INT NULL;

UPDATE sales
  SET cancelled_shift_id = shift_id
  WHERE cancelled_shift_id IS NULL AND status = 'CANCELLED' AND shift_id IS NOT NULL;

ALTER TABLE sales
  ADD KEY ix_sales_cancelled_shift_id (cancelled_shift_id),
  ADD CONSTRAINT fk_sales_cancelled_shift_id
  FOREIGN KEY (cancelled_shift_id) REFERENCES cashier_shifts(id)
  ON DELETE SET NULL;
