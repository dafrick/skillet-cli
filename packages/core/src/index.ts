// Core functions

export { registerAdapter, registry } from './adapters/index.js';
export type { Adapter, Context, DetectResult } from './adapters/types.js';
export { detectDrift, isStale } from './drift.js';
export type { InstalledSkill } from './gc.js';
export { gcUninstall, scanInstalledSkills } from './gc.js';
export { DEFAULT_IGNORE, hashSkill } from './hash.js';
export type { InstallOptions, InstallRecord } from './install.js';
export { computeRenderHash, findExistingInstalls, LIB_VERSION, performInstall } from './install.js';
export { lintSkillFrontmatter } from './lint.js';
export type { SkilletMarker } from './marker.js';
export { discoverSkillTrees, readPackageName, readSkilletMarker } from './marker.js';
export type { NormalizedSkill } from './normalize.js';
export { normalizeSkill } from './normalize.js';
export type { RunOptions } from './run.js';
export { run } from './run.js';
export type { Scope, SkillManifest } from './types.js';
export { applyUpdate, removeInstall } from './update.js';
export type { SkillEntry } from './walk.js';
export { findPackageRoot, resolveSkillPackageClosure } from './walk.js';
