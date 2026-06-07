import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { agentsAdapter } from '../../src/adapters/agents.js';

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

describe('agentsAdapter', () => {
  it('detect() returns only user scope when ~/.agents/ exists', () => {
    fs.mkdirSync(path.join(tmpHome, '.agents'));
    const result = agentsAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toEqual(['user']);
  });

  it('detect() returns only project scope when .agents/ exists in cwd', () => {
    fs.mkdirSync(path.join(tmpCwd, '.agents'));
    const result = agentsAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toEqual(['project']);
  });

  it('detect() can return both scopes when both directories exist', () => {
    fs.mkdirSync(path.join(tmpHome, '.agents'));
    fs.mkdirSync(path.join(tmpCwd, '.agents'));
    const result = agentsAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toContain('user');
    expect(result.scopes).toContain('project');
  });

  it('detect() returns empty scopes when neither directory exists', () => {
    const result = agentsAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toHaveLength(0);
  });

  it('supportsScope() returns true for user scope', () => {
    expect(agentsAdapter.supportsScope('user')).toBe(true);
  });

  it('supportsScope() returns true for project scope', () => {
    expect(agentsAdapter.supportsScope('project')).toBe(true);
  });

  it('resolveInstallPath() returns ~/.agents/skills/<name>/ for user scope', () => {
    const ctx = { scope: 'user' as const, home: tmpHome, cwd: tmpCwd };
    const result = agentsAdapter.resolveInstallPath(skill, ctx);
    expect(result).toBe(path.join(tmpHome, '.agents', 'skills', 'my-skill'));
  });

  it('resolveInstallPath() returns .agents/skills/<name>/ for project scope', () => {
    const ctx = { scope: 'project' as const, home: tmpHome, cwd: tmpCwd };
    const result = agentsAdapter.resolveInstallPath(skill, ctx);
    expect(result).toBe(path.join(tmpCwd, '.agents', 'skills', 'my-skill'));
  });

  it('render() is passthrough', () => {
    const ctx = { scope: 'user' as const, home: tmpHome, cwd: tmpCwd };
    expect(agentsAdapter.render(skill, ctx)).toBe(skill.sourceDir);
  });
});
