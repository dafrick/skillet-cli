/**
 * Integration tests for findPackageRoot and resolveSkillPackageClosure.
 * Tasks 2.1, 2.8, 2.2–2.7, 2.9–2.11
 *
 * Uses installFixturePackages so that import.meta.resolve resolves packages
 * identically to production, including npm's hoisting and nesting behaviour.
 */
import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registry } from '../../src/adapters/index.js';
import { performInstall } from '../../src/install.js';
import { normalizeSkill } from '../../src/normalize.js';
import { findPackageRoot, resolveSkillPackageClosure } from '../../src/walk.js';
import { installFixturePackages } from './helpers/fixture-packages.js';
import type { Sandbox } from './helpers/sandbox.js';
import { createSandbox } from './helpers/sandbox.js';

/** Create a SKILL.md inside `dir/skillName/` so discoverSkillTrees picks it up */
async function createSkillTree(parentDir: string, skillName: string): Promise<string> {
  const skillDir = path.join(parentDir, skillName);
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(
    path.join(skillDir, 'SKILL.md'),
    `---\nname: ${skillName}\ndescription: A fixture skill\n---\n\n# ${skillName}\n`,
    'utf8',
  );
  return skillDir;
}

// ---------------------------------------------------------------------------
// findPackageRoot
// ---------------------------------------------------------------------------

describe('findPackageRoot', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await sandbox[Symbol.asyncDispose]();
  });

  it('2.1/2.8: resolves a hoisted package to its package root', async () => {
    await installFixturePackages(sandbox, [{ name: 'my-dep', version: '1.0.0' }]);

    const result = await findPackageRoot('my-dep', sandbox.cwd);

    expect(result).not.toBeNull();
    // The resolved root should contain a package.json with the right name
    const pkgJsonRaw = await fs.readFile(path.join(result!, 'package.json'), 'utf8');
    const pkgJson = JSON.parse(pkgJsonRaw);
    expect(pkgJson.name).toBe('my-dep');
  });

  it('2.1/2.8: returns null for an unresolvable package', async () => {
    await installFixturePackages(sandbox, [{ name: 'real-dep', version: '1.0.0' }]);

    const result = await findPackageRoot('non-existent-package-xyz', sandbox.cwd);

    expect(result).toBeNull();
  });

  it('resolves an ESM-only package (no main, only exports.import) without a warning', async () => {
    // Simulates @skillet-cli/core's package structure: ESM-only exports, no main field.
    // CJS require.resolve() fails for such packages; import.meta.resolve() handles them.
    const fixturesDir = path.join(sandbox.cwd, 'fixtures');
    const esmOnlyDir = path.join(fixturesDir, 'esm-only-pkg');
    await fs.mkdir(path.join(esmOnlyDir, 'dist'), { recursive: true });
    await fs.writeFile(path.join(esmOnlyDir, 'dist', 'index.js'), 'export {};\n', 'utf8');
    await fs.writeFile(
      path.join(esmOnlyDir, 'package.json'),
      JSON.stringify(
        {
          name: 'esm-only-pkg',
          version: '1.0.0',
          type: 'module',
          exports: { '.': { import: './dist/index.js' } },
        },
        null,
        2,
      ),
      'utf8',
    );
    await fs.writeFile(
      path.join(sandbox.cwd, 'package.json'),
      JSON.stringify(
        {
          name: 'test-root',
          version: '0.0.0',
          private: true,
          type: 'module',
          dependencies: { 'esm-only-pkg': 'file:./fixtures/esm-only-pkg' },
        },
        null,
        2,
      ),
      'utf8',
    );
    execSync('npm install --ignore-scripts', { cwd: sandbox.cwd, stdio: 'pipe' });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await findPackageRoot('esm-only-pkg', sandbox.cwd);
    warnSpy.mockRestore();

    expect(result).not.toBeNull();
    const pkgJson = JSON.parse(await fs.readFile(path.join(result!, 'package.json'), 'utf8'));
    expect(pkgJson.name).toBe('esm-only-pkg');
  });

  it('2.8: resolves a package when fromDir is set to a nested package directory', async () => {
    // Install pkg-a which depends on pkg-b.
    // Then call findPackageRoot('pkg-b', <pkg-a's installed dir>) to exercise
    // the fromDir parameter — resolution must work when initiated from WITHIN
    // a package's own installed location rather than from the project root.
    await installFixturePackages(sandbox, [
      { name: 'pkg-b', version: '1.0.0' },
      { name: 'pkg-a', version: '1.0.0', deps: ['pkg-b'] },
    ]);

    const pkgAInstalledDir = path.join(sandbox.cwd, 'node_modules', 'pkg-a');

    // Verify pkg-a is actually installed where we expect it
    const pkgAManifest = JSON.parse(
      await fs.readFile(path.join(pkgAInstalledDir, 'package.json'), 'utf8'),
    );
    expect(pkgAManifest.name).toBe('pkg-a');

    // Resolve pkg-b starting from within pkg-a's installed directory
    const result = await findPackageRoot('pkg-b', pkgAInstalledDir);

    expect(result).not.toBeNull();
    const pkgBManifest = JSON.parse(await fs.readFile(path.join(result!, 'package.json'), 'utf8'));
    expect(pkgBManifest.name).toBe('pkg-b');
  });
});

