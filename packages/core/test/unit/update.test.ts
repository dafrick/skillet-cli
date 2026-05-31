// packages/core/test/unit/update.test.ts
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import nodePath from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registry } from '../../src/adapters/index.js';
import { hashSkill } from '../../src/hash.js';
import { computeRenderHash, type InstallRecord, LIB_VERSION } from '../../src/install.js';
import type { NormalizedSkill } from '../../src/normalize.js';
import type { Scope, SkillManifest } from '../../src/types.js';
import { backupInstall, decideUpdate } from '../../src/update.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(nodePath.join(os.tmpdir(), 'skillet-update-unit-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

const pkg = { name: 'test-pkg', version: '1.0.0' };
const adapter = (() => {
  const a = registry.get('claude');
  if (!a) throw new Error('claude adapter not found');
  return a;
})();
const scope: Scope = 'user';
const CONTENT_HASH = `sha256:${'a'.repeat(64)}`;

/**
 * Build a temp install directory and matching InstallRecord.
 *
 * isStale=true  → manifest.renderHash is wrong (won't match computed value)
 * isDrifted=true → SKILL.md is modified after the manifest is written
 */
async function makeInstall(opts: {
  isStale: boolean;
  isDrifted: boolean;
}): Promise<{ record: InstallRecord; skill: NormalizedSkill }> {
  await writeFile(nodePath.join(tmpDir, 'SKILL.md'), '# Test Skill\n');

  const postInstallHash = await hashSkill(tmpDir);
  const renderHash = opts.isStale
    ? `sha256:${'0'.repeat(64)}`
    : computeRenderHash(CONTENT_HASH, adapter.id, LIB_VERSION);

  const manifest: SkillManifest = {
    name: 'test-skill',
    description: 'Test skill',
    source: 'npm:test@1.0.0',
    declaredVersion: undefined,
    contentHash: CONTENT_HASH,
    renderHash,
    adapterId: adapter.id,
    scope,
    libVersion: LIB_VERSION,
    installedAt: new Date().toISOString(),
    postInstallHash,
  };

  await writeFile(
    nodePath.join(tmpDir, '.skill-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8',
  );

  if (opts.isDrifted) {
    // Modify SKILL.md after writing the manifest so postInstallHash no longer matches
    await writeFile(nodePath.join(tmpDir, 'SKILL.md'), '# Test Skill\n\n<!-- drifted -->');
  }

  const skill: NormalizedSkill = {
    name: 'test-skill',
    description: 'Test skill',
    contentHash: CONTENT_HASH,
    declaredVersion: undefined,
    frontmatter: {},
    body: '# Test Skill',
    sourceDir: tmpDir,
  };

  return { record: { adapter, scope, installPath: tmpDir, manifest }, skill };
}

describe('decideUpdate', () => {
  it('!isStale + pristine → skip', async () => {
    const { record, skill } = await makeInstall({ isStale: false, isDrifted: false });
    const result = await decideUpdate(record, skill, { pkg });
    expect(result).toBe('skip');
  });

  it('!isStale + drifted + force → overwrite', async () => {
    const { record, skill } = await makeInstall({ isStale: false, isDrifted: true });
    const result = await decideUpdate(record, skill, { pkg, force: true });
    expect(result).toBe('overwrite');
  });

  it('!isStale + drifted + isTTY → prompt', async () => {
    const { record, skill } = await makeInstall({ isStale: false, isDrifted: true });
    const result = await decideUpdate(record, skill, { pkg, isTTY: true });
    expect(result).toBe('prompt');
  });

  it('!isStale + drifted + non-TTY → drifted_skip', async () => {
    const { record, skill } = await makeInstall({ isStale: false, isDrifted: true });
    const result = await decideUpdate(record, skill, { pkg, isTTY: false });
    expect(result).toBe('drifted_skip');
  });

  it('stale + pristine → overwrite (silent refresh)', async () => {
    const { record, skill } = await makeInstall({ isStale: true, isDrifted: false });
    const result = await decideUpdate(record, skill, { pkg });
    expect(result).toBe('overwrite');
  });

  it('stale + drifted + force → overwrite', async () => {
    const { record, skill } = await makeInstall({ isStale: true, isDrifted: true });
    const result = await decideUpdate(record, skill, { pkg, force: true });
    expect(result).toBe('overwrite');
  });

  it('stale + drifted + isTTY → prompt', async () => {
    const { record, skill } = await makeInstall({ isStale: true, isDrifted: true });
    const result = await decideUpdate(record, skill, { pkg, isTTY: true });
    expect(result).toBe('prompt');
  });

  it('stale + drifted + non-TTY → drifted_skip', async () => {
    const { record, skill } = await makeInstall({ isStale: true, isDrifted: true });
    const result = await decideUpdate(record, skill, { pkg, isTTY: false });
    expect(result).toBe('drifted_skip');
  });
});

describe('backupInstall', () => {
  it('moves the install dir to a sibling path containing .bak.', async () => {
    const installPath = nodePath.join(tmpDir, 'my-skill');
    await mkdir(installPath, { recursive: true });
    await writeFile(nodePath.join(installPath, 'SKILL.md'), '# My Skill');

    const backupPath = await backupInstall(installPath);

    // Original no longer exists
    await expect(stat(installPath)).rejects.toThrow();

    // Backup exists as a directory
    const backupStat = await stat(backupPath);
    expect(backupStat.isDirectory()).toBe(true);

    // Backup is a sibling of the original
    expect(nodePath.dirname(backupPath)).toBe(nodePath.dirname(installPath));

    // Backup name matches: <skill-name>.bak.<ISO8601Z>
    expect(nodePath.basename(backupPath)).toMatch(/^my-skill\.bak\.\d{8}T\d{6}Z$/);
  });

  it('backup directory contains the original files', async () => {
    const installPath = nodePath.join(tmpDir, 'my-skill');
    await mkdir(installPath, { recursive: true });
    await writeFile(nodePath.join(installPath, 'SKILL.md'), '# Original Content');

    const backupPath = await backupInstall(installPath);

    const content = await readFile(nodePath.join(backupPath, 'SKILL.md'), 'utf8');
    expect(content).toBe('# Original Content');
  });
});
