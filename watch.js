const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SRC_DIR = path.join(__dirname, 'src');

let buildProcess = null;
let buildPending = false;

function runBuild() {
  if (buildProcess) {
    buildPending = true;
    return;
  }

  console.log(`[${new Date().toLocaleTimeString()}] Building...`);

  buildProcess = spawn('node', ['build.js'], {
    cwd: __dirname,
    stdio: 'inherit',
  });

  buildProcess.on('close', (code) => {
    buildProcess = null;
    if (buildPending) {
      buildPending = false;
      runBuild();
    }
  });
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

const debouncedBuild = debounce(runBuild, 100);

console.log('👀 Watching for changes...\n');

// Watch src directory
fs.watch(SRC_DIR, { recursive: true }, (eventType, filename) => {
  if (filename) {
    console.log(`[${new Date().toLocaleTimeString()}] Changed: ${filename}`);
    debouncedBuild();
  }
});

// Watch manifest.json
fs.watch(path.join(__dirname, 'manifest.json'), () => {
  console.log(`[${new Date().toLocaleTimeString()}] Changed: manifest.json`);
  debouncedBuild();
});

// Watch icons directory
const iconsDir = path.join(__dirname, 'icons');
if (fs.existsSync(iconsDir)) {
  fs.watch(iconsDir, (eventType, filename) => {
    if (filename) {
      console.log(`[${new Date().toLocaleTimeString()}] Changed: icons/${filename}`);
      debouncedBuild();
    }
  });
}

console.log('🚀 Watch mode active. Press Ctrl+C to stop.\n');
