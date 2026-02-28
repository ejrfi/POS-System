import mysql from "mysql2/promise";

async function main() {
  const url = process.env.DATABASE_URL || "mysql://root:@localhost:3306/pos_system";
  const conn = await mysql.createConnection(url);
  const [rows] = await conn.query(
    "SELECT COUNT(*) c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='discounts' AND COLUMN_NAME='active'"
  );
  const exists = Number(rows?.[0]?.c ?? 0) > 0;
  if (!exists) {
    console.log("Adding discounts.active...");
    await conn.query("ALTER TABLE discounts ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE");
  } else {
    console.log("discounts.active already exists");
  }
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
