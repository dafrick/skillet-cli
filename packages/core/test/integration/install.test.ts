import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { registry } from '../../src/adapters/index.js';
import { detectDrift, isStale } from '../../src/drift.js';
import { hashSkill } from '../../src/hash.js';
import { findExistingInstalls, LIB_VERSION, performInstall } from '../../src/install.js';
import { normalizeSkill } from '../../src/normalize.js';
import type { Scope } from '../../src/types.js';
import { applyUpdate, removeInstall } from '../../src/update.js';
import { createSandbox } from './helpers/sandbox.js';

const helloSkillDir = fileURLToPath(new URL('../../fixtures/hello-skill', import.meta.url));

const COMBINATIONS = [
  { adapterId: 'claude', scope: 'user' as Scope, expectedSubdir: '.claude/skills' },
  { adapterId: 'claude', scope: 'project' as Scope, expectedSubdir: '.claude/skills' },
  { adapterId: 'copilot', scope: 'user' as Scope, expectedSubdir: '.copilot/skills' },
  { adapterId: 'copilot', scope: 'project' as Scope, expectedSubdir: '.github/skills' },
  { adapterId: 'agents', scope: 'user' as Scope, expectedSubdir: '.agents/skills' },
  { adapterId: 'agents', scope: 'project' as Scope, expectedSubdir: '.agents/skills' },
] as const;

