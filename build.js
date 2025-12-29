const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { execSync } = require('child_process');

const DIST_DIR = path.join(__dirname, 'dist');
const SRC_DIR = path.join(__dirname, 'src');
const ICONS_DIR = path.join(__dirname, 'icons');

const ESBUILD_COMMON_OPTIONS = {
  bundle: true, // Bundle all dependencies into single file
  format: 'iife', // Immediately Invoked Function Expression (browser-compatible)
  target: 'es2020', // Target modern browsers with ES2020 features
  sourcemap: true, // Generate source maps for debugging
  minify: false, // Keep code readable for development (set to true for production)
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

async function build() {
  const startTime = Date.now();
  console.log('========================================');
  console.log('  Favorite Extension Build Process');
  console.log('========================================\n');

  console.log('🔍 [1/6] Gathering build metadata...');
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

  console.log('\n📁 [2/6] Preparing output directory...');
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
    console.log(`   Created: ${DIST_DIR}`);
  } else {
    console.log(`   Using existing: ${DIST_DIR}`);
  }

  console.log('\n🔨 [3/6] Bundling content script (content.ts)...');
  console.log('   Entry: src/content.ts -> dist/content.js');
  await esbuild.build({
    entryPoints: [path.join(SRC_DIR, 'content.ts')],
    outfile: path.join(DIST_DIR, 'content.js'),
    ...ESBUILD_COMMON_OPTIONS,
  });
  console.log('   ✓ Content script bundled successfully');

  console.log('\n🔨 [4/6] Bundling popup script (popup.ts)...');
  console.log('   Entry: src/popup.ts -> dist/popup.js');
  await esbuild.build({
    entryPoints: [path.join(SRC_DIR, 'popup.ts')],
    outfile: path.join(DIST_DIR, 'popup.js'),
    ...ESBUILD_COMMON_OPTIONS,
  });
  console.log('   ✓ Popup script bundled successfully');

  console.log('\n📄 [5/6] Copying static assets...');

  const staticAssets = [
    { src: path.join(SRC_DIR, 'popup.html'), dest: path.join(DIST_DIR, 'popup.html') },
    { src: path.join(SRC_DIR, 'popup.css'), dest: path.join(DIST_DIR, 'popup.css') },
    { src: path.join(__dirname, 'manifest.json'), dest: path.join(DIST_DIR, 'manifest.json') },
  ];

  staticAssets.forEach(({ src, dest }) => {
    fs.copyFileSync(src, dest);
    console.log(`   ✓ ${path.basename(dest)} copied`);
  });

  console.log('\n🖼️  [6/6] Copying extension icons & writing build info...');
  const distIconsDir = path.join(DIST_DIR, 'icons');

  if (!fs.existsSync(distIconsDir)) {
    fs.mkdirSync(distIconsDir, { recursive: true });
  }

  const iconFiles = fs.readdirSync(ICONS_DIR);
  iconFiles.forEach((file) => {
    fs.copyFileSync(path.join(ICONS_DIR, file), path.join(distIconsDir, file));
  });
  console.log(`   ✓ ${iconFiles.length} icon(s) copied: ${iconFiles.join(', ')}`);

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
