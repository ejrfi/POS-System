
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";

export const poolConnection = mysql.createPool(process.env.DATABASE_URL || "mysql://root:@localhost:3306/pos_system");

export const db = drizzle(poolConnection, { schema, mode: 'default' });

async function columnExists(tableName: string, columnName: string) {
  const [rows] = await poolConnection.query(
    `
    SELECT 1 AS ok
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [tableName, columnName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function ensureColumn(tableName: string, columnName: string, columnSql: string) {
  const exists = await columnExists(tableName, columnName);
  if (exists) return;
  await poolConnection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${columnSql}`);
}

async function getColumnNullable(tableName: string, columnName: string) {
  const [rows] = await poolConnection.query(
    `
    SELECT IS_NULLABLE AS isNullable, COLUMN_TYPE AS columnType
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [tableName, columnName]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row: any = rows[0];
  return { isNullable: String(row.isNullable || "").toUpperCase() === "YES", columnType: String(row.columnType || "") };
}

async function ensureColumnNotNull(tableName: string, columnName: string, fullColumnDefinition: string) {
  const info = await getColumnNullable(tableName, columnName);
  if (!info) return;
  if (!info.isNullable) return;
  await poolConnection.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN ${fullColumnDefinition}`);
}

async function ensureVarcharMinLength(tableName: string, columnName: string, minLength: number) {
  const [rows] = await poolConnection.query(
    `
    SELECT CHARACTER_MAXIMUM_LENGTH AS len, DATA_TYPE AS dataType
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [tableName, columnName]
  );
  if (!Array.isArray(rows) || rows.length === 0) return;
  const row: any = rows[0];
  const len = row.len != null ? Number(row.len) : null;
  const dataType = String(row.dataType || "").toLowerCase();
  if (dataType !== "varchar") return;
  if (len != null && len >= minLength) return;
  await poolConnection.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${columnName}\` VARCHAR(${minLength})`);
}

export async function ensureMultiUnitColumns() {
  await ensureColumn("products", "pcs_per_carton", "`pcs_per_carton` INT NOT NULL DEFAULT 1");
  await ensureColumn("products", "carton_price", "`carton_price` DECIMAL(10,2) NULL");
  await ensureColumn("products", "supports_carton", "`supports_carton` BOOLEAN NOT NULL DEFAULT FALSE");

  await ensureColumn("sale_items", "unit_type", "`unit_type` VARCHAR(20) NOT NULL DEFAULT 'PCS'");
  await ensureColumn("sale_items", "conversion_qty", "`conversion_qty` INT NOT NULL DEFAULT 0");
}

export async function ensureProductPriceAuditsTable() {
  await poolConnection.query(`
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
  `);
}

export async function ensureSuspendedSalesTable() {
  await poolConnection.query(`
    CREATE TABLE IF NOT EXISTS suspended_sales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cashier_id INT NOT NULL,
      customer_id INT NULL,
      note VARCHAR(255) NULL,
      payload LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_suspended_sales_cashier_created (cashier_id, created_at)
    ) ENGINE=InnoDB;
  `);
}

export async function ensureCashierShiftsTable() {
  await poolConnection.query(`
    CREATE TABLE IF NOT EXISTS cashier_shifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      user_name VARCHAR(255) NOT NULL DEFAULT '',
      user_role VARCHAR(50) NOT NULL DEFAULT 'cashier',
      ip_address VARCHAR(45) NULL,
      user_agent VARCHAR(255) NULL,
      opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      closed_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      opening_cash DECIMAL(12,2) NOT NULL,
      expected_cash DECIMAL(12,2) NULL,
      actual_cash DECIMAL(12,2) NULL,
      cash_difference DECIMAL(12,2) NULL,
      note VARCHAR(255) NULL,
      terminal_name VARCHAR(255) NULL,
      status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
      active_key TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'ACTIVE' THEN 1 ELSE NULL END) STORED,
      terminal_active_key TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'ACTIVE' THEN 1 ELSE NULL END) STORED,
      INDEX idx_cashier_shifts_user_opened (user_id, opened_at),
      UNIQUE KEY uniq_cashier_shifts_active (user_id, active_key),
      UNIQUE KEY uniq_cashier_shifts_terminal_active (terminal_name, terminal_active_key)
    ) ENGINE=InnoDB;
  `);
}

