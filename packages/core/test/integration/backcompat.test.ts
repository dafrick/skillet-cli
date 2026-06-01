/**
 * Back-compatibility regression tests for @skillet-cli/core v0.2.0.
 * Tasks 5.1–5.3 + requestorRoot wiring for direct installs.
 *
 * TDD: tests were written first, then verified green without any code changes
 * because back-compatibility was already preserved in v0.2.0.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registry } from '../../src/adapters/index.js';
import { performInstall } from '../../src/install.js';
import { normalizeSkill } from '../../src/normalize.js';
import { run } from '../../src/run.js';
import type { SkillManifest } from '../../src/types.js';
import { resolveSkillPackageClosure } from '../../src/walk.js';
import { installFixturePackages } from './helpers/fixture-packages.js';
import type { Sandbox } from './helpers/sandbox.js';
import { createSandbox } from './helpers/sandbox.js';

const helloSkillDir = fileURLToPath(new URL('../../fixtures/hello-skill', import.meta.url));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a SKILL.md inside `parentDir/skillName/` so discoverSkillTrees picks it up */
async function createSkillTree(parentDir: string, skillName: string): Promise<string> {
  const skillDir = path.join(parentDir, skillName);
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(
    path.join(skillDir, 'SKILL.md'),
    `---\nname: ${skillName}\ndescription: A fixture skill for back-compat tests\n---\n\n# ${skillName}\n`,
    'utf8',
  );
  return skillDir;
}

/** Read the manifest from an installed skill directory */
async function readManifest(installPath: string): Promise<SkillManifest> {
  const raw = await fs.readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
  return JSON.parse(raw) as SkillManifest;
}

// ---------------------------------------------------------------------------
// Task 5.1 — run({ skillDir }) still works (regression test)
// ---------------------------------------------------------------------------

describe('5.1: run({ skillDir }) back-compatibility', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await sandbox[Symbol.asyncDispose]();
  });

  it('calling run() with an explicit skillDir installs the skill end-to-end', async () => {
    // Write a package.json in the sandbox cwd so readPackageName() works
    await fs.writeFile(
      path.join(sandbox.cwd, 'package.json'),
      JSON.stringify({ name: 'my-skill-package', version: '1.0.0', type: 'module' }, null, 2),
      'utf8',
    );

    const pkg = { name: 'my-skill-package', version: '1.0.0' };

    // Invoke run() with skillDir pointing at the hello-skill fixture.
    // Use --yes and --target to pick a specific adapter without interaction.
    await run({
      skillDir: helloSkillDir,
      pkg,
      argv: ['node', 'cli.js', 'install', '--yes', '--target', 'claude', '--scope', 'user'],
    });

    // Assert the skill was installed under ~/.claude/skills/hello-skill/
    const skillMdPath = path.join(sandbox.home, '.claude', 'skills', 'hello-skill', 'SKILL.md');
    const stat = await fs.stat(skillMdPath);
    expect(stat.isFile()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 5.1 extra — requestorRoot is wired for direct installs
// ---------------------------------------------------------------------------

describe('5.1/requestorRoot: direct run() install records requestedBy with package name', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await sandbox[Symbol.asyncDispose]();
  });

  it('manifest requestedBy contains the package name after a direct run() install', async () => {
    const pkgName = 'direct-install-pkg';
    await fs.writeFile(
      path.join(sandbox.cwd, 'package.json'),
      JSON.stringify({ name: pkgName, version: '1.0.0', type: 'module' }, null, 2),
      'utf8',
    );

    const pkg = { name: pkgName, version: '1.0.0' };

    await run({
      skillDir: helloSkillDir,
      pkg,
      argv: ['node', 'cli.js', 'install', '--yes', '--target', 'claude', '--scope', 'user'],
    });

    const installPath = path.join(sandbox.home, '.claude', 'skills', 'hello-skill');
    const manifest = await readManifest(installPath);

    // requestorRoot comes from the pkg argument passed to run(), which is pkgName
    expect(Array.isArray(manifest.requestedBy)).toBe(true);
    expect(manifest.requestedBy).toContain(pkgName);
  });
});

// ---------------------------------------------------------------------------
// Task 5.2 — Single-skill package with no marked deps = v0.1.0 behavior
// ---------------------------------------------------------------------------

