import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm', 'iife'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  minify: false,
  globalName: 'PerkPushPlus',
  target: 'es2018',
  platform: 'neutral',
  outExtension({ format }) {
    if (format === 'cjs') return { js: '.cjs' };
    if (format === 'esm') return { js: '.js' };
    return { js: '.global.js' };
  },
});
