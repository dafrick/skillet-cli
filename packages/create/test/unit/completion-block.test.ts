import { describe, expect, it } from 'vitest';
import { buildExpansionGuidance, deriveOwnerRepo } from '../../src/run.js';

describe('buildExpansionGuidance', () => {
  it('describes adding a new top-level content directory via npm pkg set files[N]', () => {
    const guidance = buildExpansionGuidance();
    expect(guidance).toContain('npm pkg set files[');
  });

  it('caveats that the correct files[] index depends on the current files array length', () => {
    const guidance = buildExpansionGuidance();
    expect(guidance.toLowerCase()).toContain('files');
    expect(guidance.toLowerCase()).toContain('check');
  });

  it('describes simple content updates as bump version + npm publish, no re-scaffold', () => {
    const guidance = buildExpansionGuidance();
    expect(guidance.toLowerCase()).toContain('bump');
    expect(guidance).toContain('npm publish');
  });

  it('describes structural changes as re-running create-skillet', () => {
    const guidance = buildExpansionGuidance();
    expect(guidance).toContain('create-skillet');
  });

  it('warns that re-running resets name, version, description, and author', () => {
    const guidance = buildExpansionGuidance();
    expect(guidance.toLowerCase()).toContain('reset');
    expect(guidance).toContain('name');
    expect(guidance).toContain('version');
    expect(guidance).toContain('description');
    expect(guidance).toContain('author');
  });

  it('references create-skillet check for verifying the tarball before publishing', () => {
    const guidance = buildExpansionGuidance();
    expect(guidance).toContain('create-skillet check');
  });
});

describe('deriveOwnerRepo', () => {
  it('parses https URL with .git suffix', () => {
    expect(deriveOwnerRepo('https://github.com/owner/my-skill.git')).toBe('owner/my-skill');
  });
  it('parses git+https URL with .git suffix', () => {
    expect(deriveOwnerRepo('git+https://github.com/owner/my-skill.git')).toBe('owner/my-skill');
  });
  it('parses https URL without .git suffix', () => {
    expect(deriveOwnerRepo('https://github.com/owner/my-skill')).toBe('owner/my-skill');
  });
  it('returns null for empty string', () => {
    expect(deriveOwnerRepo('')).toBeNull();
  });
  it('returns null for invalid URL', () => {
    expect(deriveOwnerRepo('not-a-url')).toBeNull();
  });
});