export async function ensureCashierShiftSnapshotColumns() {
  await ensureColumn("cashier_shifts", "user_name", "`user_name` VARCHAR(255) NOT NULL DEFAULT ''");
  await ensureColumn("cashier_shifts", "user_role", "`user_role` VARCHAR(50) NOT NULL DEFAULT 'cashier'");
  await ensureColumn("cashier_shifts", "ip_address", "`ip_address` VARCHAR(45) NULL");
  await ensureColumn("cashier_shifts", "user_agent", "`user_agent` VARCHAR(255) NULL");
  await ensureColumn("cashier_shifts", "created_at", "`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
  await ensureColumn("cashier_shifts", "updated_at", "`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
  await ensureColumn("cashier_shifts", "terminal_name", "`terminal_name` VARCHAR(255) NULL");
  await ensureColumn("cashier_shifts", "terminal_active_key", "`terminal_active_key` TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'ACTIVE' THEN 1 ELSE NULL END) STORED");

  try {
    await poolConnection.query(`CREATE UNIQUE INDEX uniq_cashier_shifts_terminal_active ON cashier_shifts (terminal_name, terminal_active_key)`);
  } catch {
  }
}

export async function ensureSalesShiftIdColumn() {
  await ensureColumn("sales", "shift_id", "`shift_id` INT NULL");
}

export async function ensureReturnRefundMethodColumn() {
  await ensureColumn("returns", "refund_method", "`refund_method` VARCHAR(50) NOT NULL DEFAULT 'cash'");
}

export async function ensureSalesStatusColumns() {
  await ensureColumn("sales", "status", "`status` VARCHAR(12) NOT NULL DEFAULT 'COMPLETED'");
  await ensureVarcharMinLength("sales", "status", 20);
  await ensureColumn("sales", "cancelled_at", "`cancelled_at` TIMESTAMP NULL");
  await ensureColumn("sales", "cancelled_by", "`cancelled_by` INT NULL");
  await ensureColumn("sales", "cancelled_shift_id", "`cancelled_shift_id` INT NULL");
  try {
    await poolConnection.query(`CREATE INDEX ix_sales_cancelled_shift_id ON sales (cancelled_shift_id)`);
  } catch {
  }
}

export async function ensureReturnsEnhancementsSchema() {
  await ensureColumn("returns", "return_number", "`return_number` VARCHAR(50) NOT NULL DEFAULT ''");
  await ensureColumn("returns", "customer_id", "`customer_id` INT NULL");
  await ensureColumn("returns", "cashier_id", "`cashier_id` INT NULL");
  await ensureColumn("returns", "shift_id", "`shift_id` INT NULL");
  await ensureColumn("returns", "points_reversed", "`points_reversed` INT NOT NULL DEFAULT 0");
  await ensureColumn("returns", "points_restored", "`points_restored` INT NOT NULL DEFAULT 0");
  await ensureColumn("returns", "status", "`status` VARCHAR(20) NOT NULL DEFAULT 'COMPLETED'");
  await ensureColumn("returns", "created_at", "`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
  await ensureColumn("return_items", "subtotal", "`subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0");
  try {
    await poolConnection.query(`CREATE INDEX idx_returns_sale_status ON returns (sale_id, status)`);
  } catch {
  }
  try {
    await poolConnection.query(`CREATE INDEX ix_returns_shift_id ON returns (shift_id)`);
  } catch {
  }
}

export async function ensureAuditLogsTable() {
  await poolConnection.query(`
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
    ) ENGINE=InnoDB;
  `);
}

export async function ensureAppSettingsTable() {
  await poolConnection.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      store_name VARCHAR(255) NOT NULL DEFAULT 'Barokah Frozen Food',
      store_address VARCHAR(255) NULL,
      receipt_footer VARCHAR(255) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);
}

export async function ensureShiftReportsSchema() {
  await ensureColumn("cashier_shifts", "shift_code", "`shift_code` VARCHAR(50) NULL");
  await ensureColumn("cashier_shifts", "system_cash_total", "`system_cash_total` DECIMAL(12,2) NULL");
  await ensureColumn("cashier_shifts", "total_transactions", "`total_transactions` INT NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "total_sales", "`total_sales` DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "total_refund", "`total_refund` DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "cash_refunds", "`cash_refunds` DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "non_cash_refunds", "`non_cash_refunds` DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "total_discount", "`total_discount` DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "total_point_used", "`total_point_used` INT NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "total_point_earned", "`total_point_earned` INT NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "points_reversed", "`points_reversed` INT NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "points_restored", "`points_restored` INT NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "total_cash_sales", "`total_cash_sales` DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "total_non_cash_sales", "`total_non_cash_sales` DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "total_void", "`total_void` INT NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "total_returns", "`total_returns` INT NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "point_tx_count", "`point_tx_count` INT NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "big_discount_tx_count", "`big_discount_tx_count` INT NOT NULL DEFAULT 0");
  await ensureColumn("cashier_shifts", "approval_status", "`approval_status` VARCHAR(20) NOT NULL DEFAULT 'NONE'");
  await ensureColumn("cashier_shifts", "approved_by", "`approved_by` INT NULL");
  await ensureColumn("cashier_shifts", "approved_at", "`approved_at` TIMESTAMP NULL");
  await ensureColumn("cashier_shifts", "approval_note", "`approval_note` VARCHAR(255) NULL");
  await ensureColumn("cashier_shifts", "close_note", "`close_note` VARCHAR(255) NULL");
  await ensureColumn("cashier_shifts", "payment_breakdown", "`payment_breakdown` LONGTEXT NULL");
  await ensureVarcharMinLength("cashier_shifts", "status", 20);

  try {
    await poolConnection.query(`ALTER TABLE cashier_shifts MODIFY COLUMN active_key TINYINT GENERATED ALWAYS AS (CASE WHEN status IN ('ACTIVE','OPEN') THEN 1 ELSE NULL END) STORED`);
  } catch {
  }
  try {
    await poolConnection.query(`ALTER TABLE cashier_shifts MODIFY COLUMN terminal_active_key TINYINT GENERATED ALWAYS AS (CASE WHEN status IN ('ACTIVE','OPEN') THEN 1 ELSE NULL END) STORED`);
  } catch {
  }

  try {
    await poolConnection.query(`CREATE UNIQUE INDEX ux_cashier_shifts_shift_code ON cashier_shifts (shift_code)`);
  } catch {
  }
  try {
    await poolConnection.query(`CREATE INDEX ix_cashier_shifts_approval_status ON cashier_shifts (approval_status)`);
  } catch {
  }
}

export async function ensureDiscountsSchema() {
  await poolConnection.query(`
    CREATE TABLE IF NOT EXISTS discounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'percentage',
      value DECIMAL(10,2) NOT NULL,
      applies_to VARCHAR(20) NOT NULL DEFAULT 'global',
      start_date TIMESTAMP NULL,
      end_date TIMESTAMP NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
      minimum_purchase DECIMAL(12,2) NOT NULL DEFAULT 0,
      priority_level INT NOT NULL DEFAULT 0,
      stackable BOOLEAN NOT NULL DEFAULT FALSE,
      customer_type VARCHAR(20) NULL,
      description TEXT NULL,
      product_id INT NULL,
      brand_id INT NULL,
      category_id INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_discounts_active_dates (active, start_date, end_date),
      INDEX idx_discounts_targets (product_id, brand_id, category_id),
      INDEX idx_discounts_applies_to (applies_to),
      INDEX idx_discounts_status (status)
    ) ENGINE=InnoDB;
  `);

  await ensureColumn("discounts", "active", "`active` BOOLEAN NOT NULL DEFAULT TRUE");
  await ensureColumn("discounts", "start_date", "`start_date` TIMESTAMP NULL");
  await ensureColumn("discounts", "end_date", "`end_date` TIMESTAMP NULL");
  await ensureColumn("discounts", "product_id", "`product_id` INT NULL");
  await ensureColumn("discounts", "brand_id", "`brand_id` INT NULL");
  await ensureColumn("discounts", "category_id", "`category_id` INT NULL");
  await ensureColumn("discounts", "applies_to", "`applies_to` VARCHAR(20) NOT NULL DEFAULT 'global'");
  await ensureColumn("discounts", "status", "`status` VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'");
  await ensureColumn("discounts", "minimum_purchase", "`minimum_purchase` DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn("discounts", "priority_level", "`priority_level` INT NOT NULL DEFAULT 0");
  await ensureColumn("discounts", "stackable", "`stackable` BOOLEAN NOT NULL DEFAULT FALSE");
  await ensureColumn("discounts", "customer_type", "`customer_type` VARCHAR(20) NULL");
  await ensureColumn("discounts", "created_at", "`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
  await ensureColumn("discounts", "updated_at", "`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

  try {
    await poolConnection.query(`CREATE INDEX idx_discounts_active_dates ON discounts (active, start_date, end_date)`);
  } catch {
  }
  try {
    await poolConnection.query(`CREATE INDEX idx_discounts_targets ON discounts (product_id, brand_id, category_id)`);
  } catch {
  }
  try {
    await poolConnection.query(`CREATE INDEX idx_discounts_applies_to ON discounts (applies_to)`);
  } catch {
  }
  try {
    await poolConnection.query(`CREATE INDEX idx_discounts_status ON discounts (status)`);
  } catch {
  }
}

export async function ensureCustomerMembershipSchema() {
  await poolConnection.query(`
    CREATE TABLE IF NOT EXISTS loyalty_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      earn_amount_per_point DECIMAL(12,2) NOT NULL DEFAULT 10000,
      redeem_amount_per_point DECIMAL(12,2) NOT NULL DEFAULT 100,
      silver_min_spending DECIMAL(14,2) NOT NULL DEFAULT 1000000,
      gold_min_spending DECIMAL(14,2) NOT NULL DEFAULT 5000000,
      platinum_min_spending DECIMAL(14,2) NOT NULL DEFAULT 10000000,
      silver_point_multiplier DECIMAL(6,2) NOT NULL DEFAULT 1.00,
      gold_point_multiplier DECIMAL(6,2) NOT NULL DEFAULT 1.25,
      platinum_point_multiplier DECIMAL(6,2) NOT NULL DEFAULT 1.50,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await poolConnection.query(`
    INSERT INTO loyalty_settings (
      id,
      earn_amount_per_point,
      redeem_amount_per_point,
      silver_min_spending,
      gold_min_spending,
      platinum_min_spending,
      silver_point_multiplier,
      gold_point_multiplier,
      platinum_point_multiplier
    )
    VALUES (1, 10000, 100, 1000000, 5000000, 10000000, 1.00, 1.25, 1.50)
    ON DUPLICATE KEY UPDATE id = id
  `);

  await ensureColumn("customers", "email", "`email` VARCHAR(255) NULL");
  await ensureColumn("customers", "address", "`address` TEXT NULL");
  await ensureColumn("customers", "customer_type", "`customer_type` VARCHAR(20) NOT NULL DEFAULT 'regular'");
  await ensureColumn("customers", "total_spending", "`total_spending` DECIMAL(14,2) NOT NULL DEFAULT 0");
  await ensureColumn("customers", "tier_level", "`tier_level` VARCHAR(20) NOT NULL DEFAULT 'REGULAR'");
  await ensureColumn("customers", "status", "`status` VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'");
  await ensureColumn("customers", "deleted_at", "`deleted_at` TIMESTAMP NULL");
  await ensureColumn("customers", "updated_at", "`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

  await ensureColumn("sales", "item_discount_amount", "`item_discount_amount` DECIMAL(12,2) NULL DEFAULT 0");
  await ensureColumn("sales", "global_discount_amount", "`global_discount_amount` DECIMAL(12,2) NULL DEFAULT 0");
  await ensureColumn("sales", "applied_global_discount_id", "`applied_global_discount_id` INT NULL");
  await ensureColumn("sales", "redeemed_points", "`redeemed_points` INT NOT NULL DEFAULT 0");
  await ensureColumn("sales", "redeemed_amount", "`redeemed_amount` DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn("sales", "points_earned", "`points_earned` INT NOT NULL DEFAULT 0");

  await ensureColumn("sale_items", "applied_discount_id", "`applied_discount_id` INT NULL");

  try {
    await poolConnection.query(`CREATE INDEX idx_sales_customer_date ON sales (customer_id, transaction_date)`);
  } catch {
  }
  try {
    await poolConnection.query(`CREATE INDEX idx_point_logs_customer_created ON point_logs (customer_id, created_at)`);
  } catch {
  }
}

export async function ensureEnterpriseInventorySchema() {
  await poolConnection.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      UNIQUE KEY categories_name_unique (name)
    ) ENGINE=InnoDB;
  `);

  await ensureColumn("categories", "description", "`description` TEXT NULL");
  await ensureColumn("categories", "status", "`status` VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'");
  await ensureColumn("categories", "created_at", "`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
  await ensureColumn("categories", "updated_at", "`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

  await poolConnection.query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NULL,
      address TEXT NULL,
      UNIQUE KEY suppliers_name_unique (name)
    ) ENGINE=InnoDB;
  `);

  await ensureColumn("suppliers", "status", "`status` VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'");
  await ensureColumn("suppliers", "created_at", "`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
  await ensureColumn("suppliers", "updated_at", "`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

  await ensureColumn("brands", "category_id", "`category_id` INT NULL");
  await ensureColumn("brands", "status", "`status` VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'");
  await ensureColumn("brands", "created_at", "`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
  await ensureColumn("brands", "updated_at", "`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

  await poolConnection.query(`
    INSERT INTO categories (name, description, status)
    VALUES ('Umum', NULL, 'ACTIVE')
    ON DUPLICATE KEY UPDATE name = name
  `);

  const [categoryRows] = await poolConnection.query(`SELECT id FROM categories WHERE name = 'Umum' LIMIT 1`);
  const defaultCategoryId = Array.isArray(categoryRows) && categoryRows.length ? Number((categoryRows as any)[0].id) : 1;

  await poolConnection.query(`UPDATE brands SET category_id = ? WHERE category_id IS NULL`, [defaultCategoryId]);
  await ensureColumnNotNull("brands", "category_id", "`category_id` INT NOT NULL");

  try {
    await poolConnection.query(`ALTER TABLE brands DROP INDEX brands_name_unique`);
  } catch {
  }

  try {
    await poolConnection.query(`CREATE INDEX brands_category_idx ON brands (category_id)`);
  } catch {
  }

  try {
    await poolConnection.query(`CREATE UNIQUE INDEX brands_category_name_unique ON brands (category_id, name)`);
  } catch {
  }

  try {
    await poolConnection.query(`
      ALTER TABLE brands
        ADD CONSTRAINT brands_category_fk FOREIGN KEY (category_id) REFERENCES categories (id)
    `);
  } catch {
  }

  await ensureColumn("products", "category_id", "`category_id` INT NULL");
  await ensureColumn("products", "supplier_id", "`supplier_id` INT NULL");
  await ensureColumn("products", "brand_id", "`brand_id` INT NULL");
  await ensureColumn("products", "min_stock", "`min_stock` INT NOT NULL DEFAULT 0");
  await ensureColumn("products", "status", "`status` VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'");
  await ensureColumn("products", "deleted_at", "`deleted_at` TIMESTAMP NULL");
  await ensureColumn("products", "cost_price", "`cost_price` DECIMAL(10,2) NOT NULL DEFAULT 0");
  await ensureColumn("products", "updated_at", "`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

  await poolConnection.query(`
    INSERT INTO suppliers (name, phone, address, status)
    VALUES ('Default Supplier', NULL, NULL, 'ACTIVE')
    ON DUPLICATE KEY UPDATE name = name
  `);
  const [supplierRows] = await poolConnection.query(`SELECT id FROM suppliers WHERE name = 'Default Supplier' LIMIT 1`);
  const defaultSupplierId = Array.isArray(supplierRows) && supplierRows.length ? Number((supplierRows as any)[0].id) : 1;

  await poolConnection.query(
    `
    INSERT INTO brands (name, category_id, status)
    VALUES ('Generic', ?, 'ACTIVE')
    ON DUPLICATE KEY UPDATE name = name
    `,
    [defaultCategoryId],
  );
  const [brandRows] = await poolConnection.query(`SELECT id FROM brands WHERE name = 'Generic' AND category_id = ? LIMIT 1`, [defaultCategoryId]);
  const defaultBrandId = Array.isArray(brandRows) && brandRows.length ? Number((brandRows as any)[0].id) : 1;

  await poolConnection.query(`UPDATE products SET category_id = ? WHERE category_id IS NULL`, [defaultCategoryId]);
  await poolConnection.query(`UPDATE products SET supplier_id = ? WHERE supplier_id IS NULL`, [defaultSupplierId]);
  await poolConnection.query(`UPDATE products SET brand_id = ? WHERE brand_id IS NULL`, [defaultBrandId]);

  try {
    await poolConnection.query(`CREATE INDEX products_category_idx ON products (category_id)`);
  } catch {
  }
  try {
    await poolConnection.query(`CREATE INDEX products_supplier_idx ON products (supplier_id)`);
  } catch {
  }
  try {
    await poolConnection.query(`CREATE INDEX products_brand_idx ON products (brand_id)`);
  } catch {
  }
  try {
    await poolConnection.query(`CREATE INDEX products_status_idx ON products (status)`);
  } catch {
  }

  try {
    await poolConnection.query(`ALTER TABLE products DROP FOREIGN KEY products_category_fk`);
  } catch {
  }
  try {
    await poolConnection.query(`ALTER TABLE products DROP FOREIGN KEY products_supplier_fk`);
  } catch {
  }
  try {
    await poolConnection.query(`ALTER TABLE products DROP FOREIGN KEY products_brand_fk`);
  } catch {
  }

  await ensureColumnNotNull("products", "category_id", "`category_id` INT NOT NULL");
  await ensureColumnNotNull("products", "supplier_id", "`supplier_id` INT NOT NULL");
  await ensureColumnNotNull("products", "brand_id", "`brand_id` INT NOT NULL");

  try {
    await poolConnection.query(`
      ALTER TABLE products
        ADD CONSTRAINT products_category_fk FOREIGN KEY (category_id) REFERENCES categories (id)
    `);
  } catch {
  }
  try {
    await poolConnection.query(`
      ALTER TABLE products
        ADD CONSTRAINT products_supplier_fk FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
    `);
  } catch {
  }
  try {
    await poolConnection.query(`
      ALTER TABLE products
        ADD CONSTRAINT products_brand_fk FOREIGN KEY (brand_id) REFERENCES brands (id)
    `);
  } catch {
  }
}
