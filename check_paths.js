const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const uploadDir = path.resolve(cwd, 'uploads');

console.log('--- PATH DIAGNOSTICS ---');
console.log('Current Working Directory (CWD):', cwd);
console.log('Expected Upload Directory:', uploadDir);

if (fs.existsSync(uploadDir)) {
  console.log('Upload directory exists: YES');
  try {
    const files = fs.readdirSync(uploadDir);
    console.log(`Found ${files.length} files in uploads:`);
    files.forEach(file => {
      const stats = fs.statSync(path.join(uploadDir, file));
      console.log(` - ${file} (${stats.size} bytes)`);
    });
  } catch (err) {
    console.error('Error reading upload directory:', err.message);
  }
} else {
  console.error('Upload directory exists: NO');
  console.error('Creating directory now...');
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Directory created successfully.');
  } catch (err) {
    console.error('Failed to create directory:', err.message);
  }
}
console.log('------------------------');
