import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const common = {
  bundle: true,
  sourcemap: true,
  minify: false,
  logLevel: 'info',
};

const extensionCtx = await esbuild.context({
  ...common,
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.js',
  platform: 'node',
  external: ['vscode'],
  format: 'cjs',
});

const webviewCtx = await esbuild.context({
  ...common,
  entryPoints: ['src/webview/main.ts'],
  outfile: 'dist/webview/main.js',
  platform: 'browser',
  format: 'iife',
});

const screenshotCtx = await esbuild.context({
  ...common,
  entryPoints: ['src/screenshot/capture.ts'],
  outfile: 'dist/screenshot/capture.js',
  platform: 'browser',
  format: 'iife',
});

if (watch) {
  await Promise.all([extensionCtx.watch(), webviewCtx.watch(), screenshotCtx.watch()]);
  console.log('Watching for changes...');
} else {
  await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild(), screenshotCtx.rebuild()]);
  await Promise.all([extensionCtx.dispose(), webviewCtx.dispose(), screenshotCtx.dispose()]);
}
