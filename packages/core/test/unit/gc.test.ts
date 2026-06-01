/**
 * Unit tests for gc.ts — scanInstalledSkills and gcUninstall.
 * Tasks 4.1, 4.2, 4.3, 4.5
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gcUninstall, scanInstalledSkills } from '../../src/gc.js';
import type { SkillManifest } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeManifest(overrides: Partial<SkillManifest> = {}): SkillManifest {
  return {
    name: 'test-skill',
    description: 'Test Skill',
    source: 'npm:test-pkg@1.0.0',
    declaredVersion: undefined,
    contentHash: `sha256:${'a'.repeat(64)}`,
    renderHash: `sha256:${'b'.repeat(64)}`,
    adapterId: 'claude',
    scope: 'user',
    libVersion: '0.2.0',
    installedAt: new Date().toISOString(),
    postInstallHash: `sha256:${'c'.repeat(64)}`,
    requestedBy: ['pkg-a'],
    ...overrides,
  };
}

/** Write a skill directory with a SKILL.md and a manifest. */
async function writeSkill(
  skillsDir: string,
  skillName: string,
  manifest: SkillManifest,
): Promise<string> {
  const skillDir = path.join(skillsDir, skillName);
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(path.join(skillDir, 'SKILL.md'), `# ${skillName}\n`, 'utf8');
  await fs.writeFile(
    path.join(skillDir, '.skill-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8',
  );
  return skillDir;
}

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'skillet-gc-test-')));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Task 4.1 — scanInstalledSkills
// ---------------------------------------------------------------------------

describe('scanInstalledSkills', () => {
  it('4.1: returns all 3 parsed manifests from a directory with 3 skills', async () => {
    const skillsDir = path.join(tmpDir, 'skills');
    await fs.mkdir(skillsDir, { recursive: true });

    const m1 = makeManifest({ name: 'skill-a', requestedBy: ['pkg-a'] });
    const m2 = makeManifest({ name: 'skill-b', requestedBy: ['pkg-b'] });
    const m3 = makeManifest({ name: 'skill-c', requestedBy: ['pkg-a', 'pkg-b'] });

    await writeSkill(skillsDir, 'skill-a', m1);
    await writeSkill(skillsDir, 'skill-b', m2);
    await writeSkill(skillsDir, 'skill-c', m3);

    const results = await scanInstalledSkills(skillsDir);

    expect(results).toHaveLength(3);
    const names = results.map((r) => r.manifest.name).sort();
    expect(names).toEqual(['skill-a', 'skill-b', 'skill-c']);
    for (const result of results) {
      expect(result.skillDir).toBeTruthy();
      expect(result.manifestPath).toBeTruthy();
      expect(result.manifest).toBeTruthy();
      expect(path.isAbsolute(result.skillDir)).toBe(true);
      expect(path.isAbsolute(result.manifestPath)).toBe(true);
      expect(result.manifestPath).toContain('.skill-manifest.json');
    }
  });

  it('4.1: returns legacy manifest (no requestedBy) — scanning returns all, filtering in gcUninstall', async () => {
    const skillsDir = path.join(tmpDir, 'skills');
    await fs.mkdir(skillsDir, { recursive: true });

    // Normal manifest
    const normalManifest = makeManifest({ name: 'normal-skill', requestedBy: ['pkg-a'] });
    await writeSkill(skillsDir, 'normal-skill', normalManifest);

    // Legacy manifest — no requestedBy field
    const legacyRaw = {
      name: 'legacy-skill',
      description: 'Legacy Skill',
      source: 'npm:legacy-pkg@0.1.0',
      declaredVersion: undefined,
      contentHash: `sha256:${'d'.repeat(64)}`,
      renderHash: `sha256:${'e'.repeat(64)}`,
      adapterId: 'claude',
      scope: 'user',
      libVersion: '0.1.0',
      installedAt: new Date().toISOString(),
      postInstallHash: `sha256:${'f'.repeat(64)}`,
      // requestedBy intentionally absent
    };
    const legacySkillDir = path.join(skillsDir, 'legacy-skill');
    await fs.mkdir(legacySkillDir, { recursive: true });
    await fs.writeFile(path.join(legacySkillDir, 'SKILL.md'), '# legacy-skill\n', 'utf8');
    await fs.writeFile(
      path.join(legacySkillDir, '.skill-manifest.json'),
      JSON.stringify(legacyRaw, null, 2),
      'utf8',
    );

    const results = await scanInstalledSkills(skillsDir);
    expect(results).toHaveLength(2);
    const names = results.map((r) => r.manifest.name).sort();
    expect(names).toEqual(['legacy-skill', 'normal-skill']);
  });

  it('4.1: empty skills directory returns []', async () => {
    const skillsDir = path.join(tmpDir, 'empty-skills');
    await fs.mkdir(skillsDir, { recursive: true });

    const results = await scanInstalledSkills(skillsDir);
    expect(results).toEqual([]);
  });

  it('4.1: non-existent skills directory returns []', async () => {
    const nonExistent = path.join(tmpDir, 'does-not-exist');
    const results = await scanInstalledSkills(nonExistent);
    expect(results).toEqual([]);
  });

  it('4.1: subdirectory without manifest is skipped', async () => {
    const skillsDir = path.join(tmpDir, 'skills');
    await fs.mkdir(skillsDir, { recursive: true });

    // A skill with manifest
    await writeSkill(skillsDir, 'good-skill', makeManifest({ name: 'good-skill' }));

    // A dir without manifest
    const noManifestDir = path.join(skillsDir, 'no-manifest');
    await fs.mkdir(noManifestDir, { recursive: true });
    await fs.writeFile(path.join(noManifestDir, 'SKILL.md'), '# no-manifest\n', 'utf8');

    const results = await scanInstalledSkills(skillsDir);
    expect(results).toHaveLength(1);
    expect(results[0].manifest.name).toBe('good-skill');
  });
});

