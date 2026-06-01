import type { Dirent } from 'node:fs';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { detectDrift } from './drift.js';
import { isLegacyManifest } from './install.js';
import type { SkillManifest } from './types.js';

export interface InstalledSkill {
  /** Absolute path to the skill's install directory */
  skillDir: string;
  /** Absolute path to .skill-manifest.json */
  manifestPath: string;
  /** Parsed manifest */
  manifest: SkillManifest;
}

/**
 * Scan `targetDir` for immediate subdirectories that contain `.skill-manifest.json`.
 * Returns parsed manifests with file paths.
 * If `targetDir` doesn't exist, returns [].
 */
export async function scanInstalledSkills(targetDir: string): Promise<InstalledSkill[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(targetDir, { withFileTypes: true });
  } catch (err: unknown) {
    const isNotFound =
      err !== null && typeof err === 'object' && (err as NodeJS.ErrnoException).code === 'ENOENT';
    if (isNotFound) {
      return [];
    }
    throw err;
  }

  const results: InstalledSkill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillDir = path.join(targetDir, entry.name);
    const manifestPath = path.join(skillDir, '.skill-manifest.json');

    try {
      const raw = await readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(raw) as SkillManifest;
      results.push({ skillDir, manifestPath, manifest });
    } catch {
      // No manifest or malformed JSON — skip
    }
  }

  return results;
}

export interface GcUninstallOptions {
  force?: boolean;
  isTTY?: boolean;
  /** Called when skill is modified and TTY is true. Returns true to delete, false to keep. */
  onPrompt?: (skillDir: string) => Promise<boolean>;
}

/**
 * Garbage-collect uninstall: remove `packageName` from each skill's `requestedBy`
 * in `targetDir`, then delete skills whose `requestedBy` becomes empty (subject to
 * the modified-content guardrail).
 *
 * Algorithm for each installed skill:
 *   a. If isLegacyManifest → skip
 *   b. If requestedBy doesn't include packageName → skip
 *   c. Remove packageName from requestedBy
 *   d. If requestedBy is now empty:
 *      - Detect drift
 *      - If pristine → delete without prompt
 *      - If modified:
 *        - TTY: call onPrompt → if true, delete; if false, rewrite manifest
 *        - CI + --force: delete without prompt
 *        - CI + no --force: warn and rewrite manifest (keep skill)
 *   e. If requestedBy still non-empty → rewrite manifest
 */
export async function gcUninstall(
  packageName: string,
  targetDir: string,
  opts: GcUninstallOptions,
): Promise<void> {
  const installed = await scanInstalledSkills(targetDir);

  for (const { skillDir, manifestPath, manifest } of installed) {
    // a. Skip legacy manifests
    if (isLegacyManifest(manifest)) {
      continue;
    }

    // b. Skip skills that don't list this package
    if (!manifest.requestedBy.includes(packageName)) {
      continue;
    }

    // c. Remove packageName from requestedBy
    const updatedRequestedBy = manifest.requestedBy.filter((r) => r !== packageName);

    // d. If requestedBy is now empty — decide whether to delete
    if (updatedRequestedBy.length === 0) {
      const driftStatus = await detectDrift(skillDir);
      const isPristine = driftStatus === 'pristine';

      if (isPristine) {
        // Pristine → delete without prompt
        await rm(skillDir, { recursive: true, force: true });
        continue;
      }

      // Modified (or unknown) — apply guardrail
      if (opts.isTTY && opts.onPrompt) {
        const shouldDelete = await opts.onPrompt(skillDir);
        if (shouldDelete) {
          await rm(skillDir, { recursive: true, force: true });
          continue;
        }
        // User chose to keep — rewrite manifest with empty requestedBy
        await rewriteManifest(manifestPath, manifest, updatedRequestedBy);
        continue;
      }

      if (opts.force) {
        // CI + --force → delete without prompt
        await rm(skillDir, { recursive: true, force: true });
        continue;
      }

      // CI + no --force → warn and rewrite manifest (keep skill)
      console.warn(
        `[skillet] Skill "${manifest.name}" in ${skillDir} has local modifications and was not GC'd. ` +
          `Use --force to delete it anyway.`,
      );
      await rewriteManifest(manifestPath, manifest, updatedRequestedBy);
      continue;
    }

    // e. requestedBy still non-empty → rewrite manifest with updated list
    await rewriteManifest(manifestPath, manifest, updatedRequestedBy);
  }
}

async function rewriteManifest(
  manifestPath: string,
  manifest: SkillManifest,
  requestedBy: string[],
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const replacer = (_key: string, value: unknown) => (value === undefined ? null : value);
  const updated: SkillManifest = { ...manifest, requestedBy };
  await writeFile(manifestPath, JSON.stringify(updated, replacer, 2), 'utf8');
}
