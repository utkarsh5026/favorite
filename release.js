const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const JSZip = require('jszip');

const DIST_DIR = path.join(__dirname, 'dist');
const RELEASE_DIR = path.join(__dirname, 'releases');

async function getVersion() {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
  return manifest.version;
}

async function createZip(version) {
  const zip = new JSZip();
  const zipFileName = `favorite-v${version}.zip`;

  function addFilesToZip(dir, zipFolder) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        addFilesToZip(filePath, zipFolder.folder(file));
      } else {
        if (file.endsWith('.map')) continue;
        const content = fs.readFileSync(filePath);
        zipFolder.file(file, content);
      }
    }
  }

  addFilesToZip(DIST_DIR, zip);

  if (!fs.existsSync(RELEASE_DIR)) {
    fs.mkdirSync(RELEASE_DIR, { recursive: true });
  }

  const zipPath = path.join(RELEASE_DIR, zipFileName);
  const content = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(zipPath, content);

  console.log(`📦 Created: ${zipPath}`);
  return zipPath;
}

function runCommand(cmd, options = {}) {
  console.log(`\n> ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', ...options });
  } catch (error) {
    if (!options.ignoreError) {
      throw error;
    }
  }
}

async function release() {
  const args = process.argv.slice(2);
  const skipBuild = args.includes('--skip-build');
  const dryRun = args.includes('--dry-run');

  const version = await getVersion();
  const tag = `v${version}`;

  console.log(`\n🚀 Creating release ${tag}\n`);

  if (!skipBuild) {
    console.log('📦 Building extension...');
    runCommand('npm run build');
  }

  console.log('\n📦 Creating ZIP archive...');
  const zipPath = await createZip(version);

  if (dryRun) {
    console.log('\n✅ Dry run complete! ZIP created at:', zipPath);
    console.log('   Skipping git tag and GitHub release.');
    return;
  }

  console.log(`\n🏷️  Creating git tag ${tag}...`);
  try {
    runCommand(`git tag ${tag}`);
    runCommand(`git push origin ${tag}`);
  } catch (error) {
    console.log(`   Tag ${tag} may already exist, continuing...`);
  }

  console.log('\n🎉 Creating GitHub release...');
  const releaseNotes = `## Image Favicon Preview v${version}

### Installation
1. Download \`favorite-v${version}.zip\`
2. Extract the ZIP file
3. Open Chrome and go to \`chrome://extensions\`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the extracted folder`;

  const cmd = `gh release create ${tag} "${zipPath}" --title "${tag}" --notes "${releaseNotes.replace(/"/g, '\\"')}"`;

  try {
    runCommand(cmd);
    console.log(`\n✅ Release ${tag} created successfully!`);
  } catch (error) {
    console.error('\n❌ Failed to create GitHub release.');
    console.error('   Make sure you have the GitHub CLI installed and authenticated.');
    console.error('   Run: gh auth login');
    process.exit(1);
  }
}

release().catch((err) => {
  console.error('Release failed:', err);
  process.exit(1);
});
