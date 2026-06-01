import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    // Integration tests run `npm install` via installFixturePackages which can
    // take 30s+ on Windows CI — raise timeout well above the default 5000ms.
    testTimeout: 60000,
    include: ['test/unit/**/*.test.ts', 'test/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['test/**', 'fixtures/**', 'dist/**', '*.config.*'],
    },
  },
});
