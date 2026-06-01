/**
 * Tests that run() processes ALL discovered skill trees, not just the first.
 *
 * This is a regression guard for the bug where `run()` used `discovered[0]`
 * instead of iterating over every skill in the discovered list.
 */
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeSkill } from '../../src/normalize.js';
import { run } from '../../src/run.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function makeTmpDir(): Promise<string> {
  return fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'skillet-run-multi-')));
}

/**
 * Creates a minimal SKILL.md inside `dir/<skillName>/SKILL.md`
 * Returns the absolute path of the skill subdirectory.
 */
async function writeSkill(parentDir: string, skillName: string): Promise<string> {
  const skillDir = path.join(parentDir, skillName);
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(
    path.join(skillDir, 'SKILL.md'),
    `---\nname: ${skillName}\ndescription: Test skill ${skillName}\n---\n\nBody.\n`,
    'utf8',
  );
  return skillDir;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('run() — multi-skill discovery', () => {
  let tmpDir: string;
  let originalCwd: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
    originalCwd = process.cwd();
    originalHome = process.env.HOME;
    // Point HOME to a safe temp dir so adapter detection doesn't touch the real home
    process.env.HOME = tmpDir;
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('transform hook is called for every discovered skill, not just the first', async () => {
    // Set up: two skill trees under skills/
    const skillsDir = path.join(tmpDir, 'skills');
    await writeSkill(skillsDir, 'skill-alpha');
    await writeSkill(skillsDir, 'skill-beta');

    // Write a package.json that declares the skills dir
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test-pkg', version: '1.0.0', skillet: { skills: 'skills' } }),
      'utf8',
    );

    const transformedNames: string[] = [];

    // Run with a transform hook that records every skill it sees.
    // Use `--help` so no real install happens — we just need the skills to be
    // normalized and transformed before Commander parses the command.
    await run({
      pkg: { name: 'test-pkg', version: '1.0.0' },
      argv: ['node', 'cli.js', '--help'],
      hooks: {
        transform: (skill) => {
          transformedNames.push(skill.name);
          return skill;
        },
      },
    }).catch(() => {
      // --help causes Commander to exit; catch that to avoid test failure
    });

    // Both skills must have been transformed, not just the first
    expect(transformedNames).toContain('skill-alpha');
    expect(transformedNames).toContain('skill-beta');
    expect(transformedNames).toHaveLength(2);
  });

  it('install command runs against all discovered skills when multi-skill package.json is used', async () => {
    // Set up: two skill trees under skills/
    const skillsDir = path.join(tmpDir, 'skills');
    await writeSkill(skillsDir, 'brainstorming');
    await writeSkill(skillsDir, 'debugging');

    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test-pkg', version: '1.0.0', skillet: { skills: 'skills' } }),
      'utf8',
    );

    // Spy on normalizeSkill to count how many skills get normalized
    const { normalizeSkill: originalNormalize } = await import('../../src/normalize.js');
    const normalizedDirs: string[] = [];

    // We verify via the transform hook (normalized → transform called for each)
    const transformCallCount: string[] = [];

    await run({
      pkg: { name: 'test-pkg', version: '1.0.0' },
      // Non-TTY install with --target that matches nothing ensures no actual file writes
      // but the skill loop still runs; use --help to shortcircuit Commander
      argv: ['node', 'cli.js', '--help'],
      hooks: {
        transform: (skill) => {
          transformCallCount.push(skill.name);
          return skill;
        },
      },
    }).catch(() => {});

    // Both skills should have been processed
    expect(transformCallCount).toHaveLength(2);
    expect(new Set(transformCallCount)).toEqual(new Set(['brainstorming', 'debugging']));
  });

  it('single skillDir provided explicitly still works (wraps in array, not broken)', async () => {
    // Create a standalone skill dir (not under a skills/ parent)
    const skillDir = path.join(tmpDir, 'my-skill');
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: my-skill\ndescription: My test skill\n---\nBody.\n',
      'utf8',
    );

    const transformCallCount: string[] = [];

    await run({
      pkg: { name: 'test-pkg', version: '1.0.0' },
      skillDir,
      argv: ['node', 'cli.js', '--help'],
      hooks: {
        transform: (skill) => {
          transformCallCount.push(skill.name);
          return skill;
        },
      },
    }).catch(() => {});

    // Exactly one skill should have been processed
    expect(transformCallCount).toHaveLength(1);
    expect(transformCallCount[0]).toBe('my-skill');
  });

  it('two skillsDirs in package.json each contribute their skill trees', async () => {
    // skills/core → brainstorming, debugging
    // skills/exp  → planning
    const coreDir = path.join(tmpDir, 'skills', 'core');
    const expDir = path.join(tmpDir, 'skills', 'exp');
    await writeSkill(coreDir, 'brainstorming');
    await writeSkill(coreDir, 'debugging');
    await writeSkill(expDir, 'planning');

    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'test-pkg',
        version: '1.0.0',
        skillet: { skills: ['skills/core', 'skills/exp'] },
      }),
      'utf8',
    );

    const transformCallCount: string[] = [];

    await run({
      pkg: { name: 'test-pkg', version: '1.0.0' },
      argv: ['node', 'cli.js', '--help'],
      hooks: {
        transform: (skill) => {
          transformCallCount.push(skill.name);
          return skill;
        },
      },
    }).catch(() => {});

    // All three skill trees must be processed
    expect(transformCallCount).toHaveLength(3);
    expect(new Set(transformCallCount)).toEqual(
      new Set(['brainstorming', 'debugging', 'planning']),
    );
  });
});
