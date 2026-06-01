import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { discoverSkillTrees, readPackageName, readSkilletMarker } from '../../src/marker.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function makeTmpDir(): Promise<string> {
  return fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'skillet-marker-test-')));
}

async function writePackageJson(dir: string, content: unknown): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(content, null, 2), 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// readSkilletMarker
// ─────────────────────────────────────────────────────────────────────────────

describe('readSkilletMarker', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('skillet.skills is a string → skillsDirs is [value]', async () => {
    await writePackageJson(tmpDir, { name: 'test-pkg', skillet: { skills: 'my-skills' } });
    const result = await readSkilletMarker(tmpDir);
    expect(result).not.toBeNull();
    expect(result?.skillsDirs).toEqual(['my-skills']);
  });

  it('skillet.skills is a string[] → skillsDirs is that array', async () => {
    await writePackageJson(tmpDir, { name: 'test-pkg', skillet: { skills: ['a', 'b', 'c'] } });
    const result = await readSkilletMarker(tmpDir);
    expect(result).not.toBeNull();
    expect(result?.skillsDirs).toEqual(['a', 'b', 'c']);
  });

  it('skillet key absent → returns null', async () => {
    await writePackageJson(tmpDir, { name: 'test-pkg' });
    const result = await readSkilletMarker(tmpDir);
    expect(result).toBeNull();
  });

  it('skillet key present, skills sub-key absent → skillsDirs is ["skills"]', async () => {
    await writePackageJson(tmpDir, { name: 'test-pkg', skillet: {} });
    const result = await readSkilletMarker(tmpDir);
    expect(result).not.toBeNull();
    expect(result?.skillsDirs).toEqual(['skills']);
  });

  it('extra unknown fields in skillet are ignored (no error)', async () => {
    await writePackageJson(tmpDir, {
      name: 'test-pkg',
      skillet: { skills: 'my-skills', unknownField: 'ignored', another: 42 },
    });
    const result = await readSkilletMarker(tmpDir);
    expect(result).not.toBeNull();
    expect(result?.skillsDirs).toEqual(['my-skills']);
  });

  it('skillet.skills is a number → warns, returns skillsDirs: ["skills"]', async () => {
    await writePackageJson(tmpDir, { name: 'test-pkg', skillet: { skills: 42 } });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = await readSkilletMarker(tmpDir);
      expect(result).not.toBeNull();
      expect(result?.skillsDirs).toEqual(['skills']);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('skillet.skills is null → warns, returns skillsDirs: ["skills"]', async () => {
    await writePackageJson(tmpDir, { name: 'test-pkg', skillet: { skills: null } });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = await readSkilletMarker(tmpDir);
      expect(result).not.toBeNull();
      expect(result?.skillsDirs).toEqual(['skills']);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('skillet.skills is {} (object) → warns, returns skillsDirs: ["skills"]', async () => {
    await writePackageJson(tmpDir, { name: 'test-pkg', skillet: { skills: {} } });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = await readSkilletMarker(tmpDir);
      expect(result).not.toBeNull();
      expect(result?.skillsDirs).toEqual(['skills']);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('skillet key present but value is not an object (e.g. true) → returns skillsDirs: ["skills"]', async () => {
    await writePackageJson(tmpDir, { name: 'test-pkg', skillet: true });
    const result = await readSkilletMarker(tmpDir);
    expect(result).not.toBeNull();
    expect(result?.skillsDirs).toEqual(['skills']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// discoverSkillTrees
// ─────────────────────────────────────────────────────────────────────────────

describe('discoverSkillTrees', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('directory with 3 subdirs each containing SKILL.md → returns 3 paths', async () => {
    for (const name of ['skill-a', 'skill-b', 'skill-c']) {
      const subdir = path.join(tmpDir, name);
      await fs.mkdir(subdir, { recursive: true });
      await fs.writeFile(path.join(subdir, 'SKILL.md'), `---\nname: ${name}\n---\n`, 'utf8');
    }

    const result = await discoverSkillTrees(tmpDir);
    expect(result).toHaveLength(3);
    expect(result).toContain(path.join(tmpDir, 'skill-a'));
    expect(result).toContain(path.join(tmpDir, 'skill-b'));
    expect(result).toContain(path.join(tmpDir, 'skill-c'));
  });

  it('subdir without SKILL.md is not returned', async () => {
    const withSkill = path.join(tmpDir, 'with-skill');
    await fs.mkdir(withSkill, { recursive: true });
    await fs.writeFile(path.join(withSkill, 'SKILL.md'), '---\nname: s\n---\n', 'utf8');

    const withoutSkill = path.join(tmpDir, 'without-skill');
    await fs.mkdir(withoutSkill, { recursive: true });
    // No SKILL.md here

    const result = await discoverSkillTrees(tmpDir);
    expect(result).toEqual([withSkill]);
  });

  it('empty directory → returns []', async () => {
    const result = await discoverSkillTrees(tmpDir);
    expect(result).toEqual([]);
  });

  it('non-existent directory → warns, returns []', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const nonExistentDir = path.join(tmpDir, 'does-not-exist');
      const result = await discoverSkillTrees(nonExistentDir);
      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('works correctly called once per entry in a multi-entry skillsDirs list (call twice, union)', async () => {
    const dir1 = path.join(tmpDir, 'dir1');
    const dir2 = path.join(tmpDir, 'dir2');
    await fs.mkdir(dir1, { recursive: true });
    await fs.mkdir(dir2, { recursive: true });

    const skill1 = path.join(dir1, 'skill-1');
    const skill2 = path.join(dir2, 'skill-2');
    await fs.mkdir(skill1, { recursive: true });
    await fs.mkdir(skill2, { recursive: true });
    await fs.writeFile(path.join(skill1, 'SKILL.md'), '---\nname: s1\n---\n', 'utf8');
    await fs.writeFile(path.join(skill2, 'SKILL.md'), '---\nname: s2\n---\n', 'utf8');

    const results1 = await discoverSkillTrees(dir1);
    const results2 = await discoverSkillTrees(dir2);
    const union = [...results1, ...results2];

    expect(union).toHaveLength(2);
    expect(union).toContain(skill1);
    expect(union).toContain(skill2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// readPackageName
// ─────────────────────────────────────────────────────────────────────────────

describe('readPackageName', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('name field present → returns it', async () => {
    await writePackageJson(tmpDir, { name: 'my-awesome-package', version: '1.0.0' });
    const result = await readPackageName(tmpDir);
    expect(result).toBe('my-awesome-package');
  });

  it('name field absent → warns, returns basename of the directory path', async () => {
    await writePackageJson(tmpDir, { version: '1.0.0' });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = await readPackageName(tmpDir);
      expect(result).toBe(path.basename(tmpDir));
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
