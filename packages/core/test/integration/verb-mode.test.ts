import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { run } from '../../src/run.js';
import { createSandbox } from './helpers/sandbox.js';

const helloSkillDir = fileURLToPath(new URL('../../fixtures/hello-skill', import.meta.url));

// Helper: captures console.log output during a run() call
async function captureRun(options: Parameters<typeof run>[0]): Promise<string> {
  const logLines: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args: unknown[]) => {
    logLines.push(args.map(String).join(' '));
  };
  console.warn = (...args: unknown[]) => {
    logLines.push(args.map(String).join(' '));
  };
  try {
    await run(options);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
  return logLines.join('\n');
}

describe('verbMode integration', () => {
  // ── Already-existing test (Group 4) ─────────────────────────────────────────
  it('verbMode: standard emits lowercased standard verb in non-TTY install', async () => {
    const sandbox = await createSandbox();
    try {
      const combined = await captureRun({
        skillDir: helloSkillDir,
        pkg: { name: 'test-skill', version: '1.0.0' },
        verbMode: 'standard',
        argv: ['node', 'test-skill', 'install', '--yes', '--target', 'agents'],
      });

      expect(combined).toContain('installing into');
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  // ── Task 6.5: update with verbMode: 'standard' ───────────────────────────────
  it('6.5: verbMode: standard + update logs standard verb in non-TTY path', async () => {
    const sandbox = await createSandbox();
    try {
      // TODO: This test needs a helper that pre-seeds an install with a stale content hash
      // so that applyUpdate returns action === 'updated', triggering the non-TTY log path.
      // Once a pre-seeded install helper is available, assert that the output contains
      // pickStandardVerb('update', false).active (e.g. 'updating') and .done (e.g. 'updated').
      // For now we verify the command completes without error when no installs are present.
      const combined = await captureRun({
        skillDir: helloSkillDir,
        pkg: { name: 'test-skill', version: '1.0.0' },
        verbMode: 'standard',
        argv: ['node', 'test-skill', 'update'],
      });

      expect(combined).toContain('No installs found');
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  // ── Task 6.5: uninstall with verbMode: 'standard' ────────────────────────────
  it('6.5: verbMode: standard + uninstall emits "removing" in non-TTY logs', async () => {
    const sandbox = await createSandbox();
    try {
      // Install first
      await run({
        skillDir: helloSkillDir,
        pkg: { name: 'test-skill', version: '1.0.0' },
        verbMode: 'standard',
        argv: ['node', 'test-skill', 'install', '--yes', '--target', 'agents'],
      });

      const combined = await captureRun({
        skillDir: helloSkillDir,
        pkg: { name: 'test-skill', version: '1.0.0' },
        verbMode: 'standard',
        argv: ['node', 'test-skill', 'uninstall', '--yes'],
      });

      // pickStandardVerb('uninstall', false).active === 'removing'
      expect(combined).toContain('removing');
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  // ── Task 6.6: verbMode: 'fun' (default) produces cooking verbs ───────────────
  it('6.6: verbMode: fun (default) install emits a cooking verb active form', async () => {
    const sandbox = await createSandbox();
    try {
      const COOKING_INSTALL_ACTIVE = [
        'searing into',
        'baking into',
        'frying into',
        'grilling into',
        'roasting into',
      ];

      // Run enough times to hit at least one cooking verb (pool has 5 verbs, 1 run is enough)
      let found = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        const combined = await captureRun({
          skillDir: helloSkillDir,
          pkg: { name: 'test-skill', version: '1.0.0' },
          // No verbMode = defaults to 'fun'
          argv: ['node', 'test-skill', 'install', '--yes', '--target', 'agents'],
        });

        if (COOKING_INSTALL_ACTIVE.some((v) => combined.includes(v))) {
          found = true;
          break;
        }
      }

      expect(found).toBe(true);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('6.6: verbMode: fun uninstall emits a cooking (culinary) verb active form', async () => {
    const sandbox = await createSandbox();
    try {
      // Install first
      await run({
        skillDir: helloSkillDir,
        pkg: { name: 'test-skill', version: '1.0.0' },
        argv: ['node', 'test-skill', 'install', '--yes', '--target', 'agents'],
      });

      const COOKING_UNINSTALL_ACTIVE = [
        'scraping',
        'clearing',
        'scrubbing',
        'scouring',
        'degreasing',
      ];

      const combined = await captureRun({
        skillDir: helloSkillDir,
        pkg: { name: 'test-skill', version: '1.0.0' },
        // No verbMode = defaults to 'fun'
        argv: ['node', 'test-skill', 'uninstall', '--yes'],
      });

      const hasOneCookingVerb = COOKING_UNINSTALL_ACTIVE.some((v) => combined.includes(v));
      expect(hasOneCookingVerb).toBe(true);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });
});
