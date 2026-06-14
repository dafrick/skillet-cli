import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { copyTree } from '../../src/install.js';

let srcDir: string;
let dstDir: string;

beforeEach(async () => {
  srcDir = await mkdtemp(path.join(os.tmpdir(), 'skillet-copy-tree-src-'));
  dstDir = await mkdtemp(path.join(os.tmpdir(), 'skillet-copy-tree-dst-'));
});

afterEach(async () => {
  await rm(srcDir, { recursive: true, force: true });
  await rm(dstDir, { recursive: true, force: true });
});

/** Write a file relative to a base dir, creating parent dirs as needed. */
async function write(base: string, relPath: string, content: string): Promise<void> {
  const abs = path.join(base, relPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content);
}

describe('copyTree', () => {
  it('excludes .git, node_modules, .DS_Store, and .skill-manifest.json from the copy', async () => {
    // Set up source tree with ignored paths
    await write(srcDir, 'SKILL.md', '# My Skill');
    await write(srcDir, '.git/HEAD', 'ref: refs/heads/main');
    await write(srcDir, 'node_modules/some-pkg/index.js', 'module.exports = {}');
    await write(srcDir, '.DS_Store', 'mac junk');
    await write(srcDir, '.skill-manifest.json', JSON.stringify({ name: 'test' }));

    await copyTree(srcDir, dstDir);

    // Normal file should be present
    await expect(stat(path.join(dstDir, 'SKILL.md'))).resolves.toBeTruthy();

    // Ignored entries should NOT be present
    await expect(stat(path.join(dstDir, '.git'))).rejects.toThrow();
    await expect(stat(path.join(dstDir, 'node_modules'))).rejects.toThrow();
    await expect(stat(path.join(dstDir, '.DS_Store'))).rejects.toThrow();
    await expect(stat(path.join(dstDir, '.skill-manifest.json'))).rejects.toThrow();
  });

  it('copies non-ignored files preserving relative paths', async () => {
    await write(srcDir, 'subdir/nested.ts', 'export const x = 1;');
    await write(srcDir, 'README.md', '# README');
    await write(srcDir, 'config.json', '{}');

    await copyTree(srcDir, dstDir);

    await expect(stat(path.join(dstDir, 'subdir', 'nested.ts'))).resolves.toBeTruthy();
    await expect(stat(path.join(dstDir, 'README.md'))).resolves.toBeTruthy();
    await expect(stat(path.join(dstDir, 'config.json'))).resolves.toBeTruthy();
  });
});
