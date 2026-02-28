import mysql from 'mysql2/promise';

async function fixDbColumn() {
  console.log('--- FIXING DB COLUMN FOR BASE64 ---');

  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'pos_system'
    });

    console.log('Connected to database.');
    
    // Check current column type (optional, but good for logs)
    const [columns] = await conn.execute("SHOW COLUMNS FROM products LIKE 'image'");
    console.log('Current column definition:', columns[0].Type);

    // Alter table to use LONGTEXT (supports up to 4GB, plenty for base64 images)
    // TEXT is only 64KB, which is too small for most images.
    // MEDIUMTEXT is 16MB. LONGTEXT is 4GB.
    console.log('Altering products table to modify image column to LONGTEXT...');
    await conn.execute('ALTER TABLE products MODIFY image LONGTEXT');
    
    console.log('SUCCESS: Column `image` changed to LONGTEXT.');
    
    await conn.end();
  } catch (err) {
    console.error('Database Error:', err.message);
  }

  console.log('--- FIX COMPLETE ---');
}

fixDbColumn();
