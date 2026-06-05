import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    include: ['test/e2e/**/*.test.ts'],
    testTimeout: 60_000,
  },
});
