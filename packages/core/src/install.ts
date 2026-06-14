import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { registry } from './adapters/index.js';
import type { Adapter, Context } from './adapters/types.js';
import { detectDrift, isStale } from './drift.js';
import { DEFAULT_IGNORE, hashSkill } from './hash.js';
import type { NormalizedSkill } from './normalize.js';
import type { Scope, SkillManifest } from './types.js';

export { detectDrift, isStale };

export const LIB_VERSION = '0.2.0';

/**
 * Strip the `npm:` prefix and the `@version` suffix from a source string,
 * preserving scoped package names (e.g. `@scope/name`).
 * Examples:
 *   "npm:my-pkg@1.0.0"  → "my-pkg"
 *   "npm:@scope/pkg@2"  → "@scope/pkg"
 */
function extractSourcePkgName(source: string): string {
  return source.replace(/^npm:/, '').replace(/@[^@/][^/]*$/, '');
}

export interface InstallOptions {
  pkg: { name: string; version: string };
  /** The npm package name of the top-level package performing this install. */
  requestorRoot?: string;
  hooks?: {
    beforeInstall?: (
      skill: NormalizedSkill,
      adapter: Adapter,
      ctx: Context,
    ) => Promise<void> | void;
    afterInstall?: (skill: NormalizedSkill, adapter: Adapter, ctx: Context) => Promise<void> | void;
  };
}

export interface InstallRecord {
  adapter: Adapter;
  scope: Scope;
  installPath: string;
  manifest: SkillManifest;
}

/**
 * Compute renderHash = sha256(contentHash|adapterId|libVersion)
 */
export function computeRenderHash(
  contentHash: string,
  adapterId: string,
  libVersion: string,
): string {
  const hash = createHash('sha256');
  hash.update(`${contentHash}|${adapterId}|${libVersion}`);
  return `sha256:${hash.digest('hex')}`;
}

/**
 * Make a Context object from the current environment and scope.
 */
export function makeContext(scope: Scope): Context {
  return {
    scope,
    cwd: process.cwd(),
    home: process.env.HOME ?? process.env.USERPROFILE ?? os.homedir(),
  };
}

/**
 * Recursively copy src tree to dst, creating parent directories.
 */
export async function copyTree(src: string, dst: string): Promise<void> {
  await mkdir(dst, { recursive: true });
  await cp(src, dst, {
    recursive: true,
    filter: (_src) => !DEFAULT_IGNORE.has(path.basename(_src)),
  });
}

/**
 * Write .skill-manifest.json into installPath.
 * Uses a replacer so that undefined values are written as null,
 * ensuring all manifest fields are always present in the JSON output.
 */
export async function writeManifest(installPath: string, manifest: SkillManifest): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const replacer = (_key: string, value: unknown) => (value === undefined ? null : value);
  await writeFile(
    path.join(installPath, '.skill-manifest.json'),
    JSON.stringify(manifest, replacer, 2),
    'utf8',
  );
}

/**
 * Perform a single install: render, copy tree, write manifest.
 * Calls beforeInstall before copy, afterInstall after manifest write.
 *
 * Collision handling:
 * - Identical contentHash: skip copyTree, union requestorRoot into requestedBy, rewrite manifest only.
 * - Different contentHash, same source package: overwrite if pristine; skip with warning if drifted.
 *   Then union requestorRoot into requestedBy.
 */
