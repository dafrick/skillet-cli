import { describe, expect, it } from 'vitest';
import { deriveOwnerRepo } from '../../src/run.js';

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
