import { describe, expect, it } from 'vitest';
import { lintSkillFrontmatter } from '../../src/lint.js';

describe('lintSkillFrontmatter', () => {
  it('returns true for content starting with ---\\n', () => {
    const content = '---\nname: my-skill\ndescription: A skill\n---\n\nBody here.\n';
    expect(lintSkillFrontmatter(content)).toBe(true);
  });

  it('returns true for content starting with ---\\r\\n (CRLF)', () => {
    const content = '---\r\nname: my-skill\r\ndescription: A skill\r\n---\r\n\r\nBody here.\r\n';
    expect(lintSkillFrontmatter(content)).toBe(true);
  });

  it('returns false for content with a leading blank line before ---', () => {
    const content = '\n---\nname: my-skill\ndescription: A skill\n---\n\nBody.\n';
    expect(lintSkillFrontmatter(content)).toBe(false);
  });

  it('returns false for content with an H1 title before ---', () => {
    const content = '# My Skill\n---\nname: my-skill\ndescription: A skill\n---\n\nBody.\n';
    expect(lintSkillFrontmatter(content)).toBe(false);
  });

  it('returns false for content with no frontmatter delimiter at all', () => {
    const content = 'name: my-skill\ndescription: A skill\n\nBody.\n';
    expect(lintSkillFrontmatter(content)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(lintSkillFrontmatter('')).toBe(false);
  });
});

describe('lintSkillFrontmatter — public surface', () => {
  it('is importable from @skillet-cli/core', async () => {
    const core = await import('@skillet-cli/core');
    expect(typeof core.lintSkillFrontmatter).toBe('function');
  });
});
