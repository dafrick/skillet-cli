/**
 * Tests that run() processes ALL discovered skill trees, not just the first.
 *
 * This is a regression guard for the bug where `run()` used `discovered[0]`
 * instead of iterating over every skill in the discovered list.
 */
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { checkbox, select } from '@inquirer/prompts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../../src/run.js';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

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

  it('registers all discovered skill trees with commander (verified via --help shortcircuit)', async () => {
    // Set up: two skill trees under skills/
    const skillsDir = path.join(tmpDir, 'skills');
    await writeSkill(skillsDir, 'brainstorming');
    await writeSkill(skillsDir, 'debugging');

    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test-pkg', version: '1.0.0', skillet: { skills: 'skills' } }),
      'utf8',
    );

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

  it('skillet.skillDir pointing at a standalone directory (not under skills/) resolves one skill', async () => {
    // Create a standalone skill dir (not under a skills/ parent)
    const skillDir = path.join(tmpDir, 'my-skill');
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: my-skill\ndescription: My test skill\n---\nBody.\n',
      'utf8',
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test-pkg', version: '1.0.0', skillet: { skillDir } }),
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

  it('skillet.skillDir in package.json is used directly — no subdirectory discovery', async () => {
    // The skill is at tmpDir/skill/SKILL.md — the skill dir IS skill/, not a parent
    const skillDir = path.join(tmpDir, 'skill');
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: direct-skill\ndescription: A directly-pathed skill\n---\nBody.\n',
      'utf8',
    );

    // package.json uses skillet.skillDir (not skillet.skills)
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test-pkg', version: '1.0.0', skillet: { skillDir: 'skill/' } }),
      'utf8',
    );

    const transformedNames: string[] = [];

    await run({
      pkg: { name: 'test-pkg', version: '1.0.0' },
      argv: ['node', 'cli.js', '--help'],
      hooks: {
        transform: (skill) => {
          transformedNames.push(skill.name);
          return skill;
        },
      },
    }).catch(() => {});

    // Exactly one skill — the direct skill — must be discovered
    expect(transformedNames).toHaveLength(1);
    expect(transformedNames[0]).toBe('direct-skill');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Batch prompt behaviour (TTY) — prompts must fire exactly once per install
// command, regardless of how many skills are in the package.
// ─────────────────────────────────────────────────────────────────────────────

describe('run() — batch prompt behaviour (TTY)', () => {
  let tmpDir: string;
  let originalCwd: string;
  let originalHome: string | undefined;
  let isTTYDesc: PropertyDescriptor | undefined;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
    originalCwd = process.cwd();
    originalHome = process.env.HOME;
    process.env.HOME = tmpDir;
    process.chdir(tmpDir);

    // Force TTY so install prompts are shown
    isTTYDesc = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
    Object.defineProperty(process.stdout, 'isTTY', {
      value: true,
      writable: true,
      configurable: true,
    });

    // Reset mock call counts from previous tests in this suite
    vi.clearAllMocks();

    // Suppress output
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Restore isTTY
    Object.defineProperty(
      process.stdout,
      'isTTY',
      isTTYDesc ?? { value: undefined, writable: true, configurable: true },
    );

    process.chdir(originalCwd);
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('prompts are each invoked exactly once for a 2-skill package in TTY mode', async () => {
    // Set up 2 skill directories
    const skillsDir = path.join(tmpDir, 'skills');
    await writeSkill(skillsDir, 'skill-alpha');
    await writeSkill(skillsDir, 'skill-beta');

    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test-pkg', version: '1.0.0', skillet: { skills: 'skills' } }),
      'utf8',
    );

    // Mock select to return 'user' (scope choice)
    vi.mocked(select).mockResolvedValue('user');
    // Mock checkbox to return [] (no targets — avoids actual installs)
    vi.mocked(checkbox).mockResolvedValue([]);

    await run({
      pkg: { name: 'test-pkg', version: '1.0.0' },
      argv: ['node', 'cli.js', 'install'],
    });

    // After refactor: each prompt fires exactly once regardless of skill count
    expect(vi.mocked(select)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(checkbox)).toHaveBeenCalledTimes(1);
  });

  it('single-skill package: prompts still fire exactly once (no regression)', async () => {
    // Set up 1 skill directory
    const skillsDir = path.join(tmpDir, 'skills');
    await writeSkill(skillsDir, 'skill-only');

    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test-pkg', version: '1.0.0', skillet: { skills: 'skills' } }),
      'utf8',
    );

    vi.mocked(select).mockResolvedValue('user');
    vi.mocked(checkbox).mockResolvedValue([]);

    await run({
      pkg: { name: 'test-pkg', version: '1.0.0' },
      argv: ['node', 'cli.js', 'install'],
    });

    expect(vi.mocked(select)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(checkbox)).toHaveBeenCalledTimes(1);
  });
});
