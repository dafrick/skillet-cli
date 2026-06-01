import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { run } from '../../src/run.js';
import { createSandbox } from './helpers/sandbox.js';

const helloSkillDir = fileURLToPath(new URL('../../fixtures/hello-skill', import.meta.url));

describe('verbMode integration', () => {
  it('verbMode: standard emits lowercased standard verb in non-TTY install', async () => {
    const sandbox = await createSandbox();
    try {
      const logLines: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logLines.push(args.map(String).join(' '));
      };

      try {
        await run({
          skillDir: helloSkillDir,
          pkg: { name: 'test-skill', version: '1.0.0' },
          verbMode: 'standard',
          argv: ['node', 'test-skill', 'install', '--yes'],
        });
      } finally {
        console.log = originalLog;
      }

      const combined = logLines.join('\n');
      expect(combined).toContain('installing into');
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });
});
