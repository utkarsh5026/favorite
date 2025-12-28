const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST_DIR = path.join(__dirname, 'dist');


console.log('🔨 Compiling TypeScript...');
execSync('node ./node_modules/typescript/bin/tsc', { stdio: 'inherit', cwd: __dirname });


console.log('📄 Copying manifest.json...');
fs.copyFileSync(
  path.join(__dirname, 'manifest.json'),
  path.join(DIST_DIR, 'manifest.json')
);


console.log('🖼️ Copying icons...');
const iconsDir = path.join(__dirname, 'icons');
const distIconsDir = path.join(DIST_DIR, 'icons');

if (!fs.existsSync(distIconsDir)) {
  fs.mkdirSync(distIconsDir, { recursive: true });
}

fs.readdirSync(iconsDir).forEach(file => {
  fs.copyFileSync(
    path.join(iconsDir, file),
    path.join(distIconsDir, file)
  );
});

console.log('✅ Build complete! Load the extension from: dist/');
