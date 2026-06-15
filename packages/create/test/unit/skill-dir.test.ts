import { describe, expect, it } from 'vitest';
import { getPreselected } from '../../src/skill-dir.js';

describe('getPreselected — pre-selection logic', () => {
  it('always pre-selects SKILL.md', () => {
    const items = ['SKILL.md', 'README.md', '.gitignore'];
    const selected = getPreselected(items);
    expect(selected).toContain('SKILL.md');
  });

  it('pre-selects resources/ folder', () => {
    const items = ['SKILL.md', 'resources/', 'README.md', '.gitignore', 'package.json'];
    const selected = getPreselected(items);
    expect(selected).toContain('SKILL.md');
    expect(selected).toContain('resources/');
  });

  it('pre-selects assets/ folder', () => {
    const items = ['SKILL.md', 'assets/', 'README.md'];
    const selected = getPreselected(items);
    expect(selected).toContain('assets/');
  });

  it('pre-selects templates/ folder', () => {
    const items = ['SKILL.md', 'templates/', 'README.md'];
    const selected = getPreselected(items);
    expect(selected).toContain('templates/');
  });

  it('does NOT pre-select README.md', () => {
    const items = ['SKILL.md', 'README.md', 'resources/'];
    const selected = getPreselected(items);
    expect(selected).not.toContain('README.md');
  });

  it('does NOT pre-select dotfiles', () => {
    const items = ['SKILL.md', '.gitignore', '.env'];
    const selected = getPreselected(items);
    expect(selected).not.toContain('.gitignore');
    expect(selected).not.toContain('.env');
  });

  it('does NOT pre-select lock files', () => {
    const items = ['SKILL.md', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
    const selected = getPreselected(items);
    expect(selected).not.toContain('package-lock.json');
    expect(selected).not.toContain('pnpm-lock.yaml');
    expect(selected).not.toContain('yarn.lock');
  });

  it('does NOT pre-select dot-folders', () => {
    const items = ['SKILL.md', '.github/', '.vscode/'];
    const selected = getPreselected(items);
    expect(selected).not.toContain('.github/');
    expect(selected).not.toContain('.vscode/');
  });

  it('standard case (≤12 items): returns SKILL.md + skill-related dirs', () => {
    const items = ['SKILL.md', 'resources/', 'README.md', '.gitignore', 'package.json'];
    const selected = getPreselected(items);
    expect(selected).toContain('SKILL.md');
    expect(selected).toContain('resources/');
    expect(selected).not.toContain('README.md');
    expect(selected).not.toContain('.gitignore');
    expect(selected).not.toContain('package.json');
  });

  it('does not include items not in the original list', () => {
    const items = ['SKILL.md', 'README.md'];
    const selected = getPreselected(items);
    expect(selected.every((s) => items.includes(s))).toBe(true);
  });

  it('pre-selects scripts/ folder (companion directory, not on blocklist)', () => {
    const items = ['SKILL.md', 'scripts/', 'package.json', 'README.md'];
    const selected = getPreselected(items);
    expect(selected).toContain('scripts/');
  });

  it('does NOT pre-select package.json (blocklist item)', () => {
    const items = ['SKILL.md', 'scripts/', 'package.json'];
    const selected = getPreselected(items);
    expect(selected).not.toContain('package.json');
  });

  it('does NOT pre-select node_modules/ (blocklist item)', () => {
    const items = ['SKILL.md', 'scripts/', 'node_modules/'];
    const selected = getPreselected(items);
    expect(selected).not.toContain('node_modules/');
  });

  it('does NOT pre-select bin/ (blocklist item)', () => {
    const items = ['SKILL.md', 'scripts/', 'bin/'];
    const selected = getPreselected(items);
    expect(selected).not.toContain('bin/');
  });
});
