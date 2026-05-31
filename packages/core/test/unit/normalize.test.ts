import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normalizeSkill } from '../../src/normalize.js';

const helloSkillDir = fileURLToPath(new URL('../../fixtures/hello-skill', import.meta.url));

describe('normalizeSkill', () => {
  it('valid SKILL.md is parsed correctly', async () => {
    const result = await normalizeSkill(helloSkillDir);

    expect(result.name).toBe('hello-skill');
    expect(result.description).toBe('A minimal fixture skill for testing');
    expect(result.body).toContain('Hello Skill');
    expect(path.isAbsolute(result.sourceDir)).toBe(true);
    expect(result.sourceDir).toBe(path.resolve(helloSkillDir));
    expect(result.contentHash).toMatch(/^sha256:/);
  });

  it('missing name throws a descriptive error', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'skillet-test-'));
    await writeFile(
      path.join(tmpDir, 'SKILL.md'),
      '---\ndescription: A skill without a name\n---\n\nBody content.\n',
    );

    await expect(normalizeSkill(tmpDir)).rejects.toThrow('name');
  });

  it('missing description throws a descriptive error', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'skillet-test-'));
    await writeFile(path.join(tmpDir, 'SKILL.md'), '---\nname: my-skill\n---\n\nBody content.\n');

    await expect(normalizeSkill(tmpDir)).rejects.toThrow('description');
  });

  it('missing SKILL.md throws a descriptive error with the path', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'skillet-test-'));

    await expect(normalizeSkill(tmpDir)).rejects.toThrow(tmpDir);
  });

  it('optional version field is passed through when present', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'skillet-test-'));
    await writeFile(
      path.join(tmpDir, 'SKILL.md'),
      '---\nname: versioned-skill\ndescription: A skill with a version\nversion: 1.2.3\n---\n\nBody.\n',
    );

    const result = await normalizeSkill(tmpDir);

    expect(result.declaredVersion).toBe('1.2.3');
    expect(result.frontmatter.version).toBe('1.2.3');
  });

  it('arbitrary extra frontmatter fields are passed through', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'skillet-test-'));
    await writeFile(
      path.join(tmpDir, 'SKILL.md'),
      '---\nname: rich-skill\ndescription: A skill with extras\nauthor: test-author\ntags:\n  - foo\n  - bar\n---\n\nBody.\n',
    );

    const result = await normalizeSkill(tmpDir);

    expect(result.frontmatter.author).toBe('test-author');
    expect(result.frontmatter.tags).toEqual(['foo', 'bar']);
  });

  it('relative path input is resolved to absolute sourceDir', async () => {
    const result = await normalizeSkill(helloSkillDir);

    expect(path.isAbsolute(result.sourceDir)).toBe(true);
  });

  it('contentHash is present on the returned object and starts with sha256:', async () => {
    const result = await normalizeSkill(helloSkillDir);

    expect(result.contentHash).toBeDefined();
    expect(result.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('contentHash changes when a file in the skill directory is edited', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'skillet-test-'));
    await writeFile(
      path.join(tmpDir, 'SKILL.md'),
      '---\nname: mutable-skill\ndescription: A skill whose content will change\n---\n\nOriginal body.\n',
    );

    const result1 = await normalizeSkill(tmpDir);

    // Modify the file
    await writeFile(
      path.join(tmpDir, 'SKILL.md'),
      '---\nname: mutable-skill\ndescription: A skill whose content will change\n---\n\nModified body.\n',
    );

    const result2 = await normalizeSkill(tmpDir);

    expect(result1.contentHash).not.toBe(result2.contentHash);
    expect(result1.contentHash).toMatch(/^sha256:/);
    expect(result2.contentHash).toMatch(/^sha256:/);
  });
});
