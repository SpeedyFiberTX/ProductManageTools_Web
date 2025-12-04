// scripts/generate-404.js
import fs from 'fs';

const src = 'dist/index.html';
const dest = 'dist/404.html';

try {
  fs.copyFileSync(src, dest);
  console.log('✅ 404.html generated from index.html');
} catch (err) {
  console.error('❌ Failed to generate 404.html:', err);
  process.exit(1);
}
