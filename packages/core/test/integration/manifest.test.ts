import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { registry } from '../../src/adapters/index.js';
import { hashSkill } from '../../src/hash.js';
import { LIB_VERSION, performInstall } from '../../src/install.js';
import { normalizeSkill } from '../../src/normalize.js';
import { createSandbox } from './helpers/sandbox.js';

const helloSkillDir = fileURLToPath(new URL('../../fixtures/hello-skill', import.meta.url));

// Use claude/user as a representative combination for manifest tests
const adapterId = 'claude';
const scope = 'user' as const;

describe('manifest (.skill-manifest.json)', () => {
  it('all required fields are present: name, description, source, declaredVersion, contentHash, renderHash, postInstallHash, adapterId, scope, libVersion, installedAt', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'my-skill-pkg', version: '2.3.4' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      const raw = await fs.readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
      const manifest = JSON.parse(raw);

      const requiredFields = [
        'name',
        'description',
        'source',
        'declaredVersion',
        'contentHash',
        'renderHash',
        'postInstallHash',
        'adapterId',
        'scope',
        'libVersion',
        'installedAt',
      ];

      for (const field of requiredFields) {
        expect(manifest, `field "${field}" should be present`).toHaveProperty(field);
      }

      // Spot-check values
      expect(manifest.name).toBe(skill.name);
      expect(manifest.description).toBe(skill.description);
      expect(manifest.source).toBe(`npm:${pkg.name}@${pkg.version}`);
      expect(manifest.adapterId).toBe(adapterId);
      expect(manifest.scope).toBe(scope);
      expect(manifest.libVersion).toBe(LIB_VERSION);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('installedAt is a valid ISO 8601 UTC string', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'my-skill-pkg', version: '2.3.4' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      const raw = await fs.readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
      const manifest = JSON.parse(raw);

      const { installedAt } = manifest;
      expect(typeof installedAt).toBe('string');

      // ISO 8601 UTC: ends with Z, parseable as a valid date
      expect(installedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);

      const parsed = new Date(installedAt);
      expect(Number.isNaN(parsed.getTime())).toBe(false);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('postInstallHash matches re-hash of installed folder excluding .skill-manifest.json', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'my-skill-pkg', version: '2.3.4' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      const raw = await fs.readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
      const manifest = JSON.parse(raw);

      // hashSkill excludes .skill-manifest.json by default
      const rehash = await hashSkill(installPath);
      expect(manifest.postInstallHash).toBe(rehash);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('contentHash has sha256: prefix followed by 64-char lowercase hex digest', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'my-skill-pkg', version: '2.3.4' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      const raw = await fs.readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
      const manifest = JSON.parse(raw);

      expect(manifest.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });
});
