import mysql from "mysql2/promise";

async function main() {
  const url = process.env.DATABASE_URL || "mysql://root:@localhost:3306/pos_system";
  const conn = await mysql.createConnection(url);
  const [rows] = await conn.query(
    "SELECT EXISTS(SELECT 1 FROM discounts WHERE active = TRUE AND status = 'ACTIVE' LIMIT 1) AS ok"
  );
  console.log("query ok:", rows?.[0]?.ok);
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
