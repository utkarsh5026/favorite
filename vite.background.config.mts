import { defineConfig } from 'vite';
import path from 'path';

/**
 * Vite configuration for background service worker.
 * Builds as ESM module (required for Manifest v3 service workers).
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Don't clear dist (popup/content already built)
    sourcemap: true,
    target: 'es2020',
    lib: {
      entry: path.resolve(__dirname, 'src/background.ts'),
      formats: ['es'],
      fileName: () => 'background.js',
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
