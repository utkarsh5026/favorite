const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const DIST_DIR = path.join(__dirname, 'dist');

async function build() {
  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  console.log('🔨 Bundling TypeScript with esbuild...');

  // Build content script
  await esbuild.build({
    entryPoints: ['src/content.ts'],
    bundle: true,
    outfile: 'dist/content.js',
    format: 'iife',
    target: 'es2020',
    sourcemap: true,
    minify: false,
  });

  await esbuild.build({
    entryPoints: ['src/popup.ts'],
    bundle: true,
    outfile: 'dist/popup.js',
    format: 'iife',
    target: 'es2020',
    sourcemap: true,
    minify: false,
  });

  console.log('📄 Copying popup files...');
  fs.copyFileSync(
    path.join(__dirname, 'src', 'popup.html'),
    path.join(DIST_DIR, 'popup.html')
  );
  fs.copyFileSync(
    path.join(__dirname, 'src', 'popup.css'),
    path.join(DIST_DIR, 'popup.css')
  );

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
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