export async function performInstall(
  skill: NormalizedSkill,
  adapter: Adapter,
  scope: Scope,
  opts: InstallOptions,
): Promise<string> {
  const ctx = makeContext(scope);
  const renderSrc = adapter.render(skill, ctx);
  const installPath = adapter.resolveInstallPath(skill, ctx);

  if (opts.hooks?.beforeInstall) {
    await opts.hooks.beforeInstall(skill, adapter, ctx);
  }

  // Check for an existing manifest at the install path
  let existingManifest: SkillManifest | null = null;
  try {
    const raw = await readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
    existingManifest = JSON.parse(raw) as SkillManifest;
  } catch {
    // no existing manifest — fresh install
  }

  let skipCopy = false;
  let driftedSameSource = false;

  if (existingManifest !== null) {
    if (existingManifest.contentHash === skill.contentHash) {
      // Same content — skip the copy, only update requestedBy
      skipCopy = true;
    } else {
      // Different content — same-source update path (Task 3.4)
      const sourcePkgName = extractSourcePkgName(existingManifest.source);
      const newSource = `npm:${opts.pkg.name}@${opts.pkg.version}`;
      if (sourcePkgName === opts.pkg.name) {
        // Same source package name, but different content (version skew) — Task 3.9
        if (existingManifest.source !== newSource) {
          // Warning should say who ALREADY has this installed, not who is trying to install
          const existingRequestors = Array.isArray(existingManifest.requestedBy)
            ? existingManifest.requestedBy
            : [];
          console.warn(
            `[skillet] Version conflict: skill "${skill.name}" is installed from ${existingManifest.source} (requested by ${existingRequestors.join(', ') || 'unknown'}) but ${opts.requestorRoot ?? opts.pkg.name} is installing ${newSource}`,
          );
        }
        // Same source package, new content — overwrite if pristine, skip if drifted
        const driftStatus = await detectDrift(installPath);
        if (driftStatus === 'pristine') {
          skipCopy = false; // proceed with overwrite
        } else {
          // drifted or unknown — skip silently (performInstall is prompt-free)
          skipCopy = true;
          driftedSameSource = true;
        }
      } else {
        // Different source package — Task 3.10: emit cross-package name collision message
        console.warn(
          `[skillet] Name collision: skill "${skill.name}" is already installed from ${existingManifest.source}; ${opts.pkg.name} also ships a skill with this name (${newSource})`,
        );
        // proceed with normal copyTree (existing collision behavior)
      }
    }
  }

  if (!skipCopy) {
    await copyTree(renderSrc, installPath);
  }

  // For a drifted same-source update, only union requestorRoot into the existing manifest
  // and rewrite it — all other fields (contentHash, postInstallHash, source, etc.) must
  // come from the EXISTING manifest because the files on disk were not changed.
  if (driftedSameSource && existingManifest !== null) {
    const existingRequestedBy: string[] = Array.isArray(existingManifest.requestedBy)
      ? existingManifest.requestedBy
      : [];
    const requestedBy = opts.requestorRoot
      ? Array.from(new Set([...existingRequestedBy, opts.requestorRoot]))
      : existingRequestedBy;
    await writeManifest(installPath, { ...existingManifest, requestedBy });
    if (opts.hooks?.afterInstall) {
      await opts.hooks.afterInstall(skill, adapter, ctx);
    }
    return installPath;
  }

  const postInstallHash = await hashSkill(installPath); // manifest excluded by default
  const renderHash = computeRenderHash(skill.contentHash, adapter.id, LIB_VERSION);

  // Build requestedBy: union of existing + new requestorRoot.
  // Only inherit existing requestedBy when the existing install is from the SAME source package.
  // For a different-source collision, start fresh to avoid inheriting unrelated requestors.
  const isSameSource =
    existingManifest !== null && extractSourcePkgName(existingManifest.source) === opts.pkg.name;
  const existingRequestedBy: string[] =
    isSameSource && existingManifest !== null && Array.isArray(existingManifest.requestedBy)
      ? existingManifest.requestedBy
      : [];
  const requestedBy = opts.requestorRoot
    ? Array.from(new Set([...existingRequestedBy, opts.requestorRoot]))
    : existingRequestedBy;

  const manifest: SkillManifest = {
    name: skill.name,
    description: skill.description,
    source: `npm:${opts.pkg.name}@${opts.pkg.version}`,
    declaredVersion: skill.declaredVersion,
    contentHash: skill.contentHash,
    renderHash,
    adapterId: adapter.id,
    scope,
    libVersion: LIB_VERSION,
    installedAt: new Date().toISOString(),
    postInstallHash,
    requestedBy,
  };

  await writeManifest(installPath, manifest);

  if (opts.hooks?.afterInstall) {
    await opts.hooks.afterInstall(skill, adapter, ctx);
  }

  return installPath;
}

/**
 * Returns true if the manifest was written by a pre-v0.2.0 version of skillet
 * that did not include the `requestedBy` field. The GC (Batch 4) uses this to
 * skip legacy manifests instead of garbage-collecting them.
 */
export function isLegacyManifest(manifest: SkillManifest): boolean {
  return !Array.isArray((manifest as unknown as Record<string, unknown>).requestedBy);
}

/**
 * Scan all registered adapter × scope combinations for existing installs.
 * An install exists when .skill-manifest.json is present at the resolved path.
 */
export async function findExistingInstalls(skill: NormalizedSkill): Promise<InstallRecord[]> {
  const records: InstallRecord[] = [];
  const scopes: Scope[] = ['user', 'project'];

  for (const adapter of registry.list()) {
    for (const scope of scopes) {
      if (!adapter.supportsScope(scope)) continue;
      const ctx = makeContext(scope);
      const installPath = adapter.resolveInstallPath(skill, ctx);
      try {
        const raw = await readFile(path.join(installPath, '.skill-manifest.json'), 'utf8');
        const manifest = JSON.parse(raw) as SkillManifest;
        records.push({ adapter, scope, installPath, manifest });
      } catch {
        // no manifest = not installed
      }
    }
  }

  return records;
}
