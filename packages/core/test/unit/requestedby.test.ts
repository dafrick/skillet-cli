/**
 * Tests for requestedBy manifest field and install-time union behavior.
 * These are integration-style tests that exercise performInstall directly
 * with a real sandbox, covering Tasks 3.2–3.7.
 */
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registry } from '../../src/adapters/index.js';
import { hashSkill } from '../../src/hash.js';
import { isLegacyManifest, performInstall } from '../../src/install.js';
import { normalizeSkill } from '../../src/normalize.js';
import type { SkillManifest } from '../../src/types.js';
import { createSandbox } from '../integration/helpers/sandbox.js';

/** Create a minimal skill dir in tmpDir/name with given SKILL.md content */
async function createTempSkill(
  tmpDir: string,
  name: string,
  description: string,
  body: string,
): Promise<string> {
  const dir = path.join(tmpDir, name);
  await fs.mkdir(dir, { recursive: true });
  const skillMd = `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`;
  await fs.writeFile(path.join(dir, 'SKILL.md'), skillMd, 'utf8');
  return dir;
}

let skillTmpDir: string;

beforeEach(async () => {
  skillTmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'skillet-rb-test-')));
});

afterEach(async () => {
  await fs.rm(skillTmpDir, { recursive: true, force: true });
});

const helloSkillDir = fileURLToPath(new URL('../../fixtures/hello-skill', import.meta.url));

// Use claude/user as the canonical adapter/scope for all tests
const ADAPTER_ID = 'claude';
const SCOPE = 'user' as const;

describe('isLegacyManifest', () => {
  function makeManifest(extra: Partial<SkillManifest> = {}): SkillManifest {
    return {
      name: 'test',
      description: 'test',
      source: 'npm:test@1.0.0',
      declaredVersion: undefined,
      contentHash: `sha256:${'a'.repeat(64)}`,
      renderHash: `sha256:${'b'.repeat(64)}`,
      adapterId: 'claude',
      scope: 'user',
      libVersion: '0.1.0',
      installedAt: new Date().toISOString(),
      postInstallHash: `sha256:${'c'.repeat(64)}`,
      requestedBy: [],
      ...extra,
    };
  }

  it('3.6: returns false for a v0.2.0 manifest with requestedBy: []', () => {
    const manifest = makeManifest({ requestedBy: [] });
    expect(isLegacyManifest(manifest)).toBe(false);
  });

  it('3.6: returns false for a manifest with requestedBy populated', () => {
    const manifest = makeManifest({ requestedBy: ['some-pkg'] });
    expect(isLegacyManifest(manifest)).toBe(false);
  });

  it('3.6: returns true for a v0.1.0 manifest missing requestedBy', () => {
    const manifest = makeManifest();
    // Simulate v0.1.0 — delete requestedBy from the object
    const legacyManifest = { ...manifest } as Record<string, unknown>;
    delete legacyManifest.requestedBy;
    expect(isLegacyManifest(legacyManifest as unknown as SkillManifest)).toBe(true);
  });

  it('3.6: returns true when requestedBy is null (malformed manifest)', () => {
    const manifest = { ...makeManifest(), requestedBy: null } as unknown as SkillManifest;
    expect(isLegacyManifest(manifest)).toBe(true);
  });

  it('3.6: returns true when requestedBy is a string (malformed manifest)', () => {
    const manifest = {
      ...makeManifest(),
      requestedBy: 'not-an-array',
    } as unknown as SkillManifest;
    expect(isLegacyManifest(manifest)).toBe(true);
  });
});

