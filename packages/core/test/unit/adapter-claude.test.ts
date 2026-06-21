import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { claudeAdapter } from '../../src/adapters/claude.js';

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

const skill = {
  name: 'my-skill',
  sourceDir: '/some/source/dir',
  description: 'test skill',
  declaredVersion: undefined,
  frontmatter: {},
  body: '',
  contentHash: 'sha256:abc',
};

describe('claudeAdapter', () => {
  it('detect() returns user scope when ~/.claude/ exists', () => {
    fs.mkdirSync(path.join(tmpHome, '.claude'));
    const result = claudeAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toContain('user');
  });

  it('detect() returns project scope when .claude/ exists in cwd', () => {
    fs.mkdirSync(path.join(tmpCwd, '.claude'));
    const result = claudeAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toContain('project');
  });

  it('detect() can return both scopes when both directories exist', () => {
    fs.mkdirSync(path.join(tmpHome, '.claude'));
    fs.mkdirSync(path.join(tmpCwd, '.claude'));
    const result = claudeAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toContain('user');
    expect(result.scopes).toContain('project');
  });

  it('detect() returns empty scopes when neither directory exists', () => {
    const result = claudeAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toHaveLength(0);
  });

  it('supportsScope() returns true for user scope', () => {
    expect(claudeAdapter.supportsScope('user')).toBe(true);
  });

  it('supportsScope() returns true for project scope', () => {
    expect(claudeAdapter.supportsScope('project')).toBe(true);
  });

  it('resolveInstallPath() returns correct path for user scope', () => {
    const ctx = { scope: 'user' as const, home: tmpHome, cwd: tmpCwd };
    const result = claudeAdapter.resolveInstallPath(skill, ctx);
    expect(result).toBe(path.join(tmpHome, '.claude', 'skills', 'my-skill'));
  });

  it('resolveInstallPath() returns correct path for project scope', () => {
    const ctx = { scope: 'project' as const, home: tmpHome, cwd: tmpCwd };
    const result = claudeAdapter.resolveInstallPath(skill, ctx);
    expect(result).toBe(path.join(tmpCwd, '.claude', 'skills', 'my-skill'));
  });

  it('render() is passthrough', () => {
    const ctx = { scope: 'user' as const, home: tmpHome, cwd: tmpCwd };
    expect(claudeAdapter.render(skill, ctx)).toBe(skill.sourceDir);
  });
});
