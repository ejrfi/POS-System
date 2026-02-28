ALTER TABLE products
  ADD COLUMN pcs_per_carton INT NOT NULL DEFAULT 1,
  ADD COLUMN carton_price DECIMAL(10,2) NULL,
  ADD COLUMN supports_carton BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE sale_items
  ADD COLUMN unit_type VARCHAR(20) NOT NULL DEFAULT 'PCS',
  ADD COLUMN conversion_qty INT NOT NULL DEFAULT 0;

UPDATE sale_items
SET conversion_qty = quantity
WHERE conversion_qty = 0;
