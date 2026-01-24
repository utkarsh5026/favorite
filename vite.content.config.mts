import { defineConfig } from 'vite';
import path from 'path';

/**
 * Vite configuration for content script.
 * Builds as IIFE for browser extension injection.
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Don't clear dist
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      input: path.resolve(__dirname, 'src/content/index.ts'),
      output: {
        entryFileNames: 'content.js',
        format: 'iife',
      },
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
