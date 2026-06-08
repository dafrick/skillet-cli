import type { Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SkilletPackageJson } from './types.js';

export interface SkilletMarker {
  /**
   * Parent directories to scan for skill trees (subdirectories containing SKILL.md).
   * Empty (`[]`) when `directSkillDir` is set — use `directSkillDir` in that case.
   */
  skillsDirs: string[];
  /**
   * When `skillet.skillDir` is present in package.json, this is the resolved
   * absolute path to the skill directory itself (the directory containing SKILL.md
   * directly, not a parent to scan). When set, it takes precedence over
   * `skillsDirs` and subdirectory discovery is skipped.
   */
  directSkillDir?: string;
}

/**
 * Reads `<packageRoot>/package.json` and returns a `SkilletMarker` if the
 * `skillet` key is present, or `null` if it is absent.
 *
 * When `skillet.skillDir` is present, it is resolved to an absolute path and
 * returned as `directSkillDir` (with `skillsDirs: []`). It takes precedence
 * over `skillet.skills`.
 *
 * Otherwise normalises the `skills` sub-key:
 *   - string        → `[value]`
 *   - string[]      → as-is
 *   - absent        → `["skills"]`
 *   - invalid type  → `console.warn(...)` then `["skills"]`
 */
export async function readSkilletMarker(packageRoot: string): Promise<SkilletMarker | null> {
  const pkgPath = path.join(packageRoot, 'package.json');
  const raw = await fs.readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(raw) as Record<string, unknown>;

  if (!('skillet' in pkg)) {
    return null;
  }

  const skillet = pkg.skillet;
  // skillet key must be an object (but can be empty)
  const skilletObj: SkilletPackageJson =
    skillet !== null && typeof skillet === 'object' && !Array.isArray(skillet)
      ? (skillet as SkilletPackageJson)
      : {};

  // skillet.skillDir — direct path to skill directory, takes precedence over skills
  if (typeof skilletObj.skillDir === 'string') {
    return {
      skillsDirs: [],
      directSkillDir: path.resolve(packageRoot, skilletObj.skillDir),
    };
  }

  const skills = skilletObj.skills;
  let skillsDirs: string[];

  if (skills === undefined) {
    skillsDirs = ['skills'];
  } else if (typeof skills === 'string') {
    skillsDirs = [skills];
  } else if (Array.isArray(skills) && skills.every((s) => typeof s === 'string')) {
    skillsDirs = skills as string[];
  } else {
    console.warn(
      `[skillet] Invalid value for "skillet.skills" in ${pkgPath}: expected string or string[], got ${JSON.stringify(skills)}. Defaulting to ["skills"].`,
    );
    skillsDirs = ['skills'];
  }

  return { skillsDirs };
}

/**
 * Scans immediate subdirectories of `parentDir`. A subdirectory is considered
 * a skill tree if it contains a `SKILL.md` file.
 *
 * Returns absolute paths of matching skill tree directories.
 * If `parentDir` does not exist, warns and returns `[]`.
 */
export async function discoverSkillTrees(parentDir: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(parentDir, { withFileTypes: true });
  } catch (err: unknown) {
    const isNotFound =
      err !== null && typeof err === 'object' && (err as NodeJS.ErrnoException).code === 'ENOENT';
    if (isNotFound) {
      console.warn(`[skillet] Directory not found: ${parentDir}. Skipping skill tree discovery.`);
      return [];
    }
    throw err;
  }

  const skillDirs: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const subdir = path.join(parentDir, entry.name);
    const skillMdPath = path.join(subdir, 'SKILL.md');
    try {
      const stat = await fs.stat(skillMdPath);
      if (!stat.isFile()) continue;
      skillDirs.push(subdir);
    } catch {
      // No SKILL.md — not a skill tree
    }
  }

  return skillDirs;
}

/**
 * Reads `<packageRoot>/package.json` and returns the `name` field.
 * If `name` is absent, warns and returns `path.basename(packageRoot)`.
 */
export async function readPackageName(packageRoot: string): Promise<string> {
  const pkgPath = path.join(packageRoot, 'package.json');
  const raw = await fs.readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(raw) as Record<string, unknown>;

  if (typeof pkg.name === 'string' && pkg.name.length > 0) {
    return pkg.name;
  }

  const basename = path.basename(packageRoot);
  console.warn(
    `[skillet] No "name" field in ${pkgPath}. Falling back to directory basename: "${basename}".`,
  );
  return basename;
}
