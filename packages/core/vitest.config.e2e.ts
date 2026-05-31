import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.js';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['test/e2e/**/*.test.ts'],
      globalSetup: ['test/e2e/globalSetup.ts'],
    },
  }),
);
