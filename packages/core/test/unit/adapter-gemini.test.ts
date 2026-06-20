import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { geminiAdapter } from '../../src/adapters/gemini.js';

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

describe('geminiAdapter', () => {
  it('has id "gemini"', () => {
    expect(geminiAdapter.id).toBe('gemini');
  });

  it('has label "Gemini CLI"', () => {
    expect(geminiAdapter.label).toBe('Gemini CLI');
  });

  it('detect() returns user scope when ~/.gemini/ exists', () => {
    fs.mkdirSync(path.join(tmpHome, '.gemini'));
    const result = geminiAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toContain('user');
  });

  it('detect() returns project scope when .gemini/ exists in cwd', () => {
    fs.mkdirSync(path.join(tmpCwd, '.gemini'));
    const result = geminiAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toContain('project');
  });

  it('detect() can return both scopes when both directories exist', () => {
    fs.mkdirSync(path.join(tmpHome, '.gemini'));
    fs.mkdirSync(path.join(tmpCwd, '.gemini'));
    const result = geminiAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toContain('user');
    expect(result.scopes).toContain('project');
  });

  it('detect() does not return user scope when only .gemini/ exists in cwd', () => {
    fs.mkdirSync(path.join(tmpCwd, '.gemini'));
    const result = geminiAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).not.toContain('user');
    expect(result.scopes).toContain('project');
  });

  it('detect() returns empty scopes when neither directory exists', () => {
    const result = geminiAdapter.detect({ home: tmpHome, cwd: tmpCwd });
    expect(result.scopes).toHaveLength(0);
  });

  it('supportsScope() returns true for user scope', () => {
    expect(geminiAdapter.supportsScope('user')).toBe(true);
  });

  it('supportsScope() returns true for project scope', () => {
    expect(geminiAdapter.supportsScope('project')).toBe(true);
  });

  it('resolveInstallPath() returns correct path for user scope', () => {
    const ctx = { scope: 'user' as const, home: tmpHome, cwd: tmpCwd };
    const result = geminiAdapter.resolveInstallPath(skill, ctx);
    expect(result).toBe(path.join(tmpHome, '.gemini', 'skills', 'my-skill'));
  });

  it('resolveInstallPath() returns correct path for project scope', () => {
    const ctx = { scope: 'project' as const, home: tmpHome, cwd: tmpCwd };
    const result = geminiAdapter.resolveInstallPath(skill, ctx);
    expect(result).toBe(path.join(tmpCwd, '.gemini', 'skills', 'my-skill'));
  });

  it('render() is passthrough', () => {
    const ctx = { scope: 'user' as const, home: tmpHome, cwd: tmpCwd };
    expect(geminiAdapter.render(skill, ctx)).toBe(skill.sourceDir);
  });
});
