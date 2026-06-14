import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import * as nodePath from 'node:path';

export const DEFAULT_IGNORE = new Set([
  '.git',
  'node_modules',
  '.DS_Store',
  '.skill-manifest.json',
]);

/**
 * Recursively collect all file paths under `dir`, returning paths relative to
 * `rootDir` (POSIX-normalised). Entries whose name matches any segment in
 * `ignoreSet` are skipped entirely (files and directories).
 */
async function collectFiles(
  dir: string,
  rootDir: string,
  ignoreSet: Set<string>,
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    if (ignoreSet.has(entry.name)) continue;

    const absPath = nodePath.join(dir, entry.name);
    const relPath = nodePath.relative(rootDir, absPath).split(nodePath.sep).join('/');

    // Also skip if any path segment matches the ignore set
    const segments = relPath.split('/');
    if (segments.some((s) => ignoreSet.has(s))) continue;

    if (entry.isDirectory()) {
      const children = await collectFiles(absPath, rootDir, ignoreSet);
      results.push(...children);
    } else if (entry.isFile()) {
      results.push(relPath);
    }
  }

  return results;
}

/**
 * Hash the contents of a skill directory using SHA-256.
 *
 * Algorithm (frozen — spec contract):
 * 1. List all files recursively, ignoring default + custom ignore sets.
 * 2. Sort by relative POSIX path.
 * 3. Feed each file into the hash: relPath bytes + NUL, content bytes + NUL.
 *    Text files (no 0x00 byte) have \r\n normalised to \n before hashing.
 * 4. Return "sha256:" + lowercase hex digest.
 */
export async function hashSkill(skillDir: string, opts?: { ignore?: string[] }): Promise<string> {
  const ignoreSet = new Set(DEFAULT_IGNORE);
  if (opts?.ignore) {
    for (const entry of opts.ignore) {
      ignoreSet.add(entry);
    }
  }

  const files = await collectFiles(skillDir, skillDir, ignoreSet);

  // Sort by relative POSIX path (already normalised)
  files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const hash = createHash('sha256');

  for (const relPath of files) {
    const absPath = nodePath.join(skillDir, relPath.split('/').join(nodePath.sep));
    let content = await readFile(absPath);

    // Detect binary: any 0x00 byte → binary
    const isBinary = content.includes(0x00);

    if (!isBinary) {
      // Text normalisation: \r\n → \n
      const normalised = content.toString('binary').replace(/\r\n/g, '\n');
      content = Buffer.from(normalised, 'binary');
    }

    hash.update(Buffer.from(relPath, 'utf8'));
    hash.update(Buffer.from([0x00]));
    hash.update(content);
    hash.update(Buffer.from([0x00]));
  }

  return `sha256:${hash.digest('hex')}`;
}
