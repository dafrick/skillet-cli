import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    include: ['test/e2e/**/*.test.ts'],
    globalSetup: ['test/e2e/globalSetup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['test/**', 'fixtures/**', 'dist/**', '*.config.*'],
    },
  },
});
