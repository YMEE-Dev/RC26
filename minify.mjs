// Minification flow for the theme's hand-edited assets:
//   assets/theme.dev.js -> assets/theme.js
//   assets/theme.css    -> assets/theme.min.css
//
//   npm run minify   one-shot build (run after editing the source files)
//   npm run watch    rebuild the minified files on every save
//   npm run dev      watch + `shopify theme dev --store coin26` in one command;
//                    the CLI picks up the regenerated files and syncs the preview
import * as esbuild from 'esbuild';
import {spawn} from 'node:child_process';

const watch = process.argv.includes('--watch');
const withShopify = process.argv.includes('--shopify');

const targets = [
  {entryPoints: ['assets/theme.dev.js'], outfile: 'assets/theme.js'},
  {entryPoints: ['assets/theme.css'], outfile: 'assets/theme.min.css'},
];

const common = {minify: true, allowOverwrite: true, logLevel: 'info'};

if (watch) {
  for (const target of targets) {
    const ctx = await esbuild.context({...common, ...target});
    await ctx.watch();
  }
  console.log('[minify] watching assets/theme.dev.js and assets/theme.css — Ctrl-C to stop');

  if (withShopify) {
    const shopify = spawn('shopify', ['theme', 'dev', '--store', 'coin26'], {stdio: 'inherit'});
    shopify.on('close', (code) => process.exit(code ?? 0));
  }
} else {
  await Promise.all(targets.map((target) => esbuild.build({...common, ...target})));
}
