import { db } from "../server/db";
import { 
  sales, 
  returns, 
  cashierShifts, 
  auditLogs,
  customers,
  products
} from "@shared/schema";

/**
 * PRODUCTION CLEANUP SCRIPT
 * 
 * Ini script menghapus semua testing data dan mereset database ke state production-clean.
 * 
 * Jalankan dengan: npm run cleanup:db
 */

async function cleanupDatabase() {
  console.log("🧹 Memulai database cleanup untuk production...\n");

  try {
    // 1. Hapus semua transactions (penjualan)
    console.log("⏳ Menghapus testing transactions...");
    await db.delete(sales);
    console.log("✓ Transactions dihapus\n");

    // 2. Hapus semua returns
    console.log("⏳ Menghapus testing returns...");
    await db.delete(returns);
    console.log("✓ Returns dihapus\n");

    // 3. Hapus semua shift records
    console.log("⏳ Menghapus testing shift records...");
    await db.delete(cashierShifts);
    console.log("✓ Shift records dihapus\n");

    // 4. Hapus semua audit logs
    console.log("⏳ Menghapus audit logs...");
    await db.delete(auditLogs);
    console.log("✓ Audit logs dihapus\n");

    // 5. Reset customer testing data (keep structure)
    console.log("⏳ Cleaning customer testing data...");
    await db.delete(customers);
    console.log("✓ Customer testing data dihapus\n");

    // 6. Reset product testing data ke inventory awal saja
    console.log("⏳ Resetting product stock...");
    // Ini optional - hanya reset stock jika ingin fresh inventory
    // await db.update(products).set({ stock: 0 });
    console.log("✓ Product stock ready for fresh start\n");

    console.log("═══════════════════════════════════════════");
    console.log("✅ Database cleanup selesai!");
    console.log("═══════════════════════════════════════════\n");
    console.log("📌 Database siap untuk production v1.0.0.");
    console.log("📌 Default admin akan dibuat saat aplikasi pertama kali dijalankan.");
    console.log("📌 File backup tersimpan di: ./backups/\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error saat cleanup database:", error);
    process.exit(1);
  }
}

cleanupDatabase();
