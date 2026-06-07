import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { discoverSkillTrees, readSkilletMarker } from './marker.js';

export interface SkillEntry {
  /** Absolute path to a skill tree directory (containing SKILL.md) */
  skillDir: string;
  /** Absolute path to the npm package root that owns this skill */
  packageRoot: string;
  /** npm package name of the owning package */
  packageName: string;
  /** 0 = invoked package, 1 = direct dep, 2 = transitive, etc. */
  depth: number;
}

/**
 * Resolve a package name to its on-disk package root directory.
 *
 * Uses `import.meta.resolve` with `fromDir` as the parent so ESM exports
 * conditions (including `"import"`-only packages like `@skillet-cli/core`) are
 * resolved correctly. CJS `require.resolve` would fail for such packages
 * because it only matches `"require"` or `"default"` export conditions.
 */
export async function findPackageRoot(
  packageName: string,
  fromDir: string,
): Promise<string | null> {
  let resolvedEntry: string;
  try {
    resolvedEntry = fileURLToPath(
      import.meta.resolve(packageName, pathToFileURL(`${fromDir}/`).href),
    );
  } catch {
    return null;
  }

  // Walk parent directories from the resolved entry path upward
  // to find the directory containing package.json.
  let dir = path.dirname(resolvedEntry);
  while (true) {
    const pkgJsonPath = path.join(dir, 'package.json');
    try {
      await fs.access(pkgJsonPath);
      return dir;
    } catch {
      // Not found here — go up
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      // Reached filesystem root without finding package.json
      return null;
    }
    dir = parent;
  }
}

/**
 * Resolve the full set of skill entries for a package and its transitive
 * marked dependencies.
 *
 * Algorithm:
 * 1. Start with the invoked package's own skill dirs (depth 0).
 * 2. Read `invokedPackageRoot/package.json` → get `dependencies` (NOT `devDependencies`).
 * 3. For each dep name, call `findPackageRoot`:
 *    - If null: warn and continue.
 *    - If found: read that package's `package.json`; if no `skillet` marker, skip;
 *      if marked, call `readSkilletMarker` + `discoverSkillTrees` to get its skill
 *      dirs, recurse.
 * 4. Maintain a `visited: Set<string>` of resolved package roots to avoid cycles.
 * 5. Return all `SkillEntry[]` in topological order: dependency skills before the
 *    skills of packages that depend on them.
 * 6. Deduplicate by `skillDir` path before returning.
 */
export async function resolveSkillPackageClosure(
  invokedPackageRoot: string,
  invokedSkillDirs: string[],
): Promise<SkillEntry[]> {
  const result: SkillEntry[] = [];
  const visited = new Set<string>();
  const seenSkillDirs = new Set<string>();

  async function walk(pkgRoot: string, skillDirs: string[], depth: number): Promise<void> {
    if (visited.has(pkgRoot)) return;
    visited.add(pkgRoot);

    // Read once, extract both name and dependencies
    let packageName = path.basename(pkgRoot);
    let dependencies: Record<string, string> = {};
    try {
      const pkgJson = JSON.parse(
        await fs.readFile(path.join(pkgRoot, 'package.json'), 'utf8'),
      ) as Record<string, unknown>;
      packageName =
        typeof pkgJson.name === 'string' && pkgJson.name ? pkgJson.name : path.basename(pkgRoot);
      dependencies = (pkgJson.dependencies as Record<string, string> | undefined) ?? {};
    } catch {
      // If we can't read package.json, proceed with no deps
    }

    // Walk dependencies FIRST (depth-first, dependencies before dependents)
    for (const depName of Object.keys(dependencies)) {
      const depRoot = await findPackageRoot(depName, pkgRoot);
      if (depRoot === null) {
        console.warn(
          `[skillet] Could not resolve dependency "${depName}" from ${pkgRoot}. Skipping.`,
        );
        continue;
      }

      // Skip if already visited
      if (visited.has(depRoot)) continue;

      // Check if the dep has a skillet marker
      const marker = await readSkilletMarker(depRoot);
      if (marker === null) {
        // Not marked — skip (but still visit to avoid re-processing)
        visited.add(depRoot);
        continue;
      }

      // Discover the dep's skill trees
      const depSkillDirs: string[] = [];
      for (const skillsDir of marker.skillsDirs) {
        const absSkillsDir = path.resolve(depRoot, skillsDir);
        const trees = await discoverSkillTrees(absSkillsDir);
        depSkillDirs.push(...trees);
      }

      // Recurse into dep (adds dep's entries BEFORE this package's entries)
      await walk(depRoot, depSkillDirs, depth + 1);
    }

    // Add this package's own skills AFTER its dependencies (topological order)
    for (const skillDir of skillDirs) {
      if (!seenSkillDirs.has(skillDir)) {
        seenSkillDirs.add(skillDir);
        result.push({
          skillDir,
          packageRoot: pkgRoot,
          packageName,
          depth,
        });
      }
    }
  }

  await walk(invokedPackageRoot, invokedSkillDirs, 0);

  return result;
}