describe.each(COMBINATIONS)('install: $adapterId/$scope', ({
  adapterId,
  scope,
  expectedSubdir,
}) => {
  it('fresh install: correct files written to <expectedSubdir>/<skill-name>/', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      await performInstall(skill, adapter, scope, { pkg });

      const expectedBase = scope === 'user' ? sandbox.home : sandbox.cwd;
      const installPath = path.join(expectedBase, expectedSubdir, skill.name);
      const skillMdStat = await fs.stat(path.join(installPath, 'SKILL.md'));
      expect(skillMdStat.isFile()).toBe(true);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('fresh install: .skill-manifest.json contains all required fields with correct formats', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      const raw = await fs.readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
      const manifest = JSON.parse(raw);

      expect(manifest.name).toBe(skill.name);
      expect(manifest.description).toBe(skill.description);
      expect(manifest.source).toBe(`npm:${pkg.name}@${pkg.version}`);
      // declaredVersion is null in JSON when the skill has no version declared
      expect(manifest.declaredVersion).toBe(skill.declaredVersion ?? null);
      expect(typeof manifest.contentHash).toBe('string');
      expect(manifest.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(typeof manifest.renderHash).toBe('string');
      expect(manifest.renderHash).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(typeof manifest.postInstallHash).toBe('string');
      expect(manifest.postInstallHash).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(manifest.adapterId).toBe(adapterId);
      expect(manifest.scope).toBe(scope);
      expect(manifest.libVersion).toBe(LIB_VERSION);
      expect(typeof manifest.installedAt).toBe('string');
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('fresh install: postInstallHash matches re-hash of installed folder', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      const raw = await fs.readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
      const manifest = JSON.parse(raw);

      const rehash = await hashSkill(installPath);
      expect(manifest.postInstallHash).toBe(rehash);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('idempotent install: running twice produces no changes and exits successfully', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath1 = await performInstall(skill, adapter, scope, { pkg });
      const manifest1Raw = await fs.readFile(
        path.join(installPath1, '.skill-manifest.json'),
        'utf8',
      );
      const manifest1 = JSON.parse(manifest1Raw);

      const installPath2 = await performInstall(skill, adapter, scope, { pkg });
      const manifest2Raw = await fs.readFile(
        path.join(installPath2, '.skill-manifest.json'),
        'utf8',
      );
      const manifest2 = JSON.parse(manifest2Raw);

      expect(installPath1).toBe(installPath2);
      expect(manifest1.postInstallHash).toBe(manifest2.postInstallHash);
      expect(manifest1.contentHash).toBe(manifest2.contentHash);
      expect(manifest1.renderHash).toBe(manifest2.renderHash);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('drift detection: detectDrift() returns "modified" after file edit', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      // Edit the installed SKILL.md
      const skillMdPath = path.join(installPath, 'SKILL.md');
      const original = await fs.readFile(skillMdPath, 'utf8');
      await fs.writeFile(skillMdPath, `${original}\n\n<!-- locally modified -->`, 'utf8');

      const drift = await detectDrift(installPath);
      expect(drift).toBe('modified');
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('drift detection: detectDrift() returns "pristine" for unmodified install', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      const drift = await detectDrift(installPath);
      expect(drift).toBe('pristine');
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('drift detection: detectDrift() returns "unknown" when no .skill-manifest.json exists', async () => {
    const sandbox = await createSandbox();
    try {
      const expectedBase = scope === 'user' ? sandbox.home : sandbox.cwd;
      const fakePath = path.join(expectedBase, expectedSubdir, 'no-such-skill');

      const drift = await detectDrift(fakePath);
      expect(drift).toBe('unknown');
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('stale detection: isStale() returns true when source skill has changed', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      // Use a different hash to simulate source change
      const differentHash = `sha256:${'a'.repeat(64)}`;
      const stale = await isStale(installPath, differentHash);
      expect(stale).toBe(true);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('stale detection: isStale() returns false when source matches stored contentHash', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      // Use the same contentHash that was stored in the manifest
      const stale = await isStale(installPath, skill.contentHash);
      expect(stale).toBe(false);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('hooks: beforeInstall is called before files are copied', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      let filesExistedDuringBeforeHook: boolean | null = null;
      const installPath = adapter.resolveInstallPath(skill, {
        scope,
        cwd: sandbox.cwd,
        home: sandbox.home,
      });

      await performInstall(skill, adapter, scope, {
        pkg,
        hooks: {
          beforeInstall: async () => {
            try {
              await fs.stat(path.join(installPath, 'SKILL.md'));
              filesExistedDuringBeforeHook = true;
            } catch {
              filesExistedDuringBeforeHook = false;
            }
          },
        },
      });

      expect(filesExistedDuringBeforeHook).toBe(false);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('hooks: afterInstall is called after .skill-manifest.json is written', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      let manifestExistedDuringAfterHook: boolean | null = null;
      const installPath = adapter.resolveInstallPath(skill, {
        scope,
        cwd: sandbox.cwd,
        home: sandbox.home,
      });

      await performInstall(skill, adapter, scope, {
        pkg,
        hooks: {
          afterInstall: async () => {
            try {
              await fs.stat(path.join(installPath, '.skill-manifest.json'));
              manifestExistedDuringAfterHook = true;
            } catch {
              manifestExistedDuringAfterHook = false;
            }
          },
        },
      });

      expect(manifestExistedDuringAfterHook).toBe(true);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('hooks: both hooks receive correct arguments', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const beforeArgs: { skill: unknown; adapter: unknown; ctx: unknown } = {
        skill: null,
        adapter: null,
        ctx: null,
      };
      const afterArgs: { skill: unknown; adapter: unknown; ctx: unknown } = {
        skill: null,
        adapter: null,
        ctx: null,
      };

      await performInstall(skill, adapter, scope, {
        pkg,
        hooks: {
          beforeInstall: (s, a, c) => {
            beforeArgs.skill = s;
            beforeArgs.adapter = a;
            beforeArgs.ctx = c;
          },
          afterInstall: (s, a, c) => {
            afterArgs.skill = s;
            afterArgs.adapter = a;
            afterArgs.ctx = c;
          },
        },
      });

      // Check beforeInstall args
      expect((beforeArgs.skill as typeof skill).name).toBe(skill.name);
      expect((beforeArgs.adapter as typeof adapter).id).toBe(adapterId);
      expect((beforeArgs.ctx as { scope: string }).scope).toBe(scope);

      // Check afterInstall args
      expect((afterArgs.skill as typeof skill).name).toBe(skill.name);
      expect((afterArgs.adapter as typeof adapter).id).toBe(adapterId);
      expect((afterArgs.ctx as { scope: string }).scope).toBe(scope);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('update pristine+stale: overwrites silently without prompting', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      // Tamper with the manifest's renderHash to simulate a stale install
      const manifestPath = path.join(installPath, '.skill-manifest.json');
      const raw = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(raw);
      manifest.renderHash = `sha256:${'0'.repeat(64)}`;
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      // Re-read records to pick up the tampered manifest
      const updatedRecords = await findExistingInstalls(skill);
      const staleRecord = updatedRecords.find(
        (r) => r.adapter.id === adapterId && r.scope === scope,
      )!;

      const onDrift = vi.fn();
      const result = await applyUpdate(staleRecord, skill, { pkg, isTTY: false, onDrift });

      // Should have overwritten silently without prompting
      expect(result.action).toBe('updated');
      expect(onDrift).not.toHaveBeenCalled();

      // Install should still exist with a fresh manifest
      const freshManifestRaw = await fs.readFile(manifestPath, 'utf8');
      const freshManifest = JSON.parse(freshManifestRaw);
      expect(freshManifest.renderHash).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(freshManifest.renderHash).not.toBe(`sha256:${'0'.repeat(64)}`);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('update drifted + --force: overwrites without backup', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      // Edit a file to make the install drifted
      const skillMdPath = path.join(installPath, 'SKILL.md');
      const original = await fs.readFile(skillMdPath, 'utf8');
      await fs.writeFile(skillMdPath, `${original}\n\n<!-- locally modified -->`, 'utf8');

      const records = await findExistingInstalls(skill);
      const record = records.find((r) => r.adapter.id === adapterId && r.scope === scope)!;

      const result = await applyUpdate(record, skill, { pkg, force: true, isTTY: false });

      expect(result.action).toBe('updated');

      // No backup directory should exist
      const parentDir = path.dirname(installPath);
      const entries = await fs.readdir(parentDir);
      const backups = entries.filter((e) => e.includes('.bak.'));
      expect(backups).toHaveLength(0);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('update drifted without --force (non-TTY): skips and reports the skip', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      // Edit a file to make the install drifted
      const skillMdPath = path.join(installPath, 'SKILL.md');
      const original = await fs.readFile(skillMdPath, 'utf8');
      await fs.writeFile(skillMdPath, `${original}\n\n<!-- locally modified -->`, 'utf8');

      const records = await findExistingInstalls(skill);
      const record = records.find((r) => r.adapter.id === adapterId && r.scope === scope)!;

      const result = await applyUpdate(record, skill, { pkg, force: false, isTTY: false });

      expect(result.action).toBe('drifted_skipped');
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('uninstall: removes installed directory', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      // Confirm it exists before removal
      await expect(fs.stat(installPath)).resolves.toBeDefined();

      await removeInstall(installPath);

      // Directory should no longer exist
      await expect(fs.stat(installPath)).rejects.toThrow();
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('uninstall: findExistingInstalls() returns empty for that adapter/scope', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });
      await removeInstall(installPath);

      const records = await findExistingInstalls(skill);
      const found = records.find((r) => r.adapter.id === adapterId && r.scope === scope);
      expect(found).toBeUndefined();
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('update up-to-date pristine: skips without prompting', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      await performInstall(skill, adapter, scope, { pkg });

      // Records fetched fresh: renderHash correct, install unmodified
      const records = await findExistingInstalls(skill);
      const record = records.find((r) => r.adapter.id === adapterId && r.scope === scope)!;

      const onDrift = vi.fn();
      const result = await applyUpdate(record, skill, { pkg, isTTY: false, onDrift });

      expect(result.action).toBe('skipped');
      expect(onDrift).not.toHaveBeenCalled();
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('update drifted (isTTY, onDrift → skip): skips', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      const skillMdPath = path.join(installPath, 'SKILL.md');
      const original = await fs.readFile(skillMdPath, 'utf8');
      await fs.writeFile(skillMdPath, `${original}\n\n<!-- locally modified -->`, 'utf8');

      const records = await findExistingInstalls(skill);
      const record = records.find((r) => r.adapter.id === adapterId && r.scope === scope)!;

      const result = await applyUpdate(record, skill, {
        pkg,
        isTTY: true,
        onDrift: async () => 'skip',
      });

      expect(result.action).toBe('skipped');
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('update drifted (isTTY, onDrift → backup_and_overwrite): backs up and reinstalls', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      const skillMdPath = path.join(installPath, 'SKILL.md');
      const original = await fs.readFile(skillMdPath, 'utf8');
      await fs.writeFile(skillMdPath, `${original}\n\n<!-- locally modified -->`, 'utf8');

      const records = await findExistingInstalls(skill);
      const record = records.find((r) => r.adapter.id === adapterId && r.scope === scope)!;

      const result = await applyUpdate(record, skill, {
        pkg,
        isTTY: true,
        onDrift: async () => 'backup_and_overwrite',
      });

      expect(result.action).toBe('backed_up_and_updated');
      expect(result.backupPath).toBeDefined();

      // Backup dir exists and contains the drifted file
      const backupStat = await fs.stat(result.backupPath!);
      expect(backupStat.isDirectory()).toBe(true);
      const backupContent = await fs.readFile(path.join(result.backupPath!, 'SKILL.md'), 'utf8');
      expect(backupContent).toContain('locally modified');

      // Fresh install does NOT contain the local edit
      const freshContent = await fs.readFile(
        path.join(result.record.installPath, 'SKILL.md'),
        'utf8',
      );
      expect(freshContent).not.toContain('locally modified');
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('update drifted (isTTY, onDrift → overwrite): overwrites without backup', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get(adapterId)!;
      const pkg = { name: 'test-pkg', version: '1.0.0' };

      const installPath = await performInstall(skill, adapter, scope, { pkg });

      const skillMdPath = path.join(installPath, 'SKILL.md');
      const original = await fs.readFile(skillMdPath, 'utf8');
      await fs.writeFile(skillMdPath, `${original}\n\n<!-- locally modified -->`, 'utf8');

      const records = await findExistingInstalls(skill);
      const record = records.find((r) => r.adapter.id === adapterId && r.scope === scope)!;

      const result = await applyUpdate(record, skill, {
        pkg,
        isTTY: true,
        onDrift: async () => 'overwrite',
      });

      expect(result.action).toBe('updated');
      expect(result.backupPath).toBeUndefined();

      // No .bak. directory created
      const parentDir = path.dirname(installPath);
      const entries = await fs.readdir(parentDir);
      const backups = entries.filter((e) => e.includes('.bak.'));
      expect(backups).toHaveLength(0);
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });
});
