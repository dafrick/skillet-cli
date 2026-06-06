import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@skillet-cli/ui': path.resolve('./src/index.ts'),
    },
  },
  test: {
    pool: 'forks',
    include: ['test/unit/**/*.test.ts'],
  },
});
