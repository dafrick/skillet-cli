import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deriveOwnerRepo, printExpansionGuidance } from '../../src/run.js';

describe('printExpansionGuidance', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  const written: string[] = [];

  beforeEach(() => {
    written.length = 0;
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      written.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('prints a "To expand your skill" header', () => {
    printExpansionGuidance();
    const output = written.join('');
    expect(output).toContain('To expand your skill');
  });

  it('includes guidance on adding new directories via npm pkg set', () => {
    printExpansionGuidance();
    const output = written.join('');
    expect(output).toContain('npm pkg set');
    expect(output).toContain('files');
  });

  it('mentions re-running create-skillet for structural changes', () => {
    printExpansionGuidance();
    const output = written.join('');
    expect(output).toContain('create-skillet');
  });

  it('mentions create-skillet check for verifying the tarball', () => {
    printExpansionGuidance();
    const output = written.join('');
    expect(output).toContain('create-skillet check');
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
