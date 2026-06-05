import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/run.ts'],
  format: ['esm'],
  dts: true,
  outDir: 'dist',
  noExternal: ['@skillet-cli/ui'],
});
