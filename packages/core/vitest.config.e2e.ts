import { mergeConfig } from 'vitest/config';
import base from './vitest.config.js';

export default mergeConfig(base, {
  test: {
    include: ['test/e2e/**/*.test.ts'],
    globalSetup: ['test/e2e/globalSetup.ts'],
  },
});
