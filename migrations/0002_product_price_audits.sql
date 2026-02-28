CREATE TABLE IF NOT EXISTS product_price_audits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  changed_by INT NULL,
  field VARCHAR(50) NOT NULL,
  old_value VARCHAR(64) NULL,
  new_value VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product_price_audits_product_created (product_id, created_at)
) ENGINE=InnoDB;
