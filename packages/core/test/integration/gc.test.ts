/**
 * Integration tests for GC uninstall (gcUninstall + scanInstalledSkills).
 * Tasks 4.6, 4.7, 4.8
 *
 * Uses installFixturePackages to build real npm dependency graphs, then
 * exercises performInstall and gcUninstall end-to-end in a temp sandbox.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registry } from '../../src/adapters/index.js';
import { gcUninstall } from '../../src/gc.js';
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

/**
 * Install all skills from a package's closure.
 * Returns the skills dir used for the given adapter/scope.
 */
async function installClosure(
  requestorRoot: string,
  plannerRoot: string,
  plannerOwnSkillDirs: string[],
  adapter: ReturnType<typeof registry.get>,
  scope: 'user' | 'project',
): Promise<void> {
  const closure = await resolveSkillPackageClosure(plannerRoot, plannerOwnSkillDirs);
  for (const entry of closure) {
    const skill = await normalizeSkill(entry.skillDir);
    await performInstall(skill, adapter!, scope, {
      pkg: { name: entry.packageName, version: '1.0.0' },
      requestorRoot,
    });
  }
}

// ---------------------------------------------------------------------------
// Task 4.6 — Two-roots scenario
// ---------------------------------------------------------------------------

describe('gcUninstall — two-roots scenario (Task 4.6)', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await sandbox[Symbol.asyncDispose]();
  });

  it('4.6: superpowers-base skills remain after travel-planner uninstall, removed after recipe-planner uninstall', async () => {
    // Shared dependency: superpowers-base
    // Both travel-planner and recipe-planner depend on superpowers-base
    await installFixturePackages(sandbox, [
      { name: 'superpowers-base', version: '1.0.0', skillet: { skills: 'skills' } },
      {
        name: 'travel-planner',
        version: '1.0.0',
        skillet: { skills: 'skills' },
        deps: ['superpowers-base'],
      },
      {
        name: 'recipe-planner',
        version: '1.0.0',
        skillet: { skills: 'skills' },
        deps: ['superpowers-base'],
      },
    ]);

    const baseRoot = await findPackageRoot('superpowers-base', sandbox.cwd);
    const travelRoot = await findPackageRoot('travel-planner', sandbox.cwd);
    const recipeRoot = await findPackageRoot('recipe-planner', sandbox.cwd);
    expect(baseRoot).not.toBeNull();
    expect(travelRoot).not.toBeNull();
    expect(recipeRoot).not.toBeNull();

    // Create skill trees
    await createSkillTree(path.join(baseRoot!, 'skills'), 'base-skill');
    await createSkillTree(path.join(travelRoot!, 'skills'), 'travel-skill');
    await createSkillTree(path.join(recipeRoot!, 'skills'), 'recipe-skill');

    const adapter = registry.get('claude')!;
    const scope = 'user' as const;
    const skillsDir = path.join(sandbox.home, '.claude', 'skills');

    // Install travel-planner's closure (includes superpowers-base)
    await installClosure(
      'travel-planner',
      travelRoot!,
      [path.join(travelRoot!, 'skills', 'travel-skill')],
      adapter,
      scope,
    );

    // Install recipe-planner's closure (includes superpowers-base — union requestedBy)
    await installClosure(
      'recipe-planner',
      recipeRoot!,
      [path.join(recipeRoot!, 'skills', 'recipe-skill')],
      adapter,
      scope,
    );

    // Verify base-skill's requestedBy contains both
    const baseManifestPath = path.join(skillsDir, 'base-skill', '.skill-manifest.json');
    const baseManifest = JSON.parse(await fs.readFile(baseManifestPath, 'utf8'));
    expect(baseManifest.requestedBy).toContain('travel-planner');
    expect(baseManifest.requestedBy).toContain('recipe-planner');

    // --- Uninstall travel-planner ---
    await gcUninstall('travel-planner', skillsDir, { force: false, isTTY: false });

    // base-skill and recipe-skill should still exist (recipe-planner still needs base-skill)
    await expect(fs.access(path.join(skillsDir, 'base-skill'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(skillsDir, 'recipe-skill'))).resolves.toBeUndefined();

    // travel-skill should be gone (only requested by travel-planner)
    await expect(fs.access(path.join(skillsDir, 'travel-skill'))).rejects.toThrow();

    // base-skill manifest should now only list recipe-planner
    const baseManifestAfterTravel = JSON.parse(await fs.readFile(baseManifestPath, 'utf8'));
    expect(baseManifestAfterTravel.requestedBy).not.toContain('travel-planner');
    expect(baseManifestAfterTravel.requestedBy).toContain('recipe-planner');

    // --- Uninstall recipe-planner ---
    await gcUninstall('recipe-planner', skillsDir, { force: false, isTTY: false });

    // base-skill should now be gone (no more requestors)
    await expect(fs.access(path.join(skillsDir, 'base-skill'))).rejects.toThrow();
    // recipe-skill should also be gone
    await expect(fs.access(path.join(skillsDir, 'recipe-skill'))).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Task 4.7 — GC on recorded requestedBy (not current package.json)
// ---------------------------------------------------------------------------

describe('gcUninstall — GC on recorded requestedBy (Task 4.7)', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await sandbox[Symbol.asyncDispose]();
  });

  it('4.7: superpowers-base GCd even when pkg.json dependency was dropped post-install', async () => {
    await installFixturePackages(sandbox, [
      { name: 'superpowers-base', version: '1.0.0', skillet: { skills: 'skills' } },
      {
        name: 'pkg-p',
        version: '1.0.0',
        skillet: { skills: 'skills' },
        deps: ['superpowers-base'],
      },
    ]);

    const baseRoot = await findPackageRoot('superpowers-base', sandbox.cwd);
    const pkgPRoot = await findPackageRoot('pkg-p', sandbox.cwd);
    expect(baseRoot).not.toBeNull();
    expect(pkgPRoot).not.toBeNull();

    await createSkillTree(path.join(baseRoot!, 'skills'), 'base-skill');
    await createSkillTree(path.join(pkgPRoot!, 'skills'), 'p-skill');

    const adapter = registry.get('claude')!;
    const scope = 'user' as const;
    const skillsDir = path.join(sandbox.home, '.claude', 'skills');

    // Install pkg-p's closure (includes superpowers-base)
    await installClosure(
      'pkg-p',
      pkgPRoot!,
      [path.join(pkgPRoot!, 'skills', 'p-skill')],
      adapter,
      scope,
    );

    // Verify installation: both skills present, base-skill has pkg-p in requestedBy
    await expect(fs.access(path.join(skillsDir, 'base-skill'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(skillsDir, 'p-skill'))).resolves.toBeUndefined();

    const baseManifestPath = path.join(skillsDir, 'base-skill', '.skill-manifest.json');
    const baseManifestBefore = JSON.parse(await fs.readFile(baseManifestPath, 'utf8'));
    expect(baseManifestBefore.requestedBy).toContain('pkg-p');

    // NOW: modify pkg-p's package.json to DROP the superpowers-base dependency
    // (simulates user removing the dep without uninstalling skills first)
    const pkgPPkgJsonPath = path.join(pkgPRoot!, 'package.json');
    const pkgPJson = JSON.parse(await fs.readFile(pkgPPkgJsonPath, 'utf8'));
    delete pkgPJson.dependencies; // remove superpowers-base
    await fs.writeFile(pkgPPkgJsonPath, JSON.stringify(pkgPJson, null, 2), 'utf8');

    // Uninstall pkg-p via gcUninstall (uses MANIFEST's requestedBy, not current package.json)
    await gcUninstall('pkg-p', skillsDir, { force: false, isTTY: false });

    // base-skill should be GC'd because its manifest still had pkg-p in requestedBy
    await expect(fs.access(path.join(skillsDir, 'base-skill'))).rejects.toThrow();
    // p-skill should also be gone
    await expect(fs.access(path.join(skillsDir, 'p-skill'))).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Task 4.8 — Multi-target GC independence
// ---------------------------------------------------------------------------

describe('gcUninstall — multi-target GC independence (Task 4.8)', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await sandbox[Symbol.asyncDispose]();
  });

  it('4.8: GC in one target dir does not affect another target dir', async () => {
    await installFixturePackages(sandbox, [
      { name: 'superpowers-base', version: '1.0.0', skillet: { skills: 'skills' } },
      {
        name: 'pkg-p',
        version: '1.0.0',
        skillet: { skills: 'skills' },
        deps: ['superpowers-base'],
      },
    ]);

    const baseRoot = await findPackageRoot('superpowers-base', sandbox.cwd);
    const pkgPRoot = await findPackageRoot('pkg-p', sandbox.cwd);
    expect(baseRoot).not.toBeNull();
    expect(pkgPRoot).not.toBeNull();

    await createSkillTree(path.join(baseRoot!, 'skills'), 'base-skill');
    await createSkillTree(path.join(pkgPRoot!, 'skills'), 'p-skill');

    // Two adapters: claude and agents, both user scope
    const claudeAdapter = registry.get('claude')!;
    const agentsAdapter = registry.get('agents')!;
    const scope = 'user' as const;

    const claudeSkillsDir = path.join(sandbox.home, '.claude', 'skills');
    const agentsSkillsDir = path.join(sandbox.home, '.agents', 'skills');

    // Install pkg-p's closure into BOTH targets (claude and agents)
    for (const adapter of [claudeAdapter, agentsAdapter]) {
      const closure = await resolveSkillPackageClosure(pkgPRoot!, [
        path.join(pkgPRoot!, 'skills', 'p-skill'),
      ]);
      for (const entry of closure) {
        const skill = await normalizeSkill(entry.skillDir);
        await performInstall(skill, adapter, scope, {
          pkg: { name: entry.packageName, version: '1.0.0' },
          requestorRoot: 'pkg-p',
        });
      }
    }

    // Both targets should have the skills installed
    await expect(fs.access(path.join(claudeSkillsDir, 'base-skill'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(claudeSkillsDir, 'p-skill'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(agentsSkillsDir, 'base-skill'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(agentsSkillsDir, 'p-skill'))).resolves.toBeUndefined();

    // Uninstall from claude target ONLY
    await gcUninstall('pkg-p', claudeSkillsDir, { force: false, isTTY: false });

    // Claude target: skills should be gone
    await expect(fs.access(path.join(claudeSkillsDir, 'base-skill'))).rejects.toThrow();
    await expect(fs.access(path.join(claudeSkillsDir, 'p-skill'))).rejects.toThrow();

    // Agents target: skills should still be present (GC was independent)
    await expect(fs.access(path.join(agentsSkillsDir, 'base-skill'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(agentsSkillsDir, 'p-skill'))).resolves.toBeUndefined();

    // Uninstall from agents target
    await gcUninstall('pkg-p', agentsSkillsDir, { force: false, isTTY: false });

    // Agents target: skills should now be gone
    await expect(fs.access(path.join(agentsSkillsDir, 'base-skill'))).rejects.toThrow();
    await expect(fs.access(path.join(agentsSkillsDir, 'p-skill'))).rejects.toThrow();
  });
});