describe('5.2: single-skill package with no marked dependencies', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await sandbox[Symbol.asyncDispose]();
  });

  it('installs exactly one skill and requestedBy contains the package name', async () => {
    // A package with a skillet marker but no marked dependencies
    await installFixturePackages(sandbox, [
      {
        name: 'solo-pkg',
        version: '1.0.0',
        skillet: { skills: 'skills' },
      },
    ]);

    const { findPackageRoot } = await import('../../src/walk.js');
    const pkgRoot = await findPackageRoot('solo-pkg', sandbox.cwd);
    expect(pkgRoot).not.toBeNull();

    // Create exactly one skill tree inside the package
    const skillsDir = path.join(pkgRoot!, 'skills');
    await createSkillTree(skillsDir, 'solo-skill');

    const ownSkillDirs = [path.join(skillsDir, 'solo-skill')];
    // Calls the walk + install directly to test the library functions;
    // Task 5.1 covers the full run() path end-to-end.
    const closure = await resolveSkillPackageClosure(pkgRoot!, ownSkillDirs);

    // Walk produces exactly one entry (own skill, no transitive dependencies)
    expect(closure).toHaveLength(1);
    expect(closure[0].packageName).toBe('solo-pkg');

    // Install via performInstall with the package as its own requestorRoot
    const adapter = registry.get('claude')!;
    const scope = 'user' as const;
    const skill = await normalizeSkill(closure[0].skillDir);

    const installPath = await performInstall(skill, adapter, scope, {
      pkg: { name: 'solo-pkg', version: '1.0.0' },
      requestorRoot: 'solo-pkg',
    });

    // Exactly one skill in the target directory
    const skillsInstallDir = path.join(sandbox.home, '.claude', 'skills');
    const entries = await fs.readdir(skillsInstallDir);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toBe('solo-skill');

    // requestedBy contains the package name
    const manifest = await readManifest(installPath);
    expect(manifest.requestedBy).toContain('solo-pkg');
  });
});

// ---------------------------------------------------------------------------
// Task 5.3 — Dependency with no marker is silently skipped; walk continues
// ---------------------------------------------------------------------------

describe('5.3: unmarked dependency is skipped silently, walk continues', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await sandbox[Symbol.asyncDispose]();
  });

  it('package A with marker + package B without marker: B is skipped, A skills installed', async () => {
    // Package B has no skillet marker — it is a normal library dependency.
    // Package A has a skillet marker and depends on B.
    await installFixturePackages(sandbox, [
      {
        name: 'plain-lib',
        version: '1.0.0',
        // No skillet marker — intentionally omitted
      },
      {
        name: 'skill-pkg-a',
        version: '1.0.0',
        skillet: { skills: 'skills' },
        deps: ['plain-lib'],
      },
    ]);

    const { findPackageRoot } = await import('../../src/walk.js');
    const pkgARoot = await findPackageRoot('skill-pkg-a', sandbox.cwd);
    expect(pkgARoot).not.toBeNull();

    // Create a skill tree for package A
    const skillsDir = path.join(pkgARoot!, 'skills');
    await createSkillTree(skillsDir, 'skill-a');

    const ownSkillDirs = [path.join(skillsDir, 'skill-a')];

    // Spy on console.warn — no error or warning should be emitted for the unmarked dep
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const closure = await resolveSkillPackageClosure(pkgARoot!, ownSkillDirs);

    // console.warn must NOT have been called for plain-lib (it's silently skipped)
    const plainLibWarnings = warnSpy.mock.calls.filter((args) =>
      args.some((a) => typeof a === 'string' && a.includes('plain-lib')),
    );
    expect(plainLibWarnings).toHaveLength(0);

    warnSpy.mockRestore();

    // Only package A's skill should be in the closure — plain-lib is excluded
    expect(closure).toHaveLength(1);
    const packageNames = closure.map((e) => e.packageName);
    expect(packageNames).toContain('skill-pkg-a');
    expect(packageNames).not.toContain('plain-lib');

    // Install the closure and verify A's skill is present
    const adapter = registry.get('claude')!;
    const scope = 'user' as const;

    for (const entry of closure) {
      const skill = await normalizeSkill(entry.skillDir);
      await performInstall(skill, adapter, scope, {
        pkg: { name: entry.packageName, version: '1.0.0' },
        requestorRoot: 'skill-pkg-a',
      });
    }

    const skillAMd = path.join(sandbox.home, '.claude', 'skills', 'skill-a', 'SKILL.md');
    const stat = await fs.stat(skillAMd);
    expect(stat.isFile()).toBe(true);
  });
});
