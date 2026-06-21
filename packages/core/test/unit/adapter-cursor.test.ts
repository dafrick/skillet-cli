import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { claudeAdapter } from '../../src/adapters/claude.js';
import { cursorAdapter } from '../../src/adapters/cursor.js';

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
  description: 'TDD workflow',
  body: '## Steps\n...',
  declaredVersion: undefined,
  frontmatter: {},
  contentHash: 'sha256:abc',
};

describe('cursorAdapter', () => {
  it('has id "cursor"', () => {
    expect(cursorAdapter.id).toBe('cursor');
  });

  it('has label "Cursor"', () => {
    expect(cursorAdapter.label).toBe('Cursor');
  });

  describe('detect()', () => {
    it('returns project scope when .cursor exists in cwd', () => {
      fs.mkdirSync(path.join(tmpCwd, '.cursor'));
      const result = cursorAdapter.detect({ home: tmpHome, cwd: tmpCwd });
      expect(result.scopes).toContain('project');
    });

    it('does not return project scope when .cursor is absent from cwd', () => {
      const result = cursorAdapter.detect({ home: tmpHome, cwd: tmpCwd });
      expect(result.scopes).not.toContain('project');
    });

    it('never returns user scope', () => {
      fs.mkdirSync(path.join(tmpCwd, '.cursor'));
      const result = cursorAdapter.detect({ home: tmpHome, cwd: tmpCwd });
      expect(result.scopes).not.toContain('user');
    });
  });

  describe('supportsScope()', () => {
    it('returns false for user scope', () => {
      expect(cursorAdapter.supportsScope('user')).toBe(false);
    });

    it('returns true for project scope', () => {
      expect(cursorAdapter.supportsScope('project')).toBe(true);
    });
  });

  describe('resolveInstallPath()', () => {
    it('returns <cwd>/.cursor/rules/<name> for project scope', () => {
      const ctx = { scope: 'project' as const, home: tmpHome, cwd: tmpCwd };
      expect(cursorAdapter.resolveInstallPath(skill, ctx)).toBe(
        path.join(tmpCwd, '.cursor', 'rules', 'my-skill'),
      );
    });
  });

  describe('renderFile()', () => {
    it('resolves to a string starting with the expected frontmatter followed by skill.body', async () => {
      const ctx = { scope: 'project' as const, home: tmpHome, cwd: tmpCwd };
      const result = await cursorAdapter.renderFile!(skill, ctx);
      expect(result).toBe(`---\ndescription: TDD workflow\nalwaysApply: false\n---\n## Steps\n...`);
    });

    it('description in frontmatter equals skill.description', async () => {
      const ctx = { scope: 'project' as const, home: tmpHome, cwd: tmpCwd };
      const result = await cursorAdapter.renderFile!(skill, ctx);
      expect(result).toContain('description: TDD workflow');
    });

    it('is a function (renderFile is defined)', () => {
      expect(typeof cursorAdapter.renderFile).toBe('function');
    });
  });
});

describe('claudeAdapter', () => {
  it('renderFile is undefined', () => {
    expect(claudeAdapter.renderFile).toBeUndefined();
  });
});