describe('requestedBy field', () => {
  it('3.2: fresh install without requestorRoot seeds requestedBy: []', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(ADAPTER_ID)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, SCOPE, { pkg });

      const raw = await fs.readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
      const manifest = JSON.parse(raw);

      expect(Array.isArray(manifest.requestedBy)).toBe(true);
      expect(manifest.requestedBy).toEqual([]);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('3.2: fresh install with requestorRoot seeds requestedBy: [requestorRoot]', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(ADAPTER_ID)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, SCOPE, {
        pkg,
        requestorRoot: 'travel-planner',
      });

      const raw = await fs.readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
      const manifest = JSON.parse(raw);

      expect(manifest.requestedBy).toEqual(['travel-planner']);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('3.3: same contentHash — skip rewrite, union requestorRoot', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(ADAPTER_ID)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      // First install with travel-planner
      await performInstall(skill, adapter, SCOPE, { pkg, requestorRoot: 'travel-planner' });

      // Second install with same content, different requestorRoot
      const installPath = await performInstall(skill, adapter, SCOPE, {
        pkg,
        requestorRoot: 'recipe-planner',
      });

      const raw = await fs.readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
      const manifest = JSON.parse(raw);

      // Both requestors should be in the list
      expect(manifest.requestedBy).toContain('travel-planner');
      expect(manifest.requestedBy).toContain('recipe-planner');
      expect(manifest.requestedBy).toHaveLength(2);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('3.3: same contentHash union is idempotent (calling twice with same root → no duplicate)', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(ADAPTER_ID)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      await performInstall(skill, adapter, SCOPE, { pkg, requestorRoot: 'travel-planner' });
      const installPath = await performInstall(skill, adapter, SCOPE, {
        pkg,
        requestorRoot: 'travel-planner',
      });

      const raw = await fs.readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
      const manifest = JSON.parse(raw);

      // Idempotent — still only one entry
      expect(manifest.requestedBy).toEqual(['travel-planner']);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('3.3: same contentHash collision — skill content is NOT rewritten (file mtimes unchanged)', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(ADAPTER_ID)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, SCOPE, {
        pkg,
        requestorRoot: 'travel-planner',
      });

      const skillMdBefore = await fs.stat(path.join(installPath, 'SKILL.md'));

      // Small delay to ensure mtime would differ if rewritten
      await new Promise((r) => setTimeout(r, 10));

      await performInstall(skill, adapter, SCOPE, { pkg, requestorRoot: 'recipe-planner' });

      const skillMdAfter = await fs.stat(path.join(installPath, 'SKILL.md'));

      // SKILL.md mtime should NOT have changed — no rewrite
      expect(skillMdAfter.mtimeMs).toBe(skillMdBefore.mtimeMs);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('3.5: requestedBy changes in manifest do NOT affect contentHash/postInstallHash', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(ADAPTER_ID)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, SCOPE, { pkg });

      // Hash after fresh install
      const hashBefore = await hashSkill(installPath);

      // Modify ONLY requestedBy in the manifest
      const manifestPath = path.join(installPath, '.skill-manifest.json');
      const raw = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(raw);
      manifest.requestedBy = ['some-requester', 'another-requester'];
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

      // Hash should be unchanged because .skill-manifest.json is excluded
      const hashAfter = await hashSkill(installPath);
      expect(hashAfter).toBe(hashBefore);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('3.7: requestedBy is an unordered set — no duplicates regardless of insertion order', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(ADAPTER_ID)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      // Install in order: A, B, A, C, B
      await performInstall(skill, adapter, SCOPE, { pkg, requestorRoot: 'alpha' });
      await performInstall(skill, adapter, SCOPE, { pkg, requestorRoot: 'beta' });
      await performInstall(skill, adapter, SCOPE, { pkg, requestorRoot: 'alpha' }); // duplicate
      await performInstall(skill, adapter, SCOPE, { pkg, requestorRoot: 'gamma' });
      const installPath = await performInstall(skill, adapter, SCOPE, {
        pkg,
        requestorRoot: 'beta',
      }); // duplicate

      const raw = await fs.readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
      const manifest = JSON.parse(raw);
      const sorted = [...manifest.requestedBy].sort();

      expect(sorted).toEqual(['alpha', 'beta', 'gamma']);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('3.4: same-source content update (pristine) — overwrites and unions requestorRoot', async () => {
    const sandbox = await createSandbox();
    try {
      const adapter = registry.get(ADAPTER_ID)!;
      const pkg = { name: 'my-skill-pkg', version: '1.0.0' };

      // Install v1 of a skill with requestorRoot
      const skillV1Dir = await createTempSkill(
        skillTmpDir,
        'my-skill-v1',
        'My Skill',
        'v1 content',
      );
      const skillV1 = await normalizeSkill(skillV1Dir);
      const installPath = await performInstall(skillV1, adapter, SCOPE, {
        pkg,
        requestorRoot: 'app-one',
      });

      // Verify v1 installed
      const rawV1 = await fs.readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
      const manifestV1 = JSON.parse(rawV1);
      expect(manifestV1.requestedBy).toEqual(['app-one']);

      // Create v2 of the same skill (different content, same name, same source pkg)
      const skillV2Dir = await createTempSkill(
        skillTmpDir,
        'my-skill-v2',
        'My Skill',
        'v2 updated content',
      );
      // Same name as v1 so it goes to same install path
      const skillV2 = {
        ...(await normalizeSkill(skillV2Dir)),
        name: skillV1.name, // same name → same install path
      };

      // Install v2 with a different requestorRoot
      const installPath2 = await performInstall(skillV2, adapter, SCOPE, {
        pkg: { name: 'my-skill-pkg', version: '1.1.0' },
        requestorRoot: 'app-two',
      });

      expect(installPath2).toBe(installPath);

      const rawV2 = await fs.readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
      const manifestV2 = JSON.parse(rawV2);

      // requestedBy should include both roots after union
      expect(manifestV2.requestedBy).toContain('app-one');
      expect(manifestV2.requestedBy).toContain('app-two');
      expect(manifestV2.requestedBy).toHaveLength(2);

      // Content hash should reflect v2
      expect(manifestV2.contentHash).toBe(skillV2.contentHash);
      expect(manifestV2.contentHash).not.toBe(skillV1.contentHash);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });
});
