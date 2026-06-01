import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import nodePath from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectDrift, isStale } from '../../src/drift.js';
import { hashSkill } from '../../src/hash.js';
import type { SkillManifest } from '../../src/types.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(nodePath.join(os.tmpdir(), 'skillet-drift-test-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

/** Write a file relative to tmpDir, creating parent dirs as needed. */
async function write(relPath: string, content: string | Buffer): Promise<void> {
  const abs = nodePath.join(tmpDir, relPath);
  await mkdir(nodePath.dirname(abs), { recursive: true });
  await writeFile(abs, content);
}

/** Build a minimal valid SkillManifest with the given postInstallHash and contentHash. */
function makeManifest(postInstallHash: string, contentHash: string): SkillManifest {
  return {
    name: 'test',
    description: 'test',
    source: 'npm:test@1.0.0',
    declaredVersion: '1.0.0',
    contentHash,
    renderHash: 'sha256:abc',
    adapterId: 'agents',
    scope: 'user',
    libVersion: '0.1.0',
    installedAt: new Date().toISOString(),
    postInstallHash,
    requestedBy: [],
  };
}

describe('detectDrift', () => {
  it('unmodified install returns "pristine"', async () => {
    await write('skill.ts', 'export const x = 1;');
    await write('README.md', '# skill');

    const currentHash = await hashSkill(tmpDir);
    const manifest = makeManifest(currentHash, currentHash);
    await write('.skill-manifest.json', JSON.stringify(manifest));

    const result = await detectDrift(tmpDir);
    expect(result).toBe('pristine');
  });

  it('editing a file in the install directory returns "modified"', async () => {
    await write('skill.ts', 'export const x = 1;');

    const currentHash = await hashSkill(tmpDir);
    const manifest = makeManifest(currentHash, currentHash);
    await write('.skill-manifest.json', JSON.stringify(manifest));

    // Modify a tracked file after writing the manifest
    await write('skill.ts', 'export const x = 42; // changed');

    const result = await detectDrift(tmpDir);
    expect(result).toBe('modified');
  });

  it('.skill-manifest.json-only change returns "pristine" (excluded from drift check)', async () => {
    await write('skill.ts', 'export const x = 1;');

    const currentHash = await hashSkill(tmpDir);
    const manifest = makeManifest(currentHash, currentHash);
    await write('.skill-manifest.json', JSON.stringify(manifest));

    // Update only the manifest — hash should still match since manifest is excluded
    const updatedManifest = makeManifest(currentHash, 'sha256:somenewhash');
    await write('.skill-manifest.json', JSON.stringify(updatedManifest));

    const result = await detectDrift(tmpDir);
    expect(result).toBe('pristine');
  });

  it('directory with no .skill-manifest.json returns "unknown"', async () => {
    await write('skill.ts', 'export const x = 1;');
    // Deliberately no .skill-manifest.json written

    const result = await detectDrift(tmpDir);
    expect(result).toBe('unknown');
  });
});

describe('isStale', () => {
  it('returns false when source contentHash matches manifest contentHash', async () => {
    const hash = 'sha256:aaabbbccc';
    const manifest = makeManifest(hash, hash);
    await write('.skill-manifest.json', JSON.stringify(manifest));

    const result = await isStale(tmpDir, hash);
    expect(result).toBe(false);
  });

  it('returns true when source contentHash differs from manifest contentHash', async () => {
    const oldHash = 'sha256:old';
    const newHash = 'sha256:new';
    const manifest = makeManifest(oldHash, oldHash);
    await write('.skill-manifest.json', JSON.stringify(manifest));

    const result = await isStale(tmpDir, newHash);
    expect(result).toBe(true);
  });

  it('returns true when no .skill-manifest.json exists', async () => {
    // No manifest written — treat as stale
    const result = await isStale(tmpDir, 'sha256:any');
    expect(result).toBe(true);
  });
});