// ---------------------------------------------------------------------------
// resolveSkillPackageClosure
// ---------------------------------------------------------------------------

describe('resolveSkillPackageClosure', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await sandbox[Symbol.asyncDispose]();
  });

  it('2.9: no marked dependencies — only invoked package own skills returned', async () => {
    // pkg-a has no deps and its own skills dir
    await installFixturePackages(sandbox, [
      { name: 'pkg-a', version: '1.0.0', skillet: { skills: 'skills' } },
    ]);
    // Create a skill tree in the installed fixture's skills dir
    const fixtureSkillsDir = path.join(sandbox.cwd, 'node_modules', 'pkg-a', 'skills');
    await createSkillTree(fixtureSkillsDir, 'skill-alpha');

    const pkgARoot = await findPackageRoot('pkg-a', sandbox.cwd);
    expect(pkgARoot).not.toBeNull();

    const ownSkillDirs = [path.join(pkgARoot!, 'skills', 'skill-alpha')];
    const closure = await resolveSkillPackageClosure(pkgARoot!, ownSkillDirs);

    // Should contain exactly the own skill
    expect(closure).toHaveLength(1);
    expect(closure[0].packageName).toBe('pkg-a');
    expect(closure[0].depth).toBe(0);
  });

  it('2.9: one marked dependency — invoked package + dependency skills returned', async () => {
    await installFixturePackages(sandbox, [
      { name: 'base-dep', version: '1.0.0', skillet: { skills: 'skills' } },
      { name: 'pkg-b', version: '1.0.0', skillet: { skills: 'skills' }, deps: ['base-dep'] },
    ]);

    // Create skill trees in the installed packages
    const basePkgRoot = await findPackageRoot('base-dep', sandbox.cwd);
    const pkgBRoot = await findPackageRoot('pkg-b', sandbox.cwd);
    expect(basePkgRoot).not.toBeNull();
    expect(pkgBRoot).not.toBeNull();

    await createSkillTree(path.join(basePkgRoot!, 'skills'), 'base-skill');
    await createSkillTree(path.join(pkgBRoot!, 'skills'), 'b-skill');

    const ownSkillDirs = [path.join(pkgBRoot!, 'skills', 'b-skill')];
    const closure = await resolveSkillPackageClosure(pkgBRoot!, ownSkillDirs);

    // Should contain both pkg-b's and base-dep's skills
    const packageNames = closure.map((e) => e.packageName);
    expect(packageNames).toContain('pkg-b');
    expect(packageNames).toContain('base-dep');
    expect(closure).toHaveLength(2);
  });

  it('2.9: transitive deps (A→B→C) — all three layers skills returned', async () => {
    await installFixturePackages(sandbox, [
      { name: 'pkg-c', version: '1.0.0', skillet: { skills: 'skills' } },
      { name: 'pkg-b', version: '1.0.0', skillet: { skills: 'skills' }, deps: ['pkg-c'] },
      { name: 'pkg-a', version: '1.0.0', skillet: { skills: 'skills' }, deps: ['pkg-b'] },
    ]);

    const pkgARoot = await findPackageRoot('pkg-a', sandbox.cwd);
    const pkgBRoot = await findPackageRoot('pkg-b', sandbox.cwd);
    const pkgCRoot = await findPackageRoot('pkg-c', sandbox.cwd);
    expect(pkgARoot).not.toBeNull();
    expect(pkgBRoot).not.toBeNull();
    expect(pkgCRoot).not.toBeNull();

    await createSkillTree(path.join(pkgARoot!, 'skills'), 'skill-a');
    await createSkillTree(path.join(pkgBRoot!, 'skills'), 'skill-b');
    await createSkillTree(path.join(pkgCRoot!, 'skills'), 'skill-c');

    const ownSkillDirs = [path.join(pkgARoot!, 'skills', 'skill-a')];
    const closure = await resolveSkillPackageClosure(pkgARoot!, ownSkillDirs);

    const packageNames = closure.map((e) => e.packageName);
    expect(packageNames).toContain('pkg-a');
    expect(packageNames).toContain('pkg-b');
    expect(packageNames).toContain('pkg-c');
    expect(closure).toHaveLength(3);
  });

  it('2.9: diamond (A→B→D, A→C→D) — D skills installed ONCE (deduplication)', async () => {
    await installFixturePackages(sandbox, [
      { name: 'pkg-d', version: '1.0.0', skillet: { skills: 'skills' } },
      { name: 'pkg-b', version: '1.0.0', skillet: { skills: 'skills' }, deps: ['pkg-d'] },
      { name: 'pkg-c', version: '1.0.0', skillet: { skills: 'skills' }, deps: ['pkg-d'] },
      { name: 'pkg-a', version: '1.0.0', skillet: { skills: 'skills' }, deps: ['pkg-b', 'pkg-c'] },
    ]);

    const pkgARoot = await findPackageRoot('pkg-a', sandbox.cwd);
    const pkgBRoot = await findPackageRoot('pkg-b', sandbox.cwd);
    const pkgCRoot = await findPackageRoot('pkg-c', sandbox.cwd);
    const pkgDRoot = await findPackageRoot('pkg-d', sandbox.cwd);
    expect(pkgARoot).not.toBeNull();
    expect(pkgBRoot).not.toBeNull();
    expect(pkgCRoot).not.toBeNull();
    expect(pkgDRoot).not.toBeNull();

    await createSkillTree(path.join(pkgARoot!, 'skills'), 'skill-a');
    await createSkillTree(path.join(pkgBRoot!, 'skills'), 'skill-b');
    await createSkillTree(path.join(pkgCRoot!, 'skills'), 'skill-c');
    await createSkillTree(path.join(pkgDRoot!, 'skills'), 'skill-d');

    const ownSkillDirs = [path.join(pkgARoot!, 'skills', 'skill-a')];
    const closure = await resolveSkillPackageClosure(pkgARoot!, ownSkillDirs);

    // D's skills should appear exactly once
    const dEntries = closure.filter((e) => e.packageName === 'pkg-d');
    expect(dEntries).toHaveLength(1);

    // Total: A + B + C + D = 4 entries
    expect(closure).toHaveLength(4);
  });

  it('2.9: devDependency is skipped (not walked)', async () => {
    // Install base-pkg (marked) as a devDependency of invoked-pkg
    // We simulate this by NOT including base-pkg in pkg-a's deps array,
    // and instead manually writing it as devDependencies in the fixture
    await installFixturePackages(sandbox, [
      { name: 'base-pkg', version: '1.0.0', skillet: { skills: 'skills' } },
      { name: 'invoker-pkg', version: '1.0.0', skillet: { skills: 'skills' } },
    ]);

    // Manually patch invoker-pkg's package.json to have base-pkg as devDependency
    const invokerPkgRoot = await findPackageRoot('invoker-pkg', sandbox.cwd);
    const basePkgRoot = await findPackageRoot('base-pkg', sandbox.cwd);
    expect(invokerPkgRoot).not.toBeNull();
    expect(basePkgRoot).not.toBeNull();

    const pkgJsonPath = path.join(invokerPkgRoot!, 'package.json');
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
    // Add base-pkg as devDependency, remove from dependencies
    pkgJson.devDependencies = { 'base-pkg': '1.0.0' };
    delete pkgJson.dependencies;
    await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2), 'utf8');

    await createSkillTree(path.join(invokerPkgRoot!, 'skills'), 'invoker-skill');
    await createSkillTree(path.join(basePkgRoot!, 'skills'), 'base-skill');

    const ownSkillDirs = [path.join(invokerPkgRoot!, 'skills', 'invoker-skill')];
    const closure = await resolveSkillPackageClosure(invokerPkgRoot!, ownSkillDirs);

    // Only the invoker's own skill should be returned; base-pkg skills skipped
    const packageNames = closure.map((e) => e.packageName);
    expect(packageNames).not.toContain('base-pkg');
    expect(packageNames).toContain('invoker-pkg');
    expect(closure).toHaveLength(1);
  });

  it('ESM-only unmarked dependency does not trigger "Could not resolve" warning', async () => {
    // Reproduces the @skillet-cli/core spurious warning: a skill package lists core as
    // a dependency; core is ESM-only (no main field). CJS require.resolve() fails and
    // emits a spurious warning. With import.meta.resolve() no warning fires.
    const fixturesDir = path.join(sandbox.cwd, 'fixtures');
    const esmOnlyDir = path.join(fixturesDir, 'esm-only-dep');
    await fs.mkdir(path.join(esmOnlyDir, 'dist'), { recursive: true });
    await fs.writeFile(path.join(esmOnlyDir, 'dist', 'index.js'), 'export {};\n', 'utf8');
    await fs.writeFile(
      path.join(esmOnlyDir, 'package.json'),
      JSON.stringify(
        {
          name: 'esm-only-dep',
          version: '1.0.0',
          type: 'module',
          exports: { '.': { import: './dist/index.js' } },
        },
        null,
        2,
      ),
      'utf8',
    );

    await installFixturePackages(sandbox, [
      {
        name: 'skill-pkg',
        version: '1.0.0',
        skillet: { skills: 'skills' },
        deps: [],
      },
    ]);

    // Add esm-only-dep to fixture dir and patch skill-pkg's dependencies to include it
    const skillPkgRoot = await findPackageRoot('skill-pkg', sandbox.cwd);
    expect(skillPkgRoot).not.toBeNull();

    // Install esm-only-dep into sandbox node_modules
    const rootPkgPath = path.join(sandbox.cwd, 'package.json');
    const rootPkg = JSON.parse(await fs.readFile(rootPkgPath, 'utf8'));
    rootPkg.dependencies['esm-only-dep'] = 'file:./fixtures/esm-only-dep';
    await fs.writeFile(rootPkgPath, JSON.stringify(rootPkg, null, 2), 'utf8');
    execSync('npm install --ignore-scripts', { cwd: sandbox.cwd, stdio: 'pipe' });

    // Patch skill-pkg's package.json to list esm-only-dep as a dependency
    const skillPkgJsonPath = path.join(skillPkgRoot!, 'package.json');
    const skillPkgJson = JSON.parse(await fs.readFile(skillPkgJsonPath, 'utf8'));
    skillPkgJson.dependencies = { 'esm-only-dep': '1.0.0' };
    await fs.writeFile(skillPkgJsonPath, JSON.stringify(skillPkgJson, null, 2), 'utf8');

    await createSkillTree(path.join(skillPkgRoot!, 'skills'), 'my-skill');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ownSkillDirs = [path.join(skillPkgRoot!, 'skills', 'my-skill')];
    const closure = await resolveSkillPackageClosure(skillPkgRoot!, ownSkillDirs);
    const warnCalls = warnSpy.mock.calls.map((c) => String(c[0]));
    warnSpy.mockRestore();

    // No spurious warning about esm-only-dep (it exists, just has no skillet marker)
    expect(warnCalls.some((w) => w.includes('esm-only-dep'))).toBe(false);
    // Own skill still returned
    expect(closure).toHaveLength(1);
    expect(closure[0].packageName).toBe('skill-pkg');
  });

  it('2.9/2.7: unresolvable dependency → warning logged, walk continues', async () => {
    await installFixturePackages(sandbox, [
      { name: 'good-dep', version: '1.0.0', skillet: { skills: 'skills' } },
      { name: 'invoker-pkg', version: '1.0.0', skillet: { skills: 'skills' } },
    ]);

    const invokerPkgRoot = await findPackageRoot('invoker-pkg', sandbox.cwd);
    const goodDepRoot = await findPackageRoot('good-dep', sandbox.cwd);
    expect(invokerPkgRoot).not.toBeNull();
    expect(goodDepRoot).not.toBeNull();

    // Patch invoker-pkg's package.json to declare both a real dep and a non-existent one
    const pkgJsonPath = path.join(invokerPkgRoot!, 'package.json');
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
    pkgJson.dependencies = {
      'good-dep': '1.0.0',
      'non-existent-dep': '1.0.0',
    };
    await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2), 'utf8');

    await createSkillTree(path.join(invokerPkgRoot!, 'skills'), 'invoker-skill');
    await createSkillTree(path.join(goodDepRoot!, 'skills'), 'good-skill');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const ownSkillDirs = [path.join(invokerPkgRoot!, 'skills', 'invoker-skill')];
    const closure = await resolveSkillPackageClosure(invokerPkgRoot!, ownSkillDirs);

    // Warning should have been emitted for the unresolvable dep
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('non-existent-dep'));

    // Walk should have continued: good-dep's skills are included
    const packageNames = closure.map((e) => e.packageName);
    expect(packageNames).toContain('good-dep');
    expect(packageNames).toContain('invoker-pkg');

    const goodDepEntry = closure.find((e) => e.packageName === 'good-dep');
    expect(goodDepEntry).toBeDefined();
    expect(goodDepEntry!.skillDir).toBeTruthy();
    // Verify the skill directory actually exists
    const { access } = await import('node:fs/promises');
    await expect(access(goodDepEntry!.skillDir)).resolves.toBeUndefined();

    warnSpy.mockRestore();
  });

  it('2.9/2.6: topological order — dependency skills come before dependent skills', async () => {
    await installFixturePackages(sandbox, [
      { name: 'base-dep', version: '1.0.0', skillet: { skills: 'skills' } },
      { name: 'invoker-pkg', version: '1.0.0', skillet: { skills: 'skills' }, deps: ['base-dep'] },
    ]);

    const basePkgRoot = await findPackageRoot('base-dep', sandbox.cwd);
    const invokerPkgRoot = await findPackageRoot('invoker-pkg', sandbox.cwd);
    expect(basePkgRoot).not.toBeNull();
    expect(invokerPkgRoot).not.toBeNull();

    await createSkillTree(path.join(basePkgRoot!, 'skills'), 'base-skill');
    await createSkillTree(path.join(invokerPkgRoot!, 'skills'), 'invoker-skill');

    const ownSkillDirs = [path.join(invokerPkgRoot!, 'skills', 'invoker-skill')];
    const closure = await resolveSkillPackageClosure(invokerPkgRoot!, ownSkillDirs);

    // Dependencies should appear BEFORE dependent
    const names = closure.map((e) => e.packageName);
    const baseIndex = names.indexOf('base-dep');
    const invokerIndex = names.indexOf('invoker-pkg');
    expect(baseIndex).toBeLessThan(invokerIndex);
  });

  it('2.10: closure does not include unmarked dependencies', async () => {
    await installFixturePackages(sandbox, [
      // unmarked-dep has no skillet key
      { name: 'unmarked-dep', version: '1.0.0' },
      { name: 'marked-dep', version: '1.0.0', skillet: { skills: 'skills' } },
      {
        name: 'invoker-pkg',
        version: '1.0.0',
        skillet: { skills: 'skills' },
        deps: ['unmarked-dep', 'marked-dep'],
      },
    ]);

    const invokerPkgRoot = await findPackageRoot('invoker-pkg', sandbox.cwd);
    const markedDepRoot = await findPackageRoot('marked-dep', sandbox.cwd);
    expect(invokerPkgRoot).not.toBeNull();
    expect(markedDepRoot).not.toBeNull();

    await createSkillTree(path.join(invokerPkgRoot!, 'skills'), 'invoker-skill');
    await createSkillTree(path.join(markedDepRoot!, 'skills'), 'marked-skill');

    const ownSkillDirs = [path.join(invokerPkgRoot!, 'skills', 'invoker-skill')];
    const closure = await resolveSkillPackageClosure(invokerPkgRoot!, ownSkillDirs);

    const packageNames = closure.map((e) => e.packageName);
    expect(packageNames).not.toContain('unmarked-dep');
    expect(packageNames).toContain('marked-dep');
    expect(packageNames).toContain('invoker-pkg');
    expect(closure).toHaveLength(2);
  });

  it('2.11: SkillEntry has correct depth values', async () => {
    await installFixturePackages(sandbox, [
      { name: 'depth-c', version: '1.0.0', skillet: { skills: 'skills' } },
      { name: 'depth-b', version: '1.0.0', skillet: { skills: 'skills' }, deps: ['depth-c'] },
      { name: 'depth-a', version: '1.0.0', skillet: { skills: 'skills' }, deps: ['depth-b'] },
    ]);

    const pkgARoot = await findPackageRoot('depth-a', sandbox.cwd);
    const pkgBRoot = await findPackageRoot('depth-b', sandbox.cwd);
    const pkgCRoot = await findPackageRoot('depth-c', sandbox.cwd);
    expect(pkgARoot).not.toBeNull();
    expect(pkgBRoot).not.toBeNull();
    expect(pkgCRoot).not.toBeNull();

    await createSkillTree(path.join(pkgARoot!, 'skills'), 'skill-a');
    await createSkillTree(path.join(pkgBRoot!, 'skills'), 'skill-b');
    await createSkillTree(path.join(pkgCRoot!, 'skills'), 'skill-c');

    const ownSkillDirs = [path.join(pkgARoot!, 'skills', 'skill-a')];
    const closure = await resolveSkillPackageClosure(pkgARoot!, ownSkillDirs);

    const byPkg = Object.fromEntries(closure.map((e) => [e.packageName, e]));
    expect(byPkg['depth-a'].depth).toBe(0);
    expect(byPkg['depth-b'].depth).toBe(1);
    expect(byPkg['depth-c'].depth).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// End-to-end: performInstall over a full composed closure (task 2.10)
// ---------------------------------------------------------------------------

describe('composed install: performInstall over full closure', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await sandbox[Symbol.asyncDispose]();
  });

  it('2.10: both invoked package and dependency skills appear in the target directory', async () => {
    // Set up two marked packages: superpowers-base (dep) and travel-planner (invoked).
    // Each has its own skills/ dir with a single skill.
    await installFixturePackages(sandbox, [
      {
        name: 'superpowers-base',
        version: '1.0.0',
        skillet: { skills: 'skills' },
      },
      {
        name: 'travel-planner',
        version: '1.0.0',
        skillet: { skills: 'skills' },
        deps: ['superpowers-base'],
      },
    ]);

    // Create skill trees inside the installed packages
    const baseRoot = await findPackageRoot('superpowers-base', sandbox.cwd);
    const plannerRoot = await findPackageRoot('travel-planner', sandbox.cwd);
    expect(baseRoot).not.toBeNull();
    expect(plannerRoot).not.toBeNull();

    await createSkillTree(path.join(baseRoot!, 'skills'), 'base-skill');
    await createSkillTree(path.join(plannerRoot!, 'skills'), 'planner-skill');

    // Resolve the full closure starting from travel-planner
    const ownSkillDirs = [path.join(plannerRoot!, 'skills', 'planner-skill')];
    const closure = await resolveSkillPackageClosure(plannerRoot!, ownSkillDirs);

    // There should be two entries: superpowers-base and travel-planner
    expect(closure).toHaveLength(2);

    // Run performInstall for every entry in the closure
    const adapter = registry.get('claude')!;
    const scope = 'user' as const;

    for (const entry of closure) {
      const skill = await normalizeSkill(entry.skillDir);
      await performInstall(skill, adapter, scope, {
        pkg: { name: entry.packageName, version: '1.0.0' },
        requestorRoot: 'travel-planner',
      });
    }

    // Assert both skills are present under ~/.claude/skills/
    const baseSkillMd = path.join(sandbox.home, '.claude', 'skills', 'base-skill', 'SKILL.md');
    const plannerSkillMd = path.join(
      sandbox.home,
      '.claude',
      'skills',
      'planner-skill',
      'SKILL.md',
    );

    const baseStat = await fs.stat(baseSkillMd);
    expect(baseStat.isFile()).toBe(true);

    const plannerStat = await fs.stat(plannerSkillMd);
    expect(plannerStat.isFile()).toBe(true);
  });
});
