import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { claudeAdapter } from '../../src/adapters/claude.js';
import { codexAdapter } from '../../src/adapters/codex.js';

let tmpHome: string;
let tmpCwd: string;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'skillet-test-home-'));
  tmpCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'skillet-test-cwd-'));
});

afterEach(() => {
  fs.rmSync(tmpHome, { recursive: true, force: true });
  fs.rmSync(tmpCwd, { recursive: true, force: true });
});

const skill = { name: 'my-skill', sourceDir: '/some/source/dir' };

describe('codexAdapter', () => {
  it('has id "codex"', () => {
    expect(codexAdapter.id).toBe('codex');
  });

  it('has label "Codex CLI"', () => {
    expect(codexAdapter.label).toBe('Codex CLI');
  });

  describe('detect()', () => {
    it('returns user scope when ~/.codex/ exists', () => {
      fs.mkdirSync(path.join(tmpHome, '.codex'));
      const result = codexAdapter.detect({ home: tmpHome, cwd: tmpCwd });
      expect(result.scopes).toContain('user');
    });

    it('does not return user scope when ~/.codex/ is absent', () => {
      const result = codexAdapter.detect({ home: tmpHome, cwd: tmpCwd });
      expect(result.scopes).not.toContain('user');
    });

    it('returns project scope when .codex/config.toml exists in cwd', () => {
      fs.mkdirSync(path.join(tmpCwd, '.codex'));
      fs.writeFileSync(path.join(tmpCwd, '.codex', 'config.toml'), '');
      const result = codexAdapter.detect({ home: tmpHome, cwd: tmpCwd });
      expect(result.scopes).toContain('project');
    });

    it('does not return project scope when .codex/config.toml is absent', () => {
      const result = codexAdapter.detect({ home: tmpHome, cwd: tmpCwd });
      expect(result.scopes).not.toContain('project');
    });

    it('does not return project scope when .codex/ dir exists without config.toml', () => {
      fs.mkdirSync(path.join(tmpCwd, '.codex'));
      const result = codexAdapter.detect({ home: tmpHome, cwd: tmpCwd });
      expect(result.scopes).not.toContain('project');
    });

    it('returns both scopes when ~/.codex/ exists and .codex/config.toml exists in cwd', () => {
      fs.mkdirSync(path.join(tmpHome, '.codex'));
      fs.mkdirSync(path.join(tmpCwd, '.codex'));
      fs.writeFileSync(path.join(tmpCwd, '.codex', 'config.toml'), '');
      const result = codexAdapter.detect({ home: tmpHome, cwd: tmpCwd });
      expect(result.scopes).toContain('user');
      expect(result.scopes).toContain('project');
    });

    it('returns empty scopes when neither ~/.codex/ nor .codex/config.toml exists', () => {
      const result = codexAdapter.detect({ home: tmpHome, cwd: tmpCwd });
      expect(result.scopes).toHaveLength(0);
    });
  });

  describe('supportsScope()', () => {
    it('returns true for user scope', () => {
      expect(codexAdapter.supportsScope('user')).toBe(true);
    });

    it('returns true for project scope', () => {
      expect(codexAdapter.supportsScope('project')).toBe(true);
    });
  });

  describe('resolveInstallPath()', () => {
    it('returns ~/.agents/skills/<name> for user scope', () => {
      const ctx = { scope: 'user' as const, home: tmpHome, cwd: tmpCwd };
      expect(codexAdapter.resolveInstallPath(skill, ctx)).toBe(
        path.join(tmpHome, '.agents', 'skills', 'my-skill'),
      );
    });

    it('returns .agents/skills/<name> in cwd for project scope', () => {
      const ctx = { scope: 'project' as const, home: tmpHome, cwd: tmpCwd };
      expect(codexAdapter.resolveInstallPath(skill, ctx)).toBe(
        path.join(tmpCwd, '.agents', 'skills', 'my-skill'),
      );
    });
  });

  describe('render()', () => {
    it('is a passthrough — returns skill.sourceDir unchanged', () => {
      const ctx = { scope: 'user' as const, home: tmpHome, cwd: tmpCwd };
      expect(codexAdapter.render(skill, ctx)).toBe(skill.sourceDir);
    });
  });

  describe('installNote()', () => {
    it('returns a non-empty string mentioning ~/.agents/skills/ for user scope', () => {
      const note = codexAdapter.installNote?.('user');
      expect(note).toBeTruthy();
      expect(note).toContain('~/.agents/skills/');
    });

    it('mentions generic agents environment in user-scope note', () => {
      const note = codexAdapter.installNote?.('user');
      expect(note).toMatch(/generic agents/i);
    });

    it('returns undefined for project scope', () => {
      expect(codexAdapter.installNote?.('project')).toBeUndefined();
    });
  });
});

describe('claudeAdapter', () => {
  it('does not implement installNote (is undefined)', () => {
    expect(claudeAdapter.installNote).toBeUndefined();
  });
});
