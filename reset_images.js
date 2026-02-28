import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

async function resetImages() {
  console.log('--- RESETTING IMAGES ---');

  // 1. Clear Uploads Folder
  const uploadDir = path.resolve(process.cwd(), 'uploads');
  if (fs.existsSync(uploadDir)) {
    console.log(`Clearing uploads folder: ${uploadDir}`);
    const files = fs.readdirSync(uploadDir);
    for (const file of files) {
      if (file !== '.gitkeep') { // Keep .gitkeep if exists
        fs.unlinkSync(path.join(uploadDir, file));
        console.log(` - Deleted: ${file}`);
      }
    }
    console.log('Uploads folder cleared.');
  } else {
    console.log('Uploads folder does not exist, creating it...');
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 2. Reset Database Image Columns
  console.log('Resetting image column in products table...');
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'pos_system'
    });

    const [result] = await conn.execute('UPDATE products SET image = NULL');
    console.log(`Database updated: ${result.affectedRows} rows affected.`);
    await conn.end();
  } catch (err) {
    console.error('Database Error:', err.message);
  }

  console.log('--- RESET COMPLETE ---');
  console.log('Please restart your server and try uploading a new image.');
}

resetImages();
