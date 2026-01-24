import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import type { Plugin } from 'vite';

/**
 * Executes a git command and returns the trimmed output.
 * Returns null if the command fails (e.g., not a git repository).
 */
function execGitCommand(command: string): string | null {
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
 * Custom Vite plugin for build info generation.
 * Generates build-info.json with git metadata and build timestamp.
 */
function buildInfoPlugin(): Plugin {
  return {
    name: 'build-info',
    apply: 'build',
    closeBundle() {
      const buildInfo = getBuildInfo();
      if (buildInfo.git.commitHash) {
        console.log(
          `   Git: ${buildInfo.git.commitHashShort}${buildInfo.git.isDirty ? ' (dirty)' : ''}`
        );
        console.log(`   Branch: ${buildInfo.git.branch}`);
      }
      const distPath = path.join(__dirname, 'dist', 'build-info.json');
      fs.writeFileSync(distPath, JSON.stringify(buildInfo, null, 2));
      console.log('   ✓ build-info.json written');
    },
  };
}

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'src/popup.html', dest: '.' },
        { src: 'icons/*.png', dest: 'icons' },
        { src: 'fonts/*.ttf', dest: 'fonts' },
      ],
    }),
    buildInfoPlugin(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2020',
    cssCodeSplit: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/popup/index.tsx'),
      output: {
        entryFileNames: 'popup.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'popup.css';
          return '[name].[ext]';
        },
        format: 'iife',
      },
    },
  },
});
