const esbuild = require('esbuild');

async function watch() {
  const ctx = await esbuild.context({
    entryPoints: ['src/content.ts'],
    bundle: true,
    outfile: 'dist/content.js',
    format: 'iife',
    target: 'es2020',
    sourcemap: true,
    minify: false,
  });

  await ctx.watch();
  console.log('👀 Watching for changes...');
}

watch().catch((err) => {
  console.error('Watch failed:', err);
  process.exit(1);
});
