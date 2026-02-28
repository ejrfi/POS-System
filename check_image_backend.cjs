const mysql = require('mysql2/promise');
const http = require('http');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'pos_system'
    });
    console.log('Connected to database.');
    const [rows] = await conn.execute('SELECT id, name, image FROM products WHERE image IS NOT NULL AND image != "" LIMIT 1');
    
    if (rows.length > 0) {
      console.log('Found product with image:', rows[0]);
      const imageUrl = rows[0].image; // e.g., /uploads/file.jpg
      const fullUrl = `http://localhost:5000${imageUrl}`;
      console.log('Testing URL:', fullUrl);

      http.get(fullUrl, (res) => {
        console.log(`Fetch status: ${res.statusCode}`);
        console.log(`Content-Type: ${res.headers['content-type']}`);
        if (res.statusCode === 200) {
          console.log('SUCCESS: Image is accessible from backend.');
        } else {
          console.log('FAILURE: Image is NOT accessible from backend.');
        }
      }).on('error', (e) => {
        console.error('Fetch error:', e.message);
      });
    } else {
      console.log('No products with images found in DB.');
    }
    
    await conn.end();
  } catch (err) {
    console.error('Error:', err);
  }
})();
