import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    include: ['test/unit/**/*.test.ts', 'test/integration/**/*.test.ts'],
  },
});
