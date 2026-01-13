const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { execSync } = require('child_process');
const postcss = require('postcss');
const tailwindcss = require('@tailwindcss/postcss');
const autoprefixer = require('autoprefixer');

const DIST_DIR = path.join(__dirname, 'dist');
const SRC_DIR = path.join(__dirname, 'src');
const ICONS_DIR = path.join(__dirname, 'icons');

const ESBUILD_COMMON_OPTIONS = {
  bundle: true, // Bundle all dependencies into single file
  format: 'iife', // Immediately Invoked Function Expression (browser-compatible)
  target: 'es2020', // Target modern browsers with ES2020 features
  sourcemap: true, // Generate source maps for debugging
  minify: false, // Keep code readable for development (set to true for production)
  alias: {
    '@': path.join(__dirname, 'src'),
  },
};

/**
 * Executes a git command and returns the trimmed output.
 * Returns null if the command fails (e.g., not a git repository).
 */
function execGitCommand(command) {
  try {
    return execSync(`git ${command}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

/**
 * Gathers comprehensive git repository information and build metadata.
 * This information helps track which exact code version was built and when.
 */
function getBuildInfo() {
  const now = new Date();

  const commitHash = execGitCommand('rev-parse HEAD');
  const commitHashShort = execGitCommand('rev-parse --short HEAD');
  const branch = execGitCommand('rev-parse --abbrev-ref HEAD');
  const commitMessage = execGitCommand('log -1 --format=%s');
  const commitAuthor = execGitCommand('log -1 --format=%an');
  const commitDate = execGitCommand('log -1 --format=%aI');
  const tag = execGitCommand('describe --tags --exact-match 2>/dev/null') || null;

  const statusOutput = execGitCommand('status --porcelain');
  const isDirty = statusOutput ? statusOutput.length > 0 : false;

  return {
    git: {
      commitHash,
      commitHashShort,
      branch,
      commitMessage,
      commitAuthor,
      commitDate,
      isDirty,
      tag,
    },
    build: {
      timestamp: now.toISOString(),
      timestampUnix: now.getTime(),
      nodeVersion: process.version,
      platform: process.platform,
    },
  };
}

/**
 * Processes CSS through PostCSS with Tailwind CSS.
 * Reads the base CSS file, processes it, and writes to dist.
 */
async function buildCSS() {
  const cssPath = path.join(SRC_DIR, 'popup.base.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  const result = await postcss([tailwindcss, autoprefixer]).process(css, {
    from: cssPath,
    to: path.join(DIST_DIR, 'popup.css'),
  });
  fs.writeFileSync(path.join(DIST_DIR, 'popup.css'), result.css);
  if (result.map) {
    fs.writeFileSync(path.join(DIST_DIR, 'popup.css.map'), result.map.toString());
  }
}

async function build() {
  const startTime = Date.now();
  console.log('========================================');
  console.log('  Favorite Extension Build Process');
  console.log('========================================\n');

  console.log('🔍 [1/8] Gathering build metadata...');
  const buildInfo = getBuildInfo();

  if (buildInfo.git.commitHash) {
    console.log(
      `   Git commit:  ${buildInfo.git.commitHashShort}${buildInfo.git.isDirty ? ' (dirty)' : ''}`
    );
    console.log(`   Branch:      ${buildInfo.git.branch}`);
    console.log(`   Author:      ${buildInfo.git.commitAuthor}`);
    console.log(`   Message:     ${buildInfo.git.commitMessage}`);
    if (buildInfo.git.tag) {
      console.log(`   Tag:         ${buildInfo.git.tag}`);
    }
  } else {
    console.log('   ⚠️  Not a git repository (git info unavailable)');
  }
  console.log(`   Timestamp:   ${buildInfo.build.timestamp}`);
  console.log(`   Node:        ${buildInfo.build.nodeVersion}`);
  console.log(`   Platform:    ${buildInfo.build.platform}`);

  console.log('\n📁 [2/8] Preparing output directory...');
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
    console.log(`   Created: ${DIST_DIR}`);
  } else {
    console.log(`   Using existing: ${DIST_DIR}`);
  }

  console.log('\n🔨 [3/8] Bundling content script (content/index.ts)...');
  console.log('   Entry: src/content/index.ts -> dist/content.js');
  await esbuild.build({
    entryPoints: [path.join(SRC_DIR, 'content', 'index.ts')],
    outfile: path.join(DIST_DIR, 'content.js'),
    ...ESBUILD_COMMON_OPTIONS,
  });
  console.log('   ✓ Content script bundled successfully');

  console.log('\n🔨 [4/8] Bundling popup script (popup/index.ts)...');
  console.log('   Entry: src/popup/index.ts -> dist/popup.js');
  await esbuild.build({
    entryPoints: [path.join(SRC_DIR, 'popup', 'index.ts')],
    outfile: path.join(DIST_DIR, 'popup.js'),
    ...ESBUILD_COMMON_OPTIONS,
  });
  console.log('   ✓ Popup script bundled successfully');

  console.log('\n🔨 [5/8] Bundling background script (background.ts)...');
  console.log('   Entry: src/background.ts -> dist/background.js');
  await esbuild.build({
    entryPoints: [path.join(SRC_DIR, 'background.ts')],
    outfile: path.join(DIST_DIR, 'background.js'),
    ...ESBUILD_COMMON_OPTIONS,
    format: 'esm', 
  });
  console.log('   ✓ Background script bundled successfully');

  console.log('\n🎨 [6/8] Processing CSS with Tailwind...');
  console.log('   Entry: src/popup.base.css -> dist/popup.css');
  await buildCSS();
  console.log('   ✓ CSS processed successfully');

  console.log('\n📄 [7/8] Copying static assets...');

  const staticAssets = [
    { src: path.join(SRC_DIR, 'popup.html'), dest: path.join(DIST_DIR, 'popup.html') },
    { src: path.join(__dirname, 'manifest.json'), dest: path.join(DIST_DIR, 'manifest.json') },
  ];

  staticAssets.forEach(({ src, dest }) => {
    fs.copyFileSync(src, dest);
    console.log(`   ✓ ${path.basename(dest)} copied`);
  });

  console.log('\n🖼️  [8/8] Copying extension icons, fonts & writing build info...');
  const distIconsDir = path.join(DIST_DIR, 'icons');

  if (!fs.existsSync(distIconsDir)) {
    fs.mkdirSync(distIconsDir, { recursive: true });
  }

  const iconFiles = fs.readdirSync(ICONS_DIR);
  iconFiles.forEach((file) => {
    fs.copyFileSync(path.join(ICONS_DIR, file), path.join(distIconsDir, file));
  });
  console.log(`   ✓ ${iconFiles.length} icon(s) copied: ${iconFiles.join(', ')}`);

  // Copy fonts directory
  const FONTS_DIR = path.join(__dirname, 'fonts');
  const distFontsDir = path.join(DIST_DIR, 'fonts');
  if (fs.existsSync(FONTS_DIR)) {
    if (!fs.existsSync(distFontsDir)) {
      fs.mkdirSync(distFontsDir, { recursive: true });
    }
    const fontFiles = fs.readdirSync(FONTS_DIR);
    fontFiles.forEach((file) => {
      fs.copyFileSync(path.join(FONTS_DIR, file), path.join(distFontsDir, file));
    });
    console.log(`   ✓ ${fontFiles.length} font(s) copied: ${fontFiles.join(', ')}`);
  }

  const buildInfoPath = path.join(DIST_DIR, 'build-info.json');
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
  console.log('   ✓ build-info.json written');

  const buildTime = Date.now() - startTime;
  console.log('\n========================================');
  console.log('  ✅ Build completed successfully!');
  console.log(`  ⏱️  Build time: ${buildTime}ms`);
  if (buildInfo.git.commitHashShort) {
    console.log(
      `  📌 Version: ${buildInfo.git.commitHashShort}${buildInfo.git.isDirty ? '-dirty' : ''}`
    );
  }
  console.log(`  🕐 Built at: ${buildInfo.build.timestamp}`);
  console.log('========================================');
  console.log('\nNext steps:');
  console.log('  1. Open chrome://extensions');
  console.log('  2. Enable "Developer mode"');
  console.log('  3. Click "Load unpacked"');
  console.log(`  4. Select: ${DIST_DIR}`);
  console.log('');
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
