import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { copilotAdapter } from '../../src/adapters/copilot.js';

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

describe('copilotAdapter', () => {
  it('detect() returns project scope when .github/ exists in cwd', () => {
    fs.mkdirSync(path.join(tmpCwd, '.github'));
    const result = copilotAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toContain('project');
  });

  it('detect() returns user scope when ~/.copilot/ exists', () => {
    fs.mkdirSync(path.join(tmpHome, '.copilot'));
    const result = copilotAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toContain('user');
  });

  it('detect() can return both scopes when both directories exist', () => {
    fs.mkdirSync(path.join(tmpHome, '.copilot'));
    fs.mkdirSync(path.join(tmpCwd, '.github'));
    const result = copilotAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toContain('user');
    expect(result.scopes).toContain('project');
  });

  it('detect() returns empty scopes when neither directory exists', () => {
    const result = copilotAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toHaveLength(0);
  });

  it('supportsScope("user") returns true', () => {
    expect(copilotAdapter.supportsScope('user')).toBe(true);
  });

  it('supportsScope("project") returns true', () => {
    expect(copilotAdapter.supportsScope('project')).toBe(true);
  });

  it('resolveInstallPath("project") returns .github/skills/<name>/ in cwd', () => {
    const ctx = { scope: 'project' as const, home: tmpHome, cwd: tmpCwd };
    const result = copilotAdapter.resolveInstallPath(skill, ctx);
    expect(result).toBe(path.join(tmpCwd, '.github', 'skills', 'my-skill'));
  });

  it('resolveInstallPath("user") returns ~/.copilot/skills/<name>/', () => {
    const ctx = { scope: 'user' as const, home: tmpHome, cwd: tmpCwd };
    const result = copilotAdapter.resolveInstallPath(skill, ctx);
    expect(result).toBe(path.join(tmpHome, '.copilot', 'skills', 'my-skill'));
  });

  it('render() is passthrough', () => {
    const ctx = { scope: 'user' as const, home: tmpHome, cwd: tmpCwd };
    expect(copilotAdapter.render(skill, ctx)).toBe(skill.sourceDir);
  });
});