// ---------------------------------------------------------------------------
// Task 4.2/4.5 — gcUninstall
// ---------------------------------------------------------------------------

describe('gcUninstall', () => {
  // Scenario 1: Last requestor removed, skill is pristine → deleted without prompt
  it('4.5/1: last requestor removed, skill is pristine → deleted without prompt', async () => {
    const skillsDir = path.join(tmpDir, 'skills');
    const manifest = makeManifest({
      name: 'my-skill',
      requestedBy: ['pkg-to-remove'],
      // postInstallHash must match the actual file hash, so we set it after writing
    });

    const skillDir = await writeSkill(skillsDir, 'my-skill', manifest);

    // Compute real postInstallHash so detectDrift returns 'pristine'
    const { hashSkill } = await import('../../src/hash.js');
    const realHash = await hashSkill(skillDir);
    // Rewrite manifest with real hash
    const updatedManifest = { ...manifest, postInstallHash: realHash };
    await fs.writeFile(
      path.join(skillDir, '.skill-manifest.json'),
      JSON.stringify(updatedManifest, null, 2),
      'utf8',
    );

    const onPrompt = vi.fn().mockResolvedValue(true);

    await gcUninstall('pkg-to-remove', skillsDir, { force: false, isTTY: false, onPrompt });

    // Skill dir should be gone
    await expect(fs.access(skillDir)).rejects.toThrow();
    // onPrompt should NOT have been called
    expect(onPrompt).not.toHaveBeenCalled();
  });

  // Scenario 2: Last requestor removed, skill is modified (TTY) → prompted
  it('4.5/2: last requestor removed, skill is modified (TTY) → prompted, deleted if returns true', async () => {
    const skillsDir = path.join(tmpDir, 'skills');
    const manifest = makeManifest({
      name: 'my-skill',
      requestedBy: ['pkg-to-remove'],
      postInstallHash: `sha256:${'0'.repeat(64)}`, // will not match real hash
    });

    const skillDir = await writeSkill(skillsDir, 'my-skill', manifest);

    const onPrompt = vi.fn().mockResolvedValue(true);

    await gcUninstall('pkg-to-remove', skillsDir, { force: false, isTTY: true, onPrompt });

    expect(onPrompt).toHaveBeenCalledWith(skillDir);
    // Prompt returned true → should be deleted
    await expect(fs.access(skillDir)).rejects.toThrow();
  });

  it('4.5/2: last requestor removed, skill is modified (TTY) → prompted, kept if returns false', async () => {
    const skillsDir = path.join(tmpDir, 'skills');
    const manifest = makeManifest({
      name: 'my-skill',
      requestedBy: ['pkg-to-remove'],
      postInstallHash: `sha256:${'0'.repeat(64)}`, // will not match real hash → modified
    });

    const skillDir = await writeSkill(skillsDir, 'my-skill', manifest);

    const onPrompt = vi.fn().mockResolvedValue(false);

    await gcUninstall('pkg-to-remove', skillsDir, { force: false, isTTY: true, onPrompt });

    expect(onPrompt).toHaveBeenCalledWith(skillDir);
    // Prompt returned false → skill dir should still exist
    await expect(fs.access(skillDir)).resolves.toBeUndefined();
    // Manifest should be rewritten with empty requestedBy
    const raw = await fs.readFile(path.join(skillDir, '.skill-manifest.json'), 'utf8');
    const updated = JSON.parse(raw) as SkillManifest;
    expect(updated.requestedBy).toEqual([]);
  });

  // Scenario 3: Last requestor removed, skill is modified (CI, no --force) → warning, NOT deleted
  it('4.5/3: last requestor removed, skill is modified (CI, no --force) → warning, skill kept', async () => {
    const skillsDir = path.join(tmpDir, 'skills');
    const manifest = makeManifest({
      name: 'my-skill',
      requestedBy: ['pkg-to-remove'],
      postInstallHash: `sha256:${'0'.repeat(64)}`, // mismatched → modified
    });

    const skillDir = await writeSkill(skillsDir, 'my-skill', manifest);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await gcUninstall('pkg-to-remove', skillsDir, { force: false, isTTY: false });

    // Skill should still exist
    await expect(fs.access(skillDir)).resolves.toBeUndefined();
    // A warning should have been logged
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();

    // Manifest should be rewritten with empty requestedBy (not deleted, but updated)
    const raw = await fs.readFile(path.join(skillDir, '.skill-manifest.json'), 'utf8');
    const updated = JSON.parse(raw) as SkillManifest;
    expect(updated.requestedBy).toEqual([]);
  });

  // Scenario 4: Last requestor removed, skill is modified (CI, --force) → deleted without prompt
  it('4.5/4: last requestor removed, skill is modified (CI, --force) → deleted without prompt', async () => {
    const skillsDir = path.join(tmpDir, 'skills');
    const manifest = makeManifest({
      name: 'my-skill',
      requestedBy: ['pkg-to-remove'],
      postInstallHash: `sha256:${'0'.repeat(64)}`, // mismatched → modified
    });

    const skillDir = await writeSkill(skillsDir, 'my-skill', manifest);

    const onPrompt = vi.fn().mockResolvedValue(true);

    await gcUninstall('pkg-to-remove', skillsDir, { force: true, isTTY: false, onPrompt });

    // Should be deleted
    await expect(fs.access(skillDir)).rejects.toThrow();
    // No prompt
    expect(onPrompt).not.toHaveBeenCalled();
  });

  // Scenario 5: One of many requestors removed → manifest rewritten, skill kept
  it('4.5/5: one of many requestors removed → manifest rewritten, skill kept', async () => {
    const skillsDir = path.join(tmpDir, 'skills');
    const manifest = makeManifest({
      name: 'my-skill',
      requestedBy: ['pkg-a', 'pkg-b', 'pkg-c'],
    });

    const skillDir = await writeSkill(skillsDir, 'my-skill', manifest);

    await gcUninstall('pkg-a', skillsDir, { force: false, isTTY: false });

    // Skill dir should still exist
    await expect(fs.access(skillDir)).resolves.toBeUndefined();

    // Manifest should be rewritten with pkg-a removed
    const raw = await fs.readFile(path.join(skillDir, '.skill-manifest.json'), 'utf8');
    const updated = JSON.parse(raw) as SkillManifest;
    expect(updated.requestedBy).not.toContain('pkg-a');
    expect(updated.requestedBy).toContain('pkg-b');
    expect(updated.requestedBy).toContain('pkg-c');
    expect(updated.requestedBy).toHaveLength(2);
  });

  // Scenario 6: Skill not listing P in requestedBy → untouched
  it('4.5/6: skill not listing P in requestedBy → untouched', async () => {
    const skillsDir = path.join(tmpDir, 'skills');
    const manifest = makeManifest({
      name: 'my-skill',
      requestedBy: ['other-pkg'],
    });

    const skillDir = await writeSkill(skillsDir, 'my-skill', manifest);

    await gcUninstall('pkg-to-remove', skillsDir, { force: false, isTTY: false });

    // Skill dir should still exist
    await expect(fs.access(skillDir)).resolves.toBeUndefined();

    // Manifest should be unchanged — compare parsed fields (not byte-level string)
    const raw = await fs.readFile(path.join(skillDir, '.skill-manifest.json'), 'utf8');
    const parsed = JSON.parse(raw) as SkillManifest;
    expect(parsed.name).toEqual(manifest.name);
    expect(parsed.requestedBy).toEqual(manifest.requestedBy);
    expect(parsed.source).toEqual(manifest.source);
    expect(parsed.contentHash).toEqual(manifest.contentHash);
  });

  // Scenario 7: Manifest without requestedBy (legacy) → skipped, not removed
  it('4.5/7: manifest without requestedBy (legacy) → skipped, not removed', async () => {
    const skillsDir = path.join(tmpDir, 'skills');

    // Write a legacy manifest WITHOUT requestedBy
    const legacyRaw = {
      name: 'legacy-skill',
      description: 'Legacy Skill',
      source: 'npm:pkg-to-remove@0.1.0',
      declaredVersion: undefined,
      contentHash: `sha256:${'d'.repeat(64)}`,
      renderHash: `sha256:${'e'.repeat(64)}`,
      adapterId: 'claude',
      scope: 'user',
      libVersion: '0.1.0',
      installedAt: new Date().toISOString(),
      postInstallHash: `sha256:${'f'.repeat(64)}`,
      // requestedBy intentionally absent
    };

    const skillDir = path.join(skillsDir, 'legacy-skill');
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), '# legacy-skill\n', 'utf8');
    await fs.writeFile(
      path.join(skillDir, '.skill-manifest.json'),
      JSON.stringify(legacyRaw, null, 2),
      'utf8',
    );

    await gcUninstall('pkg-to-remove', skillsDir, { force: false, isTTY: false });

    // Legacy skill dir should still exist
    await expect(fs.access(skillDir)).resolves.toBeUndefined();

    // Manifest should be completely untouched — compare parsed fields (not byte-level string)
    const raw = await fs.readFile(path.join(skillDir, '.skill-manifest.json'), 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed['name']).toEqual(legacyRaw.name);
    expect(parsed['source']).toEqual(legacyRaw.source);
    expect(parsed['contentHash']).toEqual(legacyRaw.contentHash);
    expect(Object.hasOwn(parsed, 'requestedBy')).toBe(false);
  });

  it('4.5/8: multiple skills in dir — only matching skill is modified', async () => {
    const skillsDir = path.join(tmpDir, 'skills');

    const manifestA = makeManifest({ name: 'skill-a', requestedBy: ['pkg-to-remove', 'pkg-b'] });
    const manifestB = makeManifest({ name: 'skill-b', requestedBy: ['pkg-to-remove'] });
    // skill-b: compute real hash for pristine
    const skillDirA = await writeSkill(skillsDir, 'skill-a', manifestA);
    const skillDirB = await writeSkill(skillsDir, 'skill-b', manifestB);

    // Make skill-b pristine
    const { hashSkill } = await import('../../src/hash.js');
    const realHashB = await hashSkill(skillDirB);
    const updatedManifestB = { ...manifestB, postInstallHash: realHashB };
    await fs.writeFile(
      path.join(skillDirB, '.skill-manifest.json'),
      JSON.stringify(updatedManifestB, null, 2),
      'utf8',
    );

    await gcUninstall('pkg-to-remove', skillsDir, { force: false, isTTY: false });

    // skill-a: pkg-to-remove removed, pkg-b remains, skill kept
    await expect(fs.access(skillDirA)).resolves.toBeUndefined();
    const rawA = await fs.readFile(path.join(skillDirA, '.skill-manifest.json'), 'utf8');
    const updatedA = JSON.parse(rawA) as SkillManifest;
    expect(updatedA.requestedBy).toEqual(['pkg-b']);

    // skill-b: was only requested by pkg-to-remove, pristine → deleted
    await expect(fs.access(skillDirB)).rejects.toThrow();
  });
});
